/**
 * ReHome - Base API Service (Axios Instance with JWT Interceptors)
 */
import axios from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../configs/api.config.js";

export const TOKEN_KEY = "rehome_token";
export const REFRESH_TOKEN_KEY = "rehome_refresh_token";
export const USER_KEY = "rehome_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveRefreshToken(refreshToken) {
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function removeTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

// Request Interceptor: đính kèm Bearer token
baseApi.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (isCredentialExchange(config.url)) {
      delete config.headers.Authorization;
    } else if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: xử lý tự động Refresh Token khi 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

baseApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isAuthRoute = isCredentialExchange(originalRequest.url);

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return baseApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        removeTokens();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      isRefreshing = true;
      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });
        const newAccessToken =
          res.data?.accessToken || res.data?.token || res.data?.data?.accessToken;
        const newRefreshToken =
          res.data?.refreshToken || res.data?.data?.refreshToken;

        if (newAccessToken) {
          saveToken(newAccessToken);
          if (newRefreshToken) {
            saveRefreshToken(newRefreshToken);
          }
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return baseApi(originalRequest);
        } else {
          throw new Error("Không nhận được access token mới từ máy chủ");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        removeTokens();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default baseApi;
