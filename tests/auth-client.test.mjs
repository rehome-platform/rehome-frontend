import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import axios from 'axios';
import { transformSync } from 'esbuild';

// Actual Axios interceptors and auth service; adapters never access the network.
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ok = (config, data = {}) => ({ status: 200, statusText: 'OK', headers: {}, config, data });
function fail(config, status, message = 'Fixture rejection') {
  throw new axios.AxiosError(message, 'ERR_BAD_REQUEST', config, {}, { status, headers: {}, config, data: { message } });
}
function fixture(handler) {
  const values = new Map();
  const requests = [];
  const adapter = async config => { requests.push(config); return handler(config, requests); };
  const scopedAxios = axios.create({ adapter });
  const modules = new Map();
  const window = { location: { pathname: '/login', href: '' }, dispatchEvent() {} };
  const globals = { window, localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) }, atob, CustomEvent, console: { warn() {} } };
  function load(file) {
    const path = resolve(project, file);
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    const code = transformSync(readFileSync(path, 'utf8'), { loader: 'js', format: 'cjs', define: { 'import.meta.env': '{}' } }).code;
    vm.runInNewContext(code, { ...globals, module, exports: module.exports, require(name) {
      if (name === 'axios') return scopedAxios;
      return load(resolve(dirname(path), name));
    } }, { filename: file });
    return module.exports;
  }
  const client = load('src/services/baseApi.js');
  const service = load('src/features/auth/services/auth.service.js').authService;
  return { client, api: client.default, service, formatError: load('src/utils/api.js').formatApiError, requests, values, window };
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('login 401 rejects once without attempting token refresh or creating a session', async () => {
  const h = fixture(config => fail(config, 401, 'Invalid credentials'));
  await assert.rejects(h.service.login({ email: 'invalid@example.test', password: 'synthetic-only' }));
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].url, '/api/auth/login');
  assert.equal(h.client.getToken(), null);
});

test('missing refresh token does not leave later 401 requests waiting forever', async () => {
  const h = fixture(config => fail(config, 401));
  await assert.rejects(h.api.get('/protected-first'));
  const result = await Promise.race([h.api.get('/protected-second').then(() => 'success', () => 'rejected'), pause(100).then(() => 'hung')]);
  assert.equal(result, 'rejected');
});

test('concurrent protected requests share one refresh and each retries once', async () => {
  let refreshes = 0;
  const h = fixture(async config => {
    if (config.url.endsWith('/api/auth/refresh')) { refreshes++; await pause(10); return ok(config, { accessToken: 'opaque-refreshed', refreshToken: 'opaque-refresh-next' }); }
    if (config.headers.Authorization !== 'Bearer opaque-refreshed') return fail(config, 401);
    return ok(config, { ready: true });
  });
  h.client.saveToken('opaque-old');
  h.client.saveRefreshToken('opaque-refresh-old');
  const responses = await Promise.all([h.api.get('/protected-one'), h.api.get('/protected-two')]);
  assert.equal(refreshes, 1);
  assert.ok(responses.every(response => response.data.ready));
});

test('queued requests do not start another refresh after a retried 401', async () => {
  let refreshes = 0;
  const h = fixture(async config => {
    if (config.url.endsWith('/api/auth/refresh')) { refreshes++; await pause(10); return ok(config, { accessToken: 'opaque-refreshed' }); }
    return fail(config, 401);
  });
  h.client.saveRefreshToken('opaque-refresh');
  await Promise.allSettled([h.api.get('/protected-one'), h.api.get('/protected-two')]);
  assert.equal(refreshes, 1);
});

test('refresh does not leave a default bearer header that contaminates the next account', async () => {
  const h = fixture(config => {
    if (config.url.endsWith('/api/auth/refresh')) return ok(config, { accessToken: 'opaque-refreshed' });
    if (!config._retry && config.url === '/protected') return fail(config, 401);
    return ok(config);
  });
  h.client.saveToken('opaque-first');
  h.client.saveRefreshToken('opaque-refresh');
  await h.api.get('/protected');
  h.client.removeTokens();
  h.client.saveToken('opaque-next-account');
  await h.api.get('/api/account/me');
  assert.equal(h.requests.at(-1).headers.Authorization, 'Bearer opaque-next-account');
});

test('credential exchange does not send a previous session bearer token', async () => {
  const h = fixture(config => ok(config));
  h.client.saveToken('opaque-previous-session');
  await h.api.post('/api/auth/login', { email: 'fixture@example.test', password: 'synthetic-only' });
  assert.equal(h.requests[0].headers.Authorization, undefined);
});

test('verified admin/moderator identity and optional member-profile denial preserve login', async () => {
  for (const [authority, expected] of [['[ROLE_ADMIN]', 'admin'], ['[ROLE_MODERATOR]', 'staff']]) {
    const h = fixture(config => {
      if (config.url === '/api/auth/login') return ok(config, { accessToken: 'opaque-access', refreshToken: 'opaque-refresh', tokenType: 'Bearer' });
      if (config.url === '/api/account/me') return ok(config, { email: 'fixture@example.test', authorities: authority });
      return fail(config, 403);
    });
    const result = await h.service.login({ email: ' fixture@example.test ', password: 'synthetic-only' });
    assert.equal(result.user.role, expected);
    assert.deepEqual(Object.keys(JSON.parse(h.requests[0].data)).sort(), ['email', 'password']);
    assert.equal(JSON.parse(h.requests[0].data).email, 'fixture@example.test');
    assert.equal(h.client.getToken(), 'opaque-access');
  }
});

test('failed identity validation after credential exchange does not create a frontend session', async () => {
  const h = fixture(config => {
    if (config.url === '/api/auth/login') return ok(config, { accessToken: 'opaque-rejected-access', refreshToken: 'opaque-rejected-refresh' });
    if (config.url === '/api/account/me') return fail(config, 401);
    return fail(config, 403);
  });
  await assert.rejects(h.service.login({ email: 'fixture@example.test', password: 'synthetic-only' }));
  assert.equal(h.client.getToken(), null);
  assert.equal(h.client.getUser(), null);
});

test('rejected restored identity does not resurrect cached user data', async () => {
  const h = fixture(config => fail(config, config.url === '/api/account/me' ? 401 : 403));
  h.client.saveToken('opaque-old-access');
  h.client.saveRefreshToken('opaque-old-refresh');
  h.client.saveUser({ role: 'admin', email: 'fixture@example.test' });
  assert.equal(await h.service.getCurrentUser(), null);
  assert.equal(h.client.getUser(), null);
});

test('credential exchanges reject 401 without refreshing or attaching an old bearer', async () => {
  for (const path of ['/api/auth/google', '/api/auth/refresh']) {
    const h = fixture(config => fail(config, 401));
    h.client.saveToken('opaque-old');
    h.client.saveRefreshToken('opaque-old-refresh');
    await assert.rejects(h.api.post(path, {}));
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].headers.Authorization, undefined);
  }
});

test('transport failures and message-free HTTP errors receive distinct feedback', () => {
  const h = fixture(config => ok(config));
  for (const status of [400, 401, 403, 429, 500]) {
    const error = new axios.AxiosError('Request failed with status code ' + status, 'ERR_BAD_REQUEST', {}, {}, { status, data: {} });
    assert.ok(h.formatError(error, 'đăng nhập').includes('HTTP ' + status));
    assert.notEqual(h.formatError(error, 'đăng nhập'), error.message);
  }
  const loginError = new axios.AxiosError('Request failed with status code 401', 'ERR_BAD_REQUEST', {}, {}, { status: 401, data: {} });
  assert.ok(h.formatError(loginError, 'đăng nhập').includes('Email hoặc mật khẩu'));
  assert.ok(h.formatError(new axios.AxiosError('Network Error', 'ERR_NETWORK')).includes('Không thể kết nối'));
  assert.ok(h.formatError(new axios.AxiosError('Timeout', 'ECONNABORTED')).includes('HTTP 408'));
});
