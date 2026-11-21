/**
 * ReHome - Lightweight Token & Session Storage Helpers
 * Zero external dependencies so entry bundle stays minimal before API calls.
 */
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
