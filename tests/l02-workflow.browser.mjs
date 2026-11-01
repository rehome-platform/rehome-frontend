import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('../tmp/l02-qa');
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1sAAAAASUVORK5CYII=';
let confirmed = false, sku = null, printed = false;
const item = { sku: 'Q7-AO-000001', name: 'Áo dài Zara', brandName: 'Zara', size: 'M', categoryName: 'Áo dài', conditionNote: 'Tốt', warehouseName: 'Địa điểm ký gửi - TPHCM', stockedAt: '2026-11-01T03:00:00Z', moderatorName: 'Moderator QA' };
const form = () => ({ id: 'form-qa', formId: 'form-qa', productName: item.name, status: 'INSPECTING', claimedBy: 'mod-qa', receiptId: 'receipt-qa', resumeStep: sku ? 'PRINT' : confirmed ? 'STOCK_IN' : 'WAITING_CONFIRMATION', productSku: sku, member: { id: 'member-qa', fullName: 'Nguyễn An' }, size: 'M', categoryId: 'cat-qa', brandId: 'brand-qa', description: 'Áo dài còn mới, sạch sẽ.' });
const receipt = () => ({ id: 'receipt-qa', receiptNo: 'KG-2026-001', formId: 'form-qa', productName: item.name, size: 'M', categoryId: 'cat-qa', brandId: 'brand-qa', agreedPrice: 850000, floorPrice: 425000, termLengthDays: 30, commissionRateTerm1: 0.1, commissionRateTerm2: 0.15, commissionRateTerm3: 0.2, conditionNote: 'Còn mới, đường may và nhãn mác nguyên vẹn.', confirmedAt: confirmed ? '2026-11-01T03:00:00Z' : null, sku });
await page.addInitScript(() => {
  localStorage.setItem('rehome_token', 'qa-token');
  localStorage.setItem('rehome_user', JSON.stringify({ id: 'mod-qa', accountId: 'mod-qa', role: 'staff', warehouseId: 'wh-qa', warehouseName: 'Địa điểm ký gửi - TPHCM' }));
});
await page.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1') return route.continue();
  if (!url.hostname.endsWith('azurewebsites.net')) return route.abort();
  const json = result => route.fulfill({ json: { result } });
  if (url.pathname === '/api/account/me') return json({ id: 'mod-qa', accountId: 'mod-qa', email: 'qa@example.test', fullName: 'Moderator QA', role: 'MODERATOR', authorities: '[ROLE_MODERATOR]', warehouseId: 'wh-qa', warehouseName: 'Địa điểm ký gửi - TPHCM' });
  if (url.pathname === '/warehouses/moderator') return json([{ id: 'wh-qa', name: 'Địa điểm ký gửi - TPHCM' }]);
  if (url.pathname === '/moderator/consignment-forms/form-qa') return json(form());
  if (url.pathname === '/moderator/consignment-forms') return json({ content: [form()], page: 0, totalElements: 1, totalPages: 1 });
  if (url.pathname === '/consignment-receipts/receipt-qa') return json(receipt());
  if (url.pathname === '/categories') return json(url.searchParams.get('status') === 'HIDDEN' ? [] : [{ id: 'cat-qa', name: 'Áo dài', tryonSlot: 'DRESS' }, { id: 'cat-bag', name: 'Túi xách', tryonSlot: 'NONE' }]);
  if (url.pathname === '/brands') return json(url.searchParams.get('status') === 'HIDDEN' ? [] : [{ id: 'brand-qa', name: 'Zara' }]);
  if (url.pathname === '/uploads') return json({ url: image });
  if (url.pathname === '/products' && route.request().method() === 'POST') { sku = item.sku; return json({ id: sku }); }
  if (url.pathname === '/moderator/sku-labels') return json(sku && !printed ? [item] : []);
  if (url.pathname === '/moderator/sku-labels/pdf') return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
  if (url.pathname === '/moderator/sku-labels/printed') { printed = true; return json(null); }
  if (url.pathname === '/notifications') return json([]);
  return route.fulfill({ status: 404, json: { message: 'QA endpoint unavailable' } });
});
try {
  await page.goto('http://127.0.0.1:5188/moderator/consignments/form-qa');
  await expect(page.getByText('Đang chờ khách xác nhận biên nhận')).toBeVisible();
  await expect(page.getByRole('button', { name: /Đạt kiểm định/ })).toHaveCount(0);
  await page.screenshot({ path: path.join(out, 'KD-07-waiting.png'), fullPage: true });
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.screenshot({ path: path.join(out, 'KD-07-tablet.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  confirmed = true;
  await page.getByRole('button', { name: 'Tải lại biên nhận' }).click();
  await expect(page.getByLabel('Tên sản phẩm', { exact: true })).toHaveValue(item.name);
  await expect(page.getByLabel('Danh mục', { exact: true })).toHaveValue('cat-qa');
  await page.screenshot({ path: path.join(out, 'KD-08-stock-in.png'), fullPage: true });
  await page.getByRole('button', { name: '+ Thêm nhanh thương hiệu' }).click();
  await page.screenshot({ path: path.join(out, 'KD-09-new-brand.png'), fullPage: true });
  await page.getByRole('dialog').getByLabel('Tên thương hiệu', { exact: true }).fill('Zara');
  await expect(page.getByRole('button', { name: 'Lưu thương hiệu' })).toBeDisabled();
  await page.screenshot({ path: path.join(out, 'KD-09-duplicate-brand.png'), fullPage: true });
  await page.getByRole('button', { name: 'Huỷ', exact: true }).click();
  await page.getByLabel('Danh mục', { exact: true }).selectOption('cat-bag');
  await page.screenshot({ path: path.join(out, 'KD-08-no-tryon.png'), fullPage: true });
  await page.getByLabel('Vị trí kệ').fill('A1-02');
  await page.getByLabel('Ảnh sản phẩm', { exact: true }).setInputFiles({ name: 'product.png', mimeType: 'image/png', buffer: Buffer.from(image.split(',')[1], 'base64') });
  await expect(page.getByRole('button', { name: 'Nhập kho · tạo SKU' })).toBeEnabled();
  await page.getByRole('button', { name: 'Nhập kho · tạo SKU' }).click();
  await expect(page.getByRole('heading', { name: 'Hàng đợi in tem', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: `Chọn ${item.sku}`, exact: true }).check();
  await page.screenshot({ path: path.join(out, 'KD-10-print-queue.png'), fullPage: true });
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải PDF 1 tem', exact: true }).click()]);
  if (download.suggestedFilename() !== 'rehome-tem-sku.pdf') throw new Error('Wrong PDF download name');
  await expect(page.getByText('Đã tải PDF 1 tem và cập nhật hàng đợi.')).toBeVisible();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ passed: true, screenshots: out, download: download.suggestedFilename() }));
} finally { await browser.close(); }
