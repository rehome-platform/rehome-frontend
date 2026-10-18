// Actual AuthProvider + PrivateRoute + Profile, with a deferred service mock.
// No real passwords, tokens, accounts, or backend requests are used.
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserName = process.argv[2] || 'chrome';
const browser = browserName === 'edge' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output = mkdtempSync(join(tmpdir(), 'rehome-task-e-'));
const css = readFileSync(join(project, 'dist/assets', readdirSync(join(project, 'dist/assets')).find(name => name.endsWith('.css'))), 'utf8');
const bundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
    import { AuthProvider, useAuth } from './src/context/AuthContext.jsx';
    import PrivateRoute from './src/routes/PrivateRoute.jsx';
    import Profile from './src/features/auth/pages/ProfilePage.jsx';
    window.fixtureUser = { role: 'admin', fullName: 'Task E User', name: 'Task E User', email: 'user@example.test', phone: '0912345678' };
    window.fixtureSession = true;
    window.passwordRequests = 0;
    window.profileUpdates = 0;
    const root = createRoot(document.getElementById('root'));
    let version = 0;
    function Probe() {
      const { loading, isAuthenticated } = useAuth();
      const { pathname } = useLocation();
      return <output id="session-probe" data-loading={String(loading)} data-authenticated={String(isAuthenticated)} data-path={pathname} />;
    }
    window.mountProfile = (role = 'admin') => {
      window.fixtureSession = true;
      window.fixtureUser = { ...window.fixtureUser, role };
      root.render(<MemoryRouter key={version++} initialEntries={['/profile']}><AuthProvider><Probe /><Routes>
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/login" element={<p id="login-placeholder">Login</p>} />
      </Routes></AuthProvider></MemoryRouter>);
    };
    window.mountProfile();
  `, resolveDir: project, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.png': 'dataurl', '.svg': 'dataurl', '.css': 'empty' },
  plugins: [{ name: 'mock-service-and-storage', setup(plugin) {
    plugin.onResolve({ filter: /NotificationContext\.jsx$|auth\.service\.js$|baseApi\.js$/ }, args => ({ path: args.path, namespace: 'fixture-mocks' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture-mocks' }, args => ({ contents: args.path.includes('NotificationContext')
      ? `export const useNotification = () => ({ unreadCount: 0 });`
      : args.path.includes('baseApi')
      ? `export const getUser = () => window.fixtureSession ? window.fixtureUser : null; export const getToken = () => window.fixtureSession ? 'synthetic-session' : null; export const saveUser = () => {}; export const isTokenExpired = () => false; export const removeTokens = () => { window.fixtureSession = false; };`
      : `export default {
        getCurrentUser: async () => window.fixtureSession ? window.fixtureUser : null,
        updateProfile: async data => { window.profileUpdates++; window.fixtureUser = { ...window.fixtureUser, ...data }; return window.fixtureUser; },
        changePassword: data => {
          window.passwordRequests++;
          window.payloadContract = Object.keys(data).sort().join(',') === 'newPassword,newPasswordRepeat,oldPassword'
            && data.oldPassword === 'fixtureCurrent9' && data.newPassword === 'fixtureNext10' && data.newPasswordRepeat === 'fixtureNext10';
          return new Promise((resolve, reject) => { window.passwordResponse = { resolve, reject }; });
        }
      };` }));
  } }],
});
const fonts = readFileSync(join(project, 'index.html'), 'utf8').match(/<link[\s\S]*?>/g).filter(tag => tag.includes('fonts.')).join('\n');
const child = `<!doctype html><html lang="vi"><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`;
const checks = async function () {
  const frame = document.querySelector('iframe');
  const results = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const verify = (name, condition, detail = '') => results.push({ name, pass: !!condition, detail });
  try {
    await delay(200);
    const doc = frame.contentDocument, win = frame.contentWindow;
    await Promise.race([doc.fonts.ready, delay(3000)]);
    const byId = id => doc.getElementById(id);
    const button = label => [...doc.querySelectorAll('button')].find(node => node.textContent.includes(label));
    const form = () => byId('profile-password-form');
    const success = () => doc.querySelector('main [role="status"]');
    const error = () => byId('password-change-error');
    const fields = () => ['current-pass-input', 'new-pass-input', 'confirm-pass-input'].map(byId);
    const change = async (id, value) => {
      const input = byId(id);
      Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
      await delay(10);
    };
    const fill = async () => {
      await change('current-pass-input', 'fixtureCurrent9');
      await change('new-pass-input', 'fixtureNext10');
      await change('confirm-pass-input', 'fixtureNext10');
    };
    const submit = () => form().dispatchEvent(new win.Event('submit', { bubbles: true, cancelable: true }));
    verify('TC-E-001: Profile and account information render', !!doc.querySelector('main') && doc.querySelector('main').textContent.includes('Task E User'));
    button('Đổi mật khẩu').click();
    await delay(30);
    verify('TC-E-002: empty native form is invalid', !form().checkValidity());
    submit();
    await delay(20);
    verify('TC-E-002: handler rejects empty input', win.passwordRequests === 0 && !!error());
    await change('current-pass-input', 'fixtureCurrent9');
    await change('new-pass-input', 'short');
    await change('confirm-pass-input', 'short');
    submit();
    await delay(20);
    verify('password length validation preserved', win.passwordRequests === 0 && !!error());
    await change('new-pass-input', 'fixtureNext10');
    await change('confirm-pass-input', 'different');
    submit();
    await delay(20);
    verify('TC-E-003: mismatch prevents request', win.passwordRequests === 0 && !!error());
    await fill();
    verify('input labels/autocomplete preserved', fields().every(input => input.labels.length === 1 && input.required) && fields()[0].autocomplete === 'current-password' && fields()[1].autocomplete === 'new-password');
    const currentToggle = doc.querySelector('[aria-controls="current-pass-input"]');
    const newToggle = doc.querySelector('[aria-controls="new-pass-input confirm-pass-input"]');
    currentToggle.click();
    newToggle.click();
    await delay(20);
    verify('TC-E-012: both visibility controls work', fields().every(input => input.type === 'text') && currentToggle.getAttribute('aria-pressed') === 'true' && newToggle.getAttribute('aria-pressed') === 'true');
    verify('visibility controls accessible by focus', currentToggle.tabIndex === 0 && newToggle.tabIndex === 0 && !!currentToggle.getAttribute('aria-label') && !!newToggle.getAttribute('aria-label'));
    currentToggle.focus();
    verify('visibility button receives focus', doc.activeElement === currentToggle);
    // Chrome omits unsupported Edge pseudo-elements from CSSOM; inspect shipped CSS.
    const cssText = doc.querySelector('style').textContent;
    verify('Profile native reveal suppression is scoped', cssText.includes('#profile-password-form input::-ms-reveal') && doc.querySelectorAll('#profile-password-form button[aria-pressed]').length === 2);
    for (const width of [375, 768, 1280, 1440]) {
      frame.style.width = width + 'px';
      await delay(40);
      verify(width + ': no page overflow', doc.documentElement.scrollWidth <= doc.documentElement.clientWidth + 1);
    }
    const submissions = [];
    for (let i = 0; i < 5; i++) submissions.push(submit());
    await delay(40);
    verify('native submission default prevented', submissions.every(result => result === false));
    verify('TC-E-004/006: one request with existing payload', win.passwordRequests === 1 && win.payloadContract);
    verify('TC-E-005: Profile stays mounted while pending', !!form() && byId('session-probe').dataset.path === '/profile' && byId('session-probe').dataset.loading === 'false');
    verify('TC-E-005: local pending label/spinner/disabled state', byId('btn-submit-change-pass').disabled && byId('btn-submit-change-pass').textContent.includes('Đang cập nhật mật khẩu...') && !!byId('btn-submit-change-pass').querySelector('.animate-spin') && form().getAttribute('aria-busy') === 'true');
    verify('pending fields disabled; stale errors cleared', fields().every(input => input.disabled) && !error());
    verify('TC-E-007: no success before response', !success());
    win.passwordResponse.resolve({ success: true });
    await delay(40);
    verify('TC-E-007: confirmed success notification', success()?.textContent.includes('Mật khẩu đã được thay đổi thành công.'));
    verify('TC-E-008: secrets cleared and hidden', fields().every(input => input.value === '' && input.type === 'password' && !input.disabled));
    verify('success ends loading and preserves session', !byId('btn-submit-change-pass').disabled && form().getAttribute('aria-busy') === 'false' && byId('session-probe').dataset.authenticated === 'true');
    const dismiss = doc.querySelector('[aria-label="Đóng thông báo thành công"]');
    dismiss.focus();
    verify('success dismiss is focusable', doc.activeElement === dismiss);
    dismiss.click();
    await delay(20);
    verify('success notification dismisses', !success());
    button('Thông tin cá nhân').click();
    await delay(20);
    verify('TC-E-016: account data unchanged after password change', doc.querySelector('input[value="Task E User"]') !== null);
    button('Phiên làm việc').click();
    await delay(20);
    verify('TC-E-016: session tab retained', doc.querySelector('main').textContent.includes('Phiên hoạt động hiện tại'));
    button('Đổi mật khẩu').click();
    await delay(20);
    for (const [kind, message] of [['current-password', 'Mật khẩu cũ không đúng.'], ['network', 'Network failure'], ['server', 'Server unavailable'], ['rate-limit', 'Too many requests']]) {
      await fill();
      submit();
      await delay(20);
      win.passwordResponse.reject(new Error(message));
      await delay(30);
      verify('TC-E-009/010 ' + kind + ': error without success', !!error() && error().textContent.includes(message) && !success());
      verify(kind + ': loading stops; form usable', !!form() && !byId('btn-submit-change-pass').disabled && fields().every(input => !input.disabled));
    }
    submit();
    await delay(20);
    verify('retry clears stale error', !error() && byId('btn-submit-change-pass').disabled);
    win.passwordResponse.resolve({ success: true });
    await delay(30);
    verify('retry can succeed', !!success() && !error());
    win.mountProfile('staff');
    await delay(80);
    verify('TC-E-014: remount preserves fixture session/account', byId('session-probe').dataset.authenticated === 'true' && !!doc.querySelector('main'));
    button('Đổi mật khẩu').click();
    await delay(20);
    await fill();
    submit();
    await delay(20);
    win.dispatchEvent(new win.CustomEvent('auth:expired'));
    await delay(30);
    verify('TC-E-011: actual auth expiry handler/guard deny Profile', !!byId('login-placeholder') && byId('session-probe').dataset.authenticated === 'false' && !win.fixtureSession);
    win.passwordResponse.resolve({ success: true });
    await delay(30);
    verify('late response cannot show success after auth expiry', !success() && !form() && !!byId('login-placeholder'));
    frame.onload = null;
    frame.srcdoc = frame.srcdoc;
    await delay(200);
    const reloaded = frame.contentDocument;
    verify('TC-E-014: fixture document reload restores Profile', reloaded !== doc && !!reloaded.querySelector('main'));
    verify('reload has no stale notification or password form', !reloaded.querySelector('main [role="status"]') && !reloaded.querySelector('#profile-password-form'));
  } catch (error) {
    verify('fixture execution', false, String(error.stack));
  }
  document.getElementById('task-e-results').textContent = btoa(unescape(encodeURIComponent(JSON.stringify(results))));
  frame.remove();
};
const fixture = join(output, 'profile-password.html');
writeFileSync(fixture, `<!doctype html><html><body><pre id="task-e-results">PENDING</pre><iframe style="width:1440px;height:2400px;border:0"></iframe><script>const frame=document.querySelector('iframe');frame.onload=${checks.toString()};frame.srcdoc=${JSON.stringify(child).replace(/<\/script/gi, '<\\/script')};</script></body></html>`);
const run = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + join(output, 'profile'), '--virtual-time-budget=14000', '--dump-dom', pathToFileURL(fixture).href], { encoding: 'utf8', timeout: 45000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
const encoded = run.stdout?.match(/<pre id="task-e-results">([^<]+)<\/pre>/)?.[1];
if (!encoded || encoded === 'PENDING') {
  console.error(browserName + ': fixture did not complete', run.error?.message || '', run.stderr?.slice(-1800));
  process.exitCode = 1;
} else {
  const results = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const failures = results.filter(result => !result.pass);
  console.log(JSON.stringify({ browser: browserName, checks: results.length, passed: results.length - failures.length, failures, fixture }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}
