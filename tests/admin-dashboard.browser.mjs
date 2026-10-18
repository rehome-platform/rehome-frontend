// Run after npm run build. Uses installed Chrome/Edge with a local mocked fixture.
import { build } from 'esbuild';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserName = process.argv[2] || 'chrome';
const browser = browserName === 'edge'
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const output = mkdtempSync(join(tmpdir(), 'rehome-task-c-'));
const cssFile = readdirSync(join(project, 'dist/assets')).find(name => name.endsWith('.css'));
const css = readFileSync(join(project, 'dist/assets', cssFile), 'utf8');
const bundle = await build({
  stdin: { contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter } from 'react-router-dom';
    import Dashboard from './src/features/admin/pages/AdminDashboardPage.jsx';
    import AdminLayout from './src/layouts/AdminLayout.jsx';
    const root = createRoot(document.getElementById('root'));
    let version = 0;
    window.alerts = [];
    window.alert = message => window.alerts.push(message);
    window.mountDashboard = () => root.render(<MemoryRouter key={version++} initialEntries={['/admin']}><AdminLayout><Dashboard /></AdminLayout></MemoryRouter>);
    window.mountDashboard();
  `, resolveDir: project, loader: 'jsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.png': 'dataurl', '.svg': 'dataurl' },
  plugins: [{ name: 'mock-auth-only', setup(plugin) {
    plugin.onResolve({ filter: /AuthContext\.jsx$|auth\.service\.js$/ }, args => ({ path: args.path, namespace: 'mock-auth' }));
    plugin.onLoad({ filter: /.*/, namespace: 'mock-auth' }, args => ({ contents: args.path.includes('AuthContext')
      ? `export const useAuth = () => ({ user: { role: 'admin', name: 'Task C Admin', email: 'admin@example.test', authorities: 'ROLE_ADMIN' }, isAuthenticated: true, loading: false, logout: async () => {} });`
      : `export default { checkAdminAccess: async () => { window.adminChecks = (window.adminChecks || 0) + 1; return window.apiDenied ? { authorized: false, message: 'Permission denied' } : { authorized: true, message: 'Backend implementation detail' }; } };` }));
  } }],
});
const fonts = readFileSync(join(project, 'index.html'), 'utf8').match(/<link[\s\S]*?>/g).filter(tag => tag.includes('fonts.')).join('\n');
const child = `<!doctype html><html lang="vi"><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`;
const checks = async function () {
  const frame = document.querySelector('iframe');
  const results = [];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const verify = (name, condition, detail = '') => {
    results.push({ name, pass: !!condition, detail });
  };
  try {
    await delay(200);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    await Promise.race([doc.fonts.ready, delay(3000)]);
    const text = () => doc.querySelector('main').textContent;
    const button = label => [...doc.querySelectorAll('main button')].find(node => node.textContent.includes(label));
    verify('dashboard renders', text().includes('Quỹ Nền Tảng & Tổng Quan Doanh Thu'));
    for (const note of ['Mục 7 & 8', 'Review 1', 'Hệ thống ghi sổ kép:', 'Đã kết nối Backend API', 'Ghi chú ranh giới triển khai:', 'Nguyên tắc tính:', 'Đồ án mô phỏng:', 'Mục 10 Giới hạn', 'API Phase 1', 'Mọi giao dịch tiền đều có 2 dòng']) {
      verify('removed: ' + note, !text().includes(note));
    }
    const kpis = doc.querySelector('main .lg\\:grid-cols-4');
    verify('four KPI cards', kpis?.children.length === 4);
    for (const [index, value] of ['142580000', '38450000', '181030000', '24'].entries()) {
      verify('KPI ' + index, kpis.children[index].textContent.replace(/\D/g, '').includes(value));
    }
    for (const note of ['Tổng số dư ví Member', 'Tổng hoa hồng lũy tiến', 'Tiền MoMo thực tế', '14 đơn chờ đóng gói']) verify('KPI note removed: ' + note, !kpis.textContent.includes(note));
    const revenueTitle = [...doc.querySelectorAll('h3')].find(node => node.textContent === 'Cơ Cấu Doanh Thu Nền Tảng');
    const revenue = revenueTitle.parentElement.parentElement.parentElement;
    const ledger = doc.querySelector('#ledger-heading').parentElement.parentElement.parentElement;
    verify('five revenue categories', revenue.querySelector('.space-y-3').children.length === 5);
    verify('all revenue values preserved', ['19800000', '12450000', '4700000', '2500000', '1000000'].every(amount => revenue.textContent.replace(/\D/g, '').includes(amount)));
    verify('ledger rows/columns', ledger.querySelectorAll('tbody tr').length === 4 && ledger.querySelectorAll('thead th').length === 5);
    verify('ledger transaction IDs', ['TX-89210', 'TX-89209', 'TX-89205', 'TX-89190'].every(id => ledger.textContent.includes(id)));
    verify('reconciliation status', ledger.textContent.includes('Đối soát: Khớp 100%'));
    const scroll = ledger.querySelector('[role="region"]');
    for (const width of [375, 768, 1280, 1440]) {
      frame.style.width = width + 'px';
      await delay(100);
      const r = revenue.getBoundingClientRect();
      const l = ledger.getBoundingClientRect();
      const main = doc.querySelector('main');
      const mainStyle = win.getComputedStyle(main);
      const contentWidth = main.clientWidth - parseFloat(mainStyle.paddingLeft) - parseFloat(mainStyle.paddingRight);
      verify(width + ': correct viewport', win.innerWidth === width, String(win.innerWidth));
      verify(width + ': stacked full-width sections', l.top >= r.bottom && Math.abs(l.width - r.width) <= 1 && Math.abs(r.width - contentWidth) <= 1, JSON.stringify({ revenue: r.width, ledger: l.width, contentWidth }));
      verify(width + ': no page overflow', doc.documentElement.scrollWidth <= doc.documentElement.clientWidth + 1, doc.documentElement.scrollWidth + '/' + doc.documentElement.clientWidth);
      verify(width + ': table scroll contained', win.getComputedStyle(scroll).overflowX === 'auto' && scroll.clientWidth <= l.width);
      if (width < 1024) verify(width + ': table can scroll', scroll.scrollWidth > scroll.clientWidth);
      for (const row of ledger.querySelectorAll('tbody tr')) {
        const cells = [...row.children];
        verify(width + ': cells do not overlap ' + cells[0].textContent.trim(), cells.every((cell, i) => !i || cell.getBoundingClientRect().left >= cells[i - 1].getBoundingClientRect().right - 1));
      }
    }
    scroll.focus();
    verify('scroll region keyboard focus', doc.activeElement === scroll);
    const transactionId = ledger.querySelector('tbody tr td p');
    const originalId = transactionId.textContent;
    transactionId.textContent = 'TX-' + 'LONG'.repeat(80);
    await delay(50);
    verify('long ID remains inside page', doc.documentElement.scrollWidth <= doc.documentElement.clientWidth + 1);
    transactionId.textContent = originalId;
    for (const label of ['Tuần này', 'Tất cả', 'Tháng này']) {
      button(label).click();
      await delay(30);
      verify('filter selection: ' + label, button(label).classList.contains('bg-[#006B2C]'));
    }
    button('Xuất báo cáo Excel').click();
    await delay(30);
    verify('export loading preserved', button('Xuất báo cáo Excel').disabled);
    await delay(900);
    verify('existing simulated export completes', win.alerts.length === 1 && !button('Xuất báo cáo Excel').disabled);
    button('Hoạt động & Tăng trưởng').click();
    await delay(30);
    verify('activities tab accessible', text().includes('Tổng số Member'));
    button('Quỹ nền tảng & Doanh thu').click();
    await delay(30);
    verify('fund tab restored', !!doc.querySelector('#ledger-heading'));
    win.mountDashboard();
    await delay(100);
    verify('remount restores dashboard and API check', !!doc.querySelector('#ledger-heading') && win.adminChecks === 2);
    win.apiDenied = true;
    win.mountDashboard();
    await delay(100);
    verify('authorization warning preserved', text().includes('Cảnh báo phân quyền: Permission denied') && text().includes('Cần kiểm tra quyền truy cập'));
    verify('successful API detail hidden', !text().includes('Backend implementation detail'));
    // Reload the whole fixture document, including React and the mocked API state.
    frame.onload = null;
    frame.srcdoc = frame.srcdoc;
    await delay(200);
    const refreshed = frame.contentDocument;
    verify('document reload restores dashboard', refreshed !== doc && !!refreshed.querySelector('#ledger-heading'));
    verify('document reload preserves records and checks access', refreshed.querySelectorAll('tbody tr').length === 4 && frame.contentWindow.adminChecks === 1);
  } catch (error) {
    verify('fixture execution', false, String(error.stack));
  }
  document.getElementById('task-c-results').textContent = btoa(unescape(encodeURIComponent(JSON.stringify(results))));
  frame.remove();
};
const fixture = join(output, 'dashboard.html');
writeFileSync(fixture, `<!doctype html><html><body><pre id="task-c-results">PENDING</pre><iframe style="width:1440px;height:2400px;border:0"></iframe><script>const frame=document.querySelector('iframe'); frame.onload=${checks.toString()}; frame.srcdoc=${JSON.stringify(child).replace(/<\/script/gi, '<\\/script')};</script></body></html>`);
const run = spawnSync(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + join(output, 'profile'), '--virtual-time-budget=12000', '--dump-dom', pathToFileURL(fixture).href], { encoding: 'utf8', timeout: 45000, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
const encoded = run.stdout?.match(/<pre id="task-c-results">([^<]+)<\/pre>/)?.[1];
if (!encoded || encoded === 'PENDING') {
  console.error(browserName + ': browser fixture did not finish', run.error?.message || '', run.stderr?.slice(-1800));
  process.exitCode = 1;
} else {
  const results = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const failures = results.filter(result => !result.pass);
  console.log(JSON.stringify({ browser: browserName, checks: results.length, passed: results.length - failures.length, failures, fixture }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
}
