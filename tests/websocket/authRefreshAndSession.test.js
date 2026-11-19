import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import baseApi, {
  TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_EXPIRES_AT_KEY,
  SESSION_TTL_MS,
  saveToken,
  getToken,
  saveRefreshToken,
  getRefreshToken,
  removeTokens,
} from '../../src/services/baseApi.js';
import { StompClientService } from '../../src/services/stompClientService.js';

function makeJwt(expOffsetSeconds) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: 'mod@rehome.vn', exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }));
  return `${header}.${payload}.sig`;
}

describe('Task 1: 7-day session persistence & refresh-token exchange', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists refresh token with a 7-day TTL and clears it once expired', () => {
    expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    const now = Date.now();
    saveRefreshToken('rt-valid-1');
    expect(getRefreshToken()).toBe('rt-valid-1');

    const storedExpiry = Number(localStorage.getItem(REFRESH_EXPIRES_AT_KEY));
    expect(storedExpiry).toBeGreaterThanOrEqual(now + SESSION_TTL_MS - 5000);
    expect(storedExpiry).toBeLessThanOrEqual(now + SESSION_TTL_MS + 5000);

    // Simulate expiry > 7 days ago
    localStorage.setItem(REFRESH_EXPIRES_AT_KEY, String(Date.now() - 1000));
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('proactively exchanges refresh_token once for concurrent requests when rehome_token is expired (including noReplay POST)', async () => {
    const expiredJwt = makeJwt(-120);
    const freshJwt = makeJwt(900);

    saveToken(expiredJwt);
    saveRefreshToken('rt-old');

    const refreshPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { result: { accessToken: freshJwt, refreshToken: 'rt-new' } },
    });

    const adapterSpy = vi.fn(async (config) => ({
      data: { ok: true, auth: config.headers.Authorization },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    const [resGet, resPost] = await Promise.all([
      baseApi.get('/api/test/me', { adapter: adapterSpy }),
      baseApi.post('/api/test/action', { a: 1 }, { adapter: adapterSpy, noReplay: true }),
    ]);

    expect(refreshPostSpy).toHaveBeenCalledTimes(1);
    expect(resGet.data.auth).toBe(`Bearer ${freshJwt}`);
    expect(resPost.data.auth).toBe(`Bearer ${freshJwt}`);
    expect(getToken()).toBe(freshJwt);
    expect(getRefreshToken()).toBe('rt-new');

    removeTokens();
    expect(localStorage.getItem(REFRESH_EXPIRES_AT_KEY)).toBeNull();
  });

  it('proactively exchanges refresh_token when rehome_token is missing but refresh_token is still valid', async () => {
    const freshJwt = makeJwt(900);
    saveRefreshToken('rt-only');

    const refreshPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { result: { accessToken: freshJwt, refreshToken: 'rt-rotated' } },
    });

    const adapterSpy = vi.fn(async (config) => ({
      data: { ok: true, auth: config.headers.Authorization },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));

    const res = await baseApi.get('/api/account/me', { adapter: adapterSpy });
    expect(refreshPostSpy).toHaveBeenCalledTimes(1);
    expect(res.data.auth).toBe(`Bearer ${freshJwt}`);
    expect(getToken()).toBe(freshJwt);
    expect(getRefreshToken()).toBe('rt-rotated');
  });

  it('reconnects StompClientService on auth:token_refreshed even from ERROR status', () => {
    const service = new StompClientService({
      getSockJsUrl: () => 'http://localhost:8080/ws-sockjs',
      getAccessToken: () => 'old-token',
    });
    service.status = 'ERROR';
    const reconnectSpy = vi.spyOn(service, 'reconnectWithToken').mockImplementation(() => {});

    window.dispatchEvent(new CustomEvent('auth:token_refreshed', { detail: { token: 'new-token' } }));

    expect(reconnectSpy).toHaveBeenCalledWith('new-token');
    service.destroy();
  });
});
