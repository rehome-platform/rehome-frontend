import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import baseApi, { getRefreshToken, getToken, saveRefreshToken, saveToken } from '../../src/services/baseApi.js';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';

const server = setupServer();
const refreshUrl = `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  localStorage.clear();
  server.resetHandlers();
});
afterEach(() => localStorage.clear());
afterAll(() => server.close());

describe('JWT interceptors with backend response envelopes', () => {
  it('refreshes a protected GET with result tokens, rotates refresh and preserves the Axios response', async () => {
    saveToken('expired-access');
    saveRefreshToken('previous-refresh');
    let reads = 0;
    let refreshes = 0;
    server.use(
      http.get(`${API_BASE_URL}/jwt-test`, ({ request }) => {
        reads++;
        expect(request.headers.get('Authorization')).toBe(
          reads === 1 ? 'Bearer expired-access' : 'Bearer renewed-access',
        );
        return reads === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ result: { ready: true }, isSuccess: true });
      }),
      http.post(refreshUrl, async ({ request }) => {
        refreshes++;
        expect(request.headers.get('Authorization')).toBeNull();
        expect(await request.json()).toEqual({ refreshToken: 'previous-refresh' });
        return HttpResponse.json({
          result: { accessToken: 'renewed-access', refreshToken: 'rotated-refresh' },
          isSuccess: true,
        });
      }),
    );

    const response = await baseApi.get('/jwt-test');

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ result: { ready: true }, isSuccess: true });
    expect(getToken()).toBe('renewed-access');
    expect(getRefreshToken()).toBe('rotated-refresh');
    expect(reads).toBe(2);
    expect(refreshes).toBe(1);
  });

  it('keeps the current refresh token when the result does not rotate it', async () => {
    saveToken('expired-access');
    saveRefreshToken('retained-refresh');
    server.use(
      http.get(`${API_BASE_URL}/jwt-test`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer renewed-access'
          ? HttpResponse.json({ result: [] })
          : new HttpResponse(null, { status: 401 }),
      ),
      http.post(refreshUrl, () => HttpResponse.json({ result: { accessToken: 'renewed-access' } })),
    );

    await baseApi.get('/jwt-test');

    expect(getToken()).toBe('renewed-access');
    expect(getRefreshToken()).toBe('retained-refresh');
  });

  it('rejects a noReplay mutation once without refreshing and expires the session', async () => {
    saveToken('expired-access');
    saveRefreshToken('previous-refresh');
    const expired = vi.fn();
    const refresh = vi.fn(() => HttpResponse.json({ result: { accessToken: 'unexpected' } }));
    let writes = 0;
    window.addEventListener('auth:expired', expired);
    server.use(
      http.post(`${API_BASE_URL}/jwt-mutation-test`, ({ request }) => {
        writes++;
        expect(request.headers.get('Authorization')).toBe('Bearer expired-access');
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(refreshUrl, refresh),
    );
    try {
      await expect(baseApi.post('/jwt-mutation-test', {}, { noReplay: true }))
        .rejects.toMatchObject({ response: { status: 401 } });
      expect(writes).toBe(1);
      expect(refresh).not.toHaveBeenCalled();
      expect(expired).toHaveBeenCalledOnce();
      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    } finally {
      window.removeEventListener('auth:expired', expired);
    }
  });

  it.each([API_ENDPOINTS.AUTH.LOGIN, API_ENDPOINTS.AUTH.GOOGLE, API_ENDPOINTS.AUTH.REFRESH])(
    'excludes an old bearer token from credential exchange %s', async path => {
      saveToken('previous-account-access');
      let calls = 0;
      server.use(http.post(`${API_BASE_URL}${path}`, ({ request }) => {
        calls++;
        expect(request.headers.get('Authorization')).toBeNull();
        return new HttpResponse(null, { status: 401 });
      }));

      await expect(baseApi.post(path, {}, { headers: { Authorization: 'Bearer explicit-old-access' } }))
        .rejects.toMatchObject({ response: { status: 401 } });

      expect(calls).toBe(1);
    },
  );
});
