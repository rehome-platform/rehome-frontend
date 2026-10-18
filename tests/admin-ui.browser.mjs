// Run after npm run build. Actual routes/components with mocked auth/profile services.
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserName = process.argv[2] || 'chrome';
const browser = browserName === 'edge' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output = mkdtempSync(join(tmpdir(), 'rehome-task-d-'));
const css = readFileSync(join(project, 'dist/assets', readdirSync(join(project, 'dist/assets')).find(name => name.endsWith('.css'))), 'utf8');
const bundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter } from 'react-router-dom';
    import AppRouter from './src/routes/AppRouter.jsx';
    import Barcode from './src/features/moderator/components/BarcodePrintModal.jsx';
    import Counterfeit from './src/features/moderator/components/SuspiciousCounterfeitModal.jsx';
    import { DEFAULT_SYSTEM_CONFIGS } from './src/configs/systemParams.config.js';
    window.defaults = DEFAULT_SYSTEM_CONFIGS;
    window.alerts = [];
    window.alert = message => window.alerts.push(message);
    sessionStorage.clear();
    const root = createRoot(document.getElementById('root'));
    let version = 0;
    window.showPage = (path, role = 'admin', authenticated = true) => {
      window.fixtureRole = role;
      window.fixtureAuthenticated = authenticated;
      const item = { id: 'fixture-item', sku: 'SKU-TEST', name: 'Test item', itemName: 'Test item', brand: 'Test brand', sellingPrice: 120000 };
      const content = path === 'barcode' ? <Barcode isOpen item={item} onClose={() => {}} />
        : path === 'counterfeit' ? <Counterfeit isOpen returnItem={item} onClose={() => {}} /> : <AppRouter />;
      root.render(<MemoryRouter key={version++} initialEntries={[path.startsWith('/') ? path : '/']}>{content}</MemoryRouter>);
    };
    window.showPage('/admin/configs');
  `, resolveDir: project, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  plugins: [{ name: 'mock-auth-notifications', setup(plugin) {
    plugin.onResolve({ filter: /AuthContext\.jsx$|NotificationContext\.jsx$|auth\.service\.js$/ }, args => ({ path: args.path, namespace: 'fixture-mocks' }));
    plugin.onLoad({ filter: /.*/, namespace: 'fixture-mocks' }, args => ({ contents: args.path.includes('NotificationContext')
      ? `export const useNotification = () => ({ unreadCount: 0 });`
      : args.path.includes('AuthContext')
      ? `export const useAuth = () => ({ user: { role: window.fixtureRole, fullName: 'Task D User', email: 'user@example.test', authorities: window.fixtureRole === 'admin' ? 'ROLE_ADMIN' : 'ROLE_MODERATOR' }, isAuthenticated: window.fixtureAuthenticated, loading: false, logout: async () => {}, updateProfile: async () => ({}), changePassword: async () => ({}) });`
      : `export const authService = { getCurrentUser: async () => ({ fullName: 'Task D User', email: 'user@example.test' }), checkAdminAccess: async () => ({ authorized: true }) }; export default authService;` }));
  } }],
});
const fonts = readFileSync(join(project, 'index.html'), 'utf8').match(/<link[\s\S]*?>/g).filter(tag => tag.includes('fonts.')).join('\n');
const child = `<!doctype html><html lang="vi"><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body><div id="root"></div><script>window.global=window;</script><script>${bundle.outputFiles[0].text}</script></body></html>`;
const checks = async function () {
  const frame = document.querySelector('iframe');
  const results = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const verify = (name, condition, detail = '') => results.push({ name, pass: !!condition, detail });
  try {
    await delay(200);
    const doc = frame.contentDocument, win = frame.contentWindow;
    await Promise.race([doc.fonts.ready, delay(3000)]);
    const button = text => [...doc.querySelectorAll('button')].find(node => node.textContent.includes(text));
    const body = () => doc.body.textContent;
    const visibleText = () => doc.getElementById('root').textContent;
    const inputValue = (input, value) => {
      Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new win.Event('input', { bubbles: true }));
    };
    const selectValue = (select, value) => {
      select.value = value;
      select.dispatchEvent(new win.Event('change', { bubbles: true }));
    };
    const responsive = async label => {
      for (const width of [375, 768, 1280, 1440]) {
        frame.style.width = width + 'px';
        await delay(40);
        verify(label + ' ' + width + ': no page overflow', doc.documentElement.scrollWidth <= doc.documentElement.clientWidth + 1, doc.documentElement.scrollWidth + '/' + doc.documentElement.clientWidth);
        verify(label + ' ' + width + ': no footer', doc.querySelector('footer') === null);
      }
    };
    const tabs = [
      ['1. Kỳ ký gửi', 'consignment'], ['2. Giá & Hoa hồng', 'pricingAndCommission'],
      ['3. Ví & Rút tiền', 'walletAndPayout'], ['4. Đơn & Trả hàng', 'ordersAndReturns'], ['5. Vận hành & Cộng đồng', 'operationsAndCommunity'],
    ];
    let totalInputs = 0;
    for (const [label, key] of tabs) {
      button(label).click();
      await delay(30);
      const form = doc.querySelector('#config-form');
      const inputs = [...form.querySelectorAll('input')];
      const expected = Object.entries(win.defaults[key]).filter(([name]) => name !== 'vatRate').map(([, value]) => String(value));
      verify(label + ': unchanged default values', JSON.stringify(inputs.map(input => input.value)) === JSON.stringify(expected));
      verify(label + ': no explanatory descriptions', form.querySelectorAll('p').length === 0);
      verify(label + ': labels and numeric controls preserved', inputs.every(input => input.type === 'number' && input.labels.length === 1 && input.labels[0].textContent.includes('*')));
      for (const input of inputs) {
        input.focus();
        verify(label + ': focus ' + input.id, doc.activeElement === input && input.tabIndex >= 0);
      }
      totalInputs += inputs.length;
      await responsive(label);
    }
    verify('all 23 configuration fields retained', totalInputs === 23);
    verify('configuration review and implementation header removed', !visibleText().includes('Review 1') && !visibleText().includes('không cần sửa code'));
    button('1. Kỳ ký gửi').click();
    await delay(30);
    inputValue(doc.querySelector('#config-form input'), '31');
    await delay(30);
    button('2. Giá & Hoa hồng').click();
    await delay(30);
    button('1. Kỳ ký gửi').click();
    await delay(30);
    verify('configuration editing survives tab changes', doc.querySelector('#config-form input').value === '31');
    button('Lưu thay đổi tham số').click();
    await delay(30);
    verify('save loading preserved', button('Lưu thay đổi tham số').disabled);
    await delay(650);
    verify('existing local save confirmation preserved', visibleText().includes('Đã cập nhật tham số hệ thống thành công'));
    win.showPage('/admin/audit-logs');
    await delay(100);
    verify('audit heading retained, subtitle removed', visibleText().includes('Nhật ký hệ thống') && !visibleText().includes('Ghi lại các thao tác của Admin và Moderator.'));
    const records = () => [...doc.querySelectorAll('tbody tr')].filter(row => row.cells.length === 5);
    const initialRows = records().length;
    verify('audit local save entry and eight records retained', initialRows === 9 && visibleText().includes('25/09/2026 - 02/10/2026'));
    verify('audit record details retained', visibleText().includes('Lý do ghi nhận kiểm toán:'));
    const selects = [...doc.querySelectorAll('main select')];
    selectValue(selects[0], 'Phạm Thu Hà');
    await delay(30);
    verify('audit actor filter preserved', records().length === 2);
    selectValue(selects[1], 'Gỡ nội dung');
    await delay(30);
    verify('audit action filter preserved', records().length === 1);
    selectValue(selects[1], 'Đặt lại mật khẩu');
    await delay(30);
    verify('audit empty state preserved', visibleText().includes('Không có bản ghi nào'));
    button('Xóa bộ lọc').click();
    await delay(30);
    verify('audit reset restores records', records().length === initialRows);
    await responsive('Audit');
    for (const role of ['admin', 'staff']) {
      win.showPage('/profile', role);
      await delay(100);
      verify(role + ': Profile header and content retained', !!doc.querySelector('header') && visibleText().includes('Hồ Sơ & Bảo Mật Tài Khoản'));
      verify(role + ': Profile feature codes removed', !/\bf\s*[-–]\s*\d{3}/i.test(visibleText()));
      button('Đổi mật khẩu').click();
      await delay(30);
      verify(role + ': password heading cleaned', visibleText().includes('Đổi mật khẩu tài khoản') && !visibleText().includes('F-008'));
      await responsive(role + ' Profile');
    }
    for (const path of ['/admin', '/moderator/counter', '/moderator/queue', '/moderator/inventory', '/moderator/packing', '/moderator/returns', '/moderator/verifications', '/moderator/reports', '/moderator/categories', '/moderator/inbox']) {
      win.showPage(path, path.startsWith('/admin') ? 'admin' : 'staff');
      await delay(60);
      verify(path + ': internal footer absent', !doc.querySelector('footer'));
      verify(path + ': visible feature codes absent', !/\bf\s*[-–]\s*\d{3}/i.test(visibleText()));
      verify(path + ': content rendered', !!doc.querySelector('main'));
    }
    for (const path of ['barcode', 'counterfeit']) {
      win.showPage(path, 'staff');
      await delay(60);
      verify(path + ': modal title cleaned', !!doc.querySelector('[role="dialog"]') && !/\bF-\d{3}/.test(visibleText()));
    }
    win.showPage('/login', 'admin', false);
    await delay(60);
    verify('public login layout preserved', !!doc.querySelector('#google-login-button') && visibleText().includes('Cổng Điều Hành & Vận Hành Tập Trung ReHome'));
    win.showPage('/forgot-password', 'admin', false);
    await delay(60);
    verify('public recovery layout preserved', !!doc.querySelector('#recovery-email') && visibleText().includes('Quên mật khẩu'));
  } catch (error) {
    verify('fixture execution', false, String(error.stack));
  }
  document.getElementById('task-d-results').textContent = btoa(unescape(encodeURIComponent(JSON.stringify(results))));
  frame.remove();
};
const fixture = join(output, 'admin-ui.html');
writeFileSync(fixture, `<!doctype html><html><body><pre id="task-d-results">PENDING</pre><iframe style="width:1440px;height:2400px;border:0"></iframe><script>const frame=document.querySelector('iframe');frame.onload=${checks.toString()};frame.srcdoc=${JSON.stringify(child).replace(/<\/script/gi, '<\\/script')};</script></body></html>`);
const run = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + join(output, 'profile'), '--virtual-time-budget=16000', '--dump-dom', pathToFileURL(fixture).href], { encoding: 'utf8', timeout: 45000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
const encoded = run.stdout?.match(/<pre id="task-d-results">([^<]+)<\/pre>/)?.[1];
if (!encoded || encoded === 'PENDING') {
  console.error(browserName + ': fixture did not complete', run.error?.message || '', run.stderr?.slice(-1800));
  process.exitCode = 1;
} else {
  const results = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const failures = results.filter(result => !result.pass);
  console.log(JSON.stringify({ browser: browserName, checks: results.length, passed: results.length - failures.length, failures, fixture }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}
