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

test('both login methods preserve token aliases, JWT fallback and distinct success messages', async () => {
  const claims = { sub: 'claims@example.test', roles: ['ROLE_ORGANIZATION'] };
  const token = 'header.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.signature';
  for (const method of ['login', 'loginWithGoogle']) {
    const h = fixture(config => {
      if (config.url === '/api/auth/login' || config.url === '/api/auth/google') return ok(config, { token });
      return fail(config, 500);
    });
    const input = method === 'login' ? { email: ' user@example.test ', password: ' secret ' } : 'google-id-token';
    const result = await h.service[method](input);
    assert.equal(result.accessToken, token);
    assert.equal(result.token, token);
    assert.equal(result.refreshToken, undefined);
    assert.equal(result.user.email, claims.sub);
    assert.equal(result.user.name, 'claims');
    assert.equal(result.user.role, 'organization');
    assert.equal(result.user.emailVerified, true);
    assert.equal(result.message, method === 'login' ? 'Đăng nhập thành công' : 'Đăng nhập Google thành công');
    assert.deepEqual(JSON.parse(h.requests[0].data), method === 'login'
      ? { email: 'user@example.test', password: ' secret ' } : { idToken: input });
    assert.deepEqual(h.requests.slice(1).map(config => config.url), ['/api/account/me']);
  }
});

test('moderator and admin login does not trigger /members/me endpoint', async () => {
  for (const authority of ['ROLE_MODERATOR', 'ROLE_ADMIN', '[ROLE_MODERATOR]', '[ROLE_ADMIN]', ['ROLE_MODERATOR'], 'ROLE_UNKNOWN', '']) {
    const h = fixture(config => {
      if (config.url === '/api/auth/login') return ok(config, { accessToken: 'opaque', refreshToken: 'refresh' });
      if (config.url === '/api/account/me') return ok(config, { email: 'user@example.test', authorities: authority });
      if (config.url === '/members/me') throw new Error('ERR_MEMBER_ME_CALLED: /members/me should not be called');
      return ok(config, {});
    });
    const { user } = await h.service.login({ email: 'user@example.test', password: 'secret' });
    assert.ok(!h.requests.some(r => r.url.includes('/members/me')), `Should not call /members/me for ${authority}`);
  }
});

test('Google login rolls back exchanged tokens when account authorization fails', async () => {
  const h = fixture(config => config.url === '/api/auth/google'
    ? ok(config, { accessToken: 'opaque-access', refreshToken: 'opaque-refresh' })
    : fail(config, 403, 'Forbidden account'));
  await assert.rejects(h.service.loginWithGoogle('google-token'), /Forbidden account/);
  assert.equal(h.client.getToken(), null);
  assert.equal(h.client.getRefreshToken(), null);
  assert.equal(h.client.getUser(), null);
  assert.equal(h.requests.length, 2);
});

test('missing access tokens reject without deleting an existing session', async () => {
  for (const method of ['login', 'loginWithGoogle']) {
    const h = fixture(config => ok(config, { refreshToken: 'unused' }));
    h.client.saveToken('existing-access');
    h.client.saveRefreshToken('existing-refresh');
    await assert.rejects(h.service[method](method === 'login'
      ? { email: 'a@b.test', password: 'secret' } : 'google-token'), /Máy chủ không trả về access token xác thực/);
    assert.equal(h.client.getToken(), 'existing-access');
    assert.equal(h.client.getRefreshToken(), 'existing-refresh');
    assert.equal(h.requests.length, 1);
  }
});

test('member response envelopes preserve profile precedence and explicit false verification', async () => {
  for (const envelope of [data => data, data => ({ result: data }), data => ({ data })]) {
    const h = fixture(config => {
      if (config.url === '/api/auth/login') return ok(config, { accessToken: 'opaque', refreshToken: 'refresh' });
      if (config.url === '/api/account/me') return ok(config, { email: 'account@example.test', authorities: ['ROLE_MEMBER'] });
      return ok(config, envelope({ accountId: 12, email: 'member@example.test', fullName: 'Member', phone: '123', avatarUrl: 'avatar', memberCode: 'M12', emailVerified: false }));
    });
    const { user } = await h.service.login({ email: 'input@example.test', password: 'secret' });
    assert.deepEqual(JSON.parse(JSON.stringify(user)), {
      id: 12, accountId: 12, email: 'member@example.test', name: 'Member', fullName: 'Member',
      phone: '123', avatar: 'avatar', avatarUrl: 'avatar', memberCode: 'M12', emailVerified: false,
      role: 'member', rawRole: ['ROLE_MEMBER'], authorities: ['ROLE_MEMBER'],
      warehouseId: null, warehouseName: '',
    });
    assert.equal(h.client.getRefreshToken(), 'refresh');
    assert.equal(h.client.getUser().memberCode, 'M12');
  }
});

test('invalid member data and malformed JWT preserve account identity and default fields', async () => {
  for (const member of [null, '', 'not-an-object', false]) {
    const h = fixture(config => {
      if (config.url === '/api/auth/google') return ok(config, { accessToken: 'malformed' });
      if (config.url === '/api/account/me') return ok(config, { email: 'staff@example.test', authorities: 'ROLE_STAFF' });
      return ok(config, member);
    });
    const { user } = await h.service.loginWithGoogle('google-token');
    assert.equal(user.id, 'staff@example.test');
    assert.equal(user.accountId, null);
    assert.equal(user.name, 'staff');
    assert.equal(user.fullName, '');
    assert.equal(user.avatar, '');
    assert.equal(user.emailVerified, true);
    assert.equal(user.role, 'staff');
  }
  const h = fixture(config => config.url === '/api/auth/google' ? ok(config, { accessToken: 'malformed' }) : ok(config, null));
  const { user } = await h.service.loginWithGoogle('google-token');
  assert.equal(user.name, 'Người dùng');
  assert.equal(user.role, 'member');
});

test('profile updates preserve trim, omission and server/payload/cache fallback order', async () => {
  for (const envelope of [data => data, data => ({ result: data }), data => ({ data })]) {
    const h = fixture(config => ok(config, envelope({ fullName: 'Server name', phone: '', avatarUrl: null })));
    h.client.saveUser({ name: 'Old name', fullName: 'Old full name', phone: 'old-phone', avatar: 'old-avatar', avatarUrl: 'old-url', role: 'staff' });
    const user = await h.service.updateProfile({ fullName: '', name: ' New name ', phone: '  ', avatar: ' new-avatar ' });
    assert.equal(h.requests[0].method, 'patch');
    assert.equal(h.requests[0].url, '/members/me');
    assert.deepEqual(JSON.parse(h.requests[0].data), { fullName: 'New name', avatarUrl: 'new-avatar' });
    assert.equal(user.name, 'Server name');
    assert.equal(user.fullName, 'Server name');
    assert.equal(user.phone, 'old-phone');
    assert.equal(user.avatar, 'new-avatar');
    assert.equal(user.avatarUrl, 'new-avatar');
    assert.equal(user.role, 'staff');
    assert.equal(h.client.getUser().name, 'Server name');
  }
});

test('empty profile responses retain independent cached aliases and errors leave cache intact', async () => {
  const cached = { name: 'Alias', fullName: 'Full name', avatar: 'avatar', avatarUrl: 'url', role: 'admin' };
  const h = fixture(config => ok(config, null));
  h.client.saveUser(cached);
  const user = await h.service.updateProfile({ fullName: ' ', name: 'ignored', avatarUrl: ' ', avatar: 'ignored' });
  assert.deepEqual(JSON.parse(h.requests[0].data), {});
  assert.equal(user.name, 'Alias');
  assert.equal(user.fullName, 'Full name');
  assert.equal(user.avatar, 'avatar');
  assert.equal(user.avatarUrl, 'url');
  const rejected = fixture(config => fail(config, 500, 'Profile rejected'));
  rejected.client.saveUser(cached);
  await assert.rejects(rejected.service.updateProfile({ phone: '123' }), /Profile rejected/);
  assert.equal(rejected.client.getUser().name, 'Alias');
});

test('password validation preserves boundaries, error order and untrimmed password payloads', async () => {
  const h = fixture(config => ok(config));
  await assert.rejects(h.service.changePassword({}), /Vui lòng nhập mật khẩu hiện tại/);
  await assert.rejects(h.service.changePassword({ oldPassword: 'old', newPassword: 'short' }), /ít nhất 6/);
  await assert.rejects(h.service.changePassword({ oldPassword: 'old', newPassword: 'secret', newPasswordRepeat: 'other' }), /không khớp/);
  await assert.rejects(h.service.resetPassword({}), /Thiếu thông tin/);
  for (const password of ['', '      ', 'short', 'x'.repeat(73)]) {
    await assert.rejects(h.service.resetPassword({ email: 'a@b.test', resetToken: 'token', newPassword: password, confirmPassword: password }), /6 đến 72/);
  }
  await assert.rejects(h.service.resetPassword({ email: 'a@b.test', resetToken: 'token', newPassword: 'secret', confirmPassword: 'other' }), /không trùng khớp/);
  assert.equal(h.requests.length, 0);
  for (const password of ['123456', ' secret ', 'x'.repeat(72)]) {
    const result = await h.service.resetPassword({ email: ' a@b.test ', resetToken: ' token ', newPassword: password, confirmPassword: password });
    assert.equal(h.requests.at(-1).url, '/api/auth/password/reset');
    assert.deepEqual(JSON.parse(h.requests.at(-1).data), { email: 'a@b.test', resetToken: 'token', newPassword: password, confirmPassword: password });
    assert.equal(result.message, 'Đặt lại mật khẩu thành công!');
  }
  const result = await h.service.changePassword({ oldPassword: ' old ', newPassword: ' secret ' });
  assert.equal(h.requests.at(-1).url, '/api/auth/password/change');
  assert.deepEqual(JSON.parse(h.requests.at(-1).data), { oldPassword: ' old ', newPassword: ' secret ', newPasswordRepeat: ' secret ' });
  assert.equal(result.message, 'Đổi mật khẩu thành công.');
});

test('OTP requests preserve validation, defaults, payloads, response and formatted errors', async () => {
  const h = fixture(config => ok(config, { resetToken: 'reset-token', message: 'accepted' }));
  await assert.rejects(h.service.verifyOtp({ email: 'a@b.test' }), /đầy đủ email và mã OTP/);
  await assert.rejects(h.service.resendOtp({}), /cung cấp email/);
  assert.equal(h.requests.length, 0);
  assert.equal((await h.service.verifyOtp({ email: ' a@b.test ', otp: ' 123456 ' })).resetToken, 'reset-token');
  assert.equal(h.requests[0].url, '/api/auth/verify-otp');
  assert.deepEqual(JSON.parse(h.requests[0].data), { email: 'a@b.test', otp: '123456', purpose: 'FORGOT_PASSWORD' });
  await h.service.resendOtp({ email: ' a@b.test ', purpose: 'CUSTOM' });
  assert.equal(h.requests[1].url, '/api/auth/resend-otp');
  assert.deepEqual(JSON.parse(h.requests[1].data), { email: 'a@b.test', purpose: 'CUSTOM' });
  const rejected = fixture(config => fail(config, 400, 'OTP rejected'));
  await assert.rejects(rejected.service.verifyOtp({ email: 'a@b.test', otp: '123456' }), /OTP rejected/);
  await assert.rejects(rejected.service.resendOtp({ email: 'a@b.test' }), /OTP rejected/);
});

test('shared request error contexts retain the original localized transport feedback', async () => {
  const h = fixture(() => { throw new axios.AxiosError('Network Error', 'ERR_NETWORK'); });
  for (const [method, input, context] of [
    ['login', { email: 'a@b.test', password: 'secret' }, 'đăng nhập'],
    ['loginWithGoogle', 'google-token', 'đăng nhập bằng Google'],
    ['verifyOtp', { email: 'a@b.test', otp: '123456' }, 'xác thực mã OTP'],
    ['resendOtp', { email: 'a@b.test' }, 'gửi lại mã OTP'],
    ['changePassword', { oldPassword: 'old', newPassword: 'secret' }, 'đổi mật khẩu'],
    ['resetPassword', { email: 'a@b.test', resetToken: 'token', newPassword: 'secret', confirmPassword: 'secret' }, 'đặt lại mật khẩu'],
  ]) {
    await assert.rejects(h.service[method](input), error => {
      assert.equal(error.message, `Không thể kết nối đến máy chủ khi ${context}. Vui lòng kiểm tra lại kết nối mạng của bạn.`);
      return true;
    });
  }
});
