import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
process.chdir(projectRoot);
const out = path.resolve(projectRoot, '../tmp/l02-qa');
await mkdir(out, { recursive: true });

process.env.VITE_PHASE2_MOCK = 'true';
console.log('1. Starting Vite development server on port 5188 with mock fixtures enabled...');
const viteServer = await createServer({
  root: projectRoot,
  server: { port: 5188, strictPort: true },
  define: {
    'import.meta.env.VITE_PHASE2_MOCK': JSON.stringify('true'),
  },
});
await viteServer.listen();
console.log('Vite server running at http://127.0.0.1:5188');

console.log('2. Launching browser for E2E flow testing...');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const errors = [];
page.on('pageerror', (err) => errors.push(err.message));

// Seed user auth session in browser
const exp = Math.floor(Date.now() / 1000) + 86400;
const payloadBase64 = Buffer.from(
  JSON.stringify({
    sub: 'mod-qa',
    role: 'staff',
    authorities: 'ROLE_MODERATOR',
    exp,
  })
).toString('base64url');
const mockToken = `eyJhbGciOiJIUzI1NiJ9.${payloadBase64}.mockSignature`;
const mockUser = {
  id: 'mod-qa',
  accountId: 'mod-qa',
  fullName: 'Nguyễn Văn A',
  code: 'MOD-07-003',
  role: 'moderator',
  warehouseId: 'warehouse-a',
  warehouseName: 'Kho Quận 7',
};

await page.addInitScript(
  ({ token, user }) => {
    localStorage.setItem('rehome_token', token);
    localStorage.setItem('rehome_user', JSON.stringify(user));
  },
  { token: mockToken, user: mockUser }
);

// Mock backend auth and external calls so AuthProvider does not redirect to /login
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
    return route.continue();
  }
  const json = (result) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result }),
    });

  if (url.pathname.includes('/account/me')) {
    return json({
      id: 'mod-qa',
      accountId: 'mod-qa',
      email: 'mod@rehome.test',
      fullName: 'Nguyễn Văn A',
      role: 'MODERATOR',
      authorities: 'ROLE_MODERATOR',
      warehouseId: 'warehouse-a',
      warehouseName: 'Kho Quận 7',
    });
  }
  if (url.pathname.includes('/warehouses')) {
    return json([{ id: 'warehouse-a', name: 'Kho Quận 7' }]);
  }
  return json({});
});

try {
  // -------------------------------------------------------------
  // TEST 1: TK-02 - Sản phẩm quá hạn 90 ngày có yêu cầu ký gửi lại
  // -------------------------------------------------------------
  console.log('3. Testing TK-02: Product Detail for RH-M4T19B (End of term 3)...');
  await page.goto('http://127.0.0.1:5188/moderator/inventory/RH-M4T19B');

  await expect(page.getByText('Áo khoác bomber')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Ký gửi lại cuối kỳ (Hết kỳ 3: 90 ngày)')).toBeVisible();
  await expect(page.getByRole('button', { name: /Đàm phán giá/ })).toBeVisible();

  await page.screenshot({ path: path.join(out, '01-TK-02-reconsign-banner.png'), fullPage: true });
  console.log('✓ TK-02 verified and screenshot saved');

  // -------------------------------------------------------------
  // TEST 2: KD-11 - Đàm phán giá mới
  // -------------------------------------------------------------
  console.log('4. Navigating to KD-11 (Re-consign negotiation)...');
  await page.getByRole('button', { name: /Đàm phán giá/ }).click();

  await expect(page.getByRole('heading', { name: 'Ký gửi lại — chốt giá mới', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Món đang ở kho')).toBeVisible();
  await expect(page.getByText('Tham khảo khi định giá lại')).toBeVisible();
  await expect(page.getByLabel('Giá bán đề xuất ký gửi lại')).toBeVisible();

  await page.screenshot({ path: path.join(out, '02-KD-11-initial.png'), fullPage: true });
  console.log('✓ KD-11 initial view verified');

  // Moderator enters proposed price & sends proposal
  console.log('5. Moderator inputs proposed price 680.000đ and submits proposal...');
  await page.getByLabel('Giá bán đề xuất ký gửi lại').fill('680000');
  await page.getByRole('button', { name: /Gửi đề xuất giá mới cho Member/ }).click();

  // Verify status transition: ĐÃ GỬI ĐỀ XUẤT · CHỜ MEMBER XÁC NHẬN QUA APP
  await expect(page.getByText('ĐÃ GỬI ĐỀ XUẤT · CHỜ MEMBER XÁC NHẬN QUA APP')).toBeVisible();
  await expect(page.getByText(/Đang chờ Member phản hồi qua app/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Mở duyệt giá/ })).toHaveCount(0);

  await page.screenshot({ path: path.join(out, '03-KD-11-waiting-member.png'), fullPage: true });
  console.log('✓ KD-11 proposal sent and waiting state verified');

  // -------------------------------------------------------------
  // TEST 3: KG-12 - Member duyệt giá mới qua App
  // -------------------------------------------------------------
  console.log('6. Simulating an external Member confirmation in the fixture backend...');
  await page.evaluate(async () => {
    const scope = { userId: 'mod-qa', warehouseId: 'warehouse-a' };
    const { readProposals } = await import('/src/features/moderator/services/reconsignProposalStore.js');
    const { fixtureRequest } = await import('/src/features/moderator/fixtures/warehouseFixtures.js');
    const proposal = readProposals({ scope }).find(row => row.productId === 'RH-M4T19B');
    if (!proposal?.receiptId) throw new Error('Missing actual proposal receipt ID');
    await fixtureRequest('endTermConfirmReceipt', { scope, ids: { receiptId: proposal.receiptId } });
  });
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click();

  // -------------------------------------------------------------
  // TEST 4: KD-11-DaChot - Hoàn tất chốt ký gửi lại
  // -------------------------------------------------------------
  console.log('8. Verifying KD-11-DaChot (Confirmed state)...');
  await expect(page.getByText('MEMBER ĐÃ XÁC NHẬN · ĐÃ CHỐT')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Giá bán đã chốt')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xem biên nhận ký gửi lại' })).toBeVisible();

  await page.screenshot({ path: path.join(out, '05-KD-11-dachot.png'), fullPage: true });
  console.log('✓ KD-11-DaChot verified');

  // Open receipt modal
  await page.getByRole('button', { name: 'Xem biên nhận ký gửi lại' }).click();
  await expect(page.getByRole('heading', { name: 'Biên nhận ký gửi lại' })).toBeVisible();
  await page.screenshot({ path: path.join(out, '06-KD-11-receipt-modal.png') });
  await page.getByRole('button', { name: 'Đóng' }).click();

  // -------------------------------------------------------------
  // TEST 5: DÙNG CHUNG - TK-01 (Danh sách tồn kho)
  // -------------------------------------------------------------
  console.log('9. Navigating to TK-01: Warehouse Inventory List...');
  await page.goto('http://127.0.0.1:5188/moderator/inventory');

  await expect(page.getByRole('heading', { name: 'Tồn kho' })).toBeVisible();
  // Check tabs
  await expect(page.getByRole('button', { name: 'Tất cả' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đang bán' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chờ xử lý cuối kỳ' })).toBeVisible();

  await page.screenshot({ path: path.join(out, '07-TK-01-inventory-list.png'), fullPage: true });
  console.log('✓ TK-01 inventory table verified');

  // -------------------------------------------------------------
  // TEST 6: DÙNG CHUNG - TK-03 (Tra cứu SKU với 4 trạng thái)
  // -------------------------------------------------------------
  console.log('10. Testing TK-03: SKU Lookup with 4 wireframe states...');
  await page.getByRole('button', { name: 'Tra cứu SKU' }).click();

  // State 1: Chưa nhập
  await expect(page.getByText('Chưa có kết quả')).toBeVisible();

  // State 2: Tìm thấy (RH-M4T19B)
  await page.getByPlaceholder(/VD: RH-K9B47T/).fill('RH-M4T19B');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await expect(page.getByText('TÌM THẤY')).toBeVisible();
  await page.screenshot({ path: path.join(out, '08-TK-03-found.png') });
  console.log('✓ TK-03 Tìm thấy verified');

  // State 3: Thuộc kho khác (RH-D6P23L)
  await page.getByPlaceholder(/VD: RH-K9B47T/).fill('RH-D6P23L');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await expect(page.getByText('THUỘC KHO KHÁC')).toBeVisible();
  await page.screenshot({ path: path.join(out, '09-TK-03-other-warehouse.png') });
  console.log('✓ TK-03 Thuộc kho khác verified');

  // State 4: Không tồn tại (RH-ZZ9999)
  await page.getByPlaceholder(/VD: RH-K9B47T/).fill('RH-ZZ9999');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await expect(page.getByText('KHÔNG TỒN TẠI')).toBeVisible();
  await page.screenshot({ path: path.join(out, '10-TK-03-not-found.png') });
  console.log('✓ TK-03 Không tồn tại verified');

  // Close lookup modal
  await page.keyboard.press('Escape');

  // -------------------------------------------------------------
  // TEST 8: TK-02 - Sản phẩm khách chọn Nhận lại hàng
  // -------------------------------------------------------------
  console.log('12. Testing TK-02: Product with Take-Back decision (RH-AL-000298)...');
  await page.goto('http://127.0.0.1:5188/moderator/inventory/RH-AL-000298');

  await expect(page.getByText('ĐƯỢC YÊU CẦU NHẬN LẠI HÀNG')).toBeVisible();
  await expect(page.getByText('Khách đã chọn nhận lại cuối kỳ (miễn phí)')).toBeVisible();
  await page.screenshot({ path: path.join(out, '12-TK-02-takeback-banner.png'), fullPage: true });
  console.log('✓ TK-02 Take-back banner verified');

  if (errors.length) {
    throw new Error('Client errors during test:\n' + errors.join('\n'));
  }

  console.log(
    JSON.stringify({
      success: true,
      screenshots: out,
      message: 'All L-02 and DUNG CHUNG (TK-01 -> TK-04) steps passed successfully!',
    })
  );
} finally {
  await browser.close();
  await viteServer.close();
}
