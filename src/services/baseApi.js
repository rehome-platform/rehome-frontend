/**
 * ReHome - Base API Service (Axios Instance with JWT Interceptors)
 */
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../configs/api.config.js";

export const TOKEN_KEY = "rehome_token";
export const REFRESH_TOKEN_KEY = "rehome_refresh_token";
export const REFRESH_EXPIRES_AT_KEY = "rehome_refresh_expires_at";
export const USER_KEY = "rehome_user";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const expiresAtRaw = localStorage.getItem(REFRESH_EXPIRES_AT_KEY);
  if (expiresAtRaw) {
    const expiresAt = Number(expiresAtRaw);
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      removeTokens();
      return null;
    }
  }
  return refreshToken;
}

export function saveRefreshToken(refreshToken) {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(Date.now() + SESSION_TTL_MS));
}

export function removeTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  // Expired or will expire within 10 seconds
  return payload.exp * 1000 <= Date.now() + 10000;
}

// Axios client instance
const baseApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Credential exchanges must not inherit another account's bearer token or retry it.
function isCredentialExchange(url) {
  const path = String(url || '').split(/[?#]/)[0].replace(/\/$/, '');
  return [API_ENDPOINTS.AUTH.LOGIN, API_ENDPOINTS.AUTH.GOOGLE, API_ENDPOINTS.AUTH.REFRESH]
    .some(endpoint => path.endsWith(endpoint));
}

// Single-flight refresh token exchange shared across request interceptor, 401 handler, and AuthContext
let refreshPromise = null;

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    removeTokens();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    throw new Error("Phiên đăng nhập đã hết hạn");
  }

  refreshPromise = (async () => {
    try {
      const res = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
        refreshToken,
      });
      // Spring ApiResponse wraps AuthResponse in result. Keep legacy envelopes
      // compatible without changing the Axios response returned to callers.
      const tokens = res.data?.result ?? res.data?.data ?? res.data;
      const newAccessToken = tokens?.accessToken || tokens?.token;
      const newRefreshToken = tokens?.refreshToken;

      if (!newAccessToken) {
        throw new Error("Không nhận được access token mới từ máy chủ");
      }

      saveToken(newAccessToken);
      if (newRefreshToken) {
        saveRefreshToken(newRefreshToken);
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:token_refreshed", {
            detail: { token: newAccessToken },
          })
        );
      }
      return newAccessToken;
    } catch (refreshErr) {
      const status = refreshErr?.response?.status;
      // Clear local session on explicit auth failure or missing token payload
      if (!status || status === 400 || status === 401 || status === 403) {
        removeTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"));
        }
      }
      throw refreshErr;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function hasExpiredJwtClaim(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 <= Date.now() + 10000;
}

// Request Interceptor: đính kèm Bearer token (tự động đổi refresh_token nếu rehome_token hết hạn hoặc thiếu)
baseApi.interceptors.request.use(
  async (config) => {
    if (isCredentialExchange(config.url)) {
      delete config.headers.Authorization;
      return config;
    }

    let token = getToken();
    if ((!token || hasExpiredJwtClaim(token)) && getRefreshToken()) {
      try {
        token = await refreshAccessToken();
      } catch {
        token = getToken();
      }
    }

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: xử lý tự động Refresh Token khi 401
baseApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthRoute = isCredentialExchange(originalRequest.url);

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      if (!getRefreshToken()) {
        removeTokens();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"));
        }
        return Promise.reject(error);
      }
      try {
        const newAccessToken = await refreshAccessToken();
        if (originalRequest.noReplay) {
          return Promise.reject(error);
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return baseApi(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default baseApi;
