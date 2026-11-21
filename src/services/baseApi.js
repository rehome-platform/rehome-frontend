/**
 * ReHome - Base API Service (Axios Instance with JWT Interceptors)
 */
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../configs/api.config.js";
import {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_EXPIRES_AT_KEY,
  USER_KEY,
  SESSION_TTL_MS,
  getToken,
  saveToken,
  getRefreshToken,
  saveRefreshToken,
  removeTokens,
  getUser,
  saveUser,
  parseJwt,
  isTokenExpired,
} from "./tokenStorage.js";

export {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_EXPIRES_AT_KEY,
  USER_KEY,
  SESSION_TTL_MS,
  getToken,
  saveToken,
  getRefreshToken,
  saveRefreshToken,
  removeTokens,
  getUser,
  saveUser,
  parseJwt,
  isTokenExpired,
};

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
