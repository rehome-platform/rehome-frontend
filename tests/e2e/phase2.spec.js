import { test, expect } from '@playwright/test';

// Browser evidence uses explicit fixtures, including simulated Member confirmation.
// It is never reported as a live backend/mobile integration run.
test.beforeEach(async ({ page }) => {
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'mod-a', exp: 4102444800, roles: ['ROLE_MODERATOR'] })).toString('base64url')}.fixture`;
  await page.addInitScript(
    ({ token }) => {
      localStorage.setItem('rehome_token', token);
      localStorage.setItem(
        'rehome_user',
        JSON.stringify({
          id: 'mod-a',
          accountId: 'mod-a',
          role: 'staff',
          email: 'moderator@example.test',
          warehouseId: 'warehouse-a',
          warehouseName: 'Kho A',
        }),
      );
    },
    { token },
  );
  await page.route('**/api/account/me', (route) =>
    route.fulfill({
      json: {
        email: 'moderator@example.test',
        authorities: ['ROLE_MODERATOR'],
        warehouseId: 'warehouse-a',
        warehouseName: 'Kho A',
      },
    }),
  );
  await page.route('**/members/me', (route) =>
    route.fulfill({ json: { accountId: 'mod-a', fullName: 'Moderator thử nghiệm' } }),
  );
  await page.route('**/api/notifications', (route) => route.fulfill({ json: [] }));
  await page.route('**/ws/**', (route) => route.fulfill({ status: 404 }));
});

async function nav(page, name) {
  const link = page.getByRole('link', { name, exact: true });
  const menu = page.getByRole('button', { name: 'Mở menu' });
  if (await menu.isVisible()) await menu.click();
  await link.click();
}
async function identify(page) {
  await page.getByLabel('Mã Member', { exact: true }).fill('MB-001');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn Member MB-001' }).click();
  await page.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }).click();
  await expect(page.getByText('Đã xác nhận danh tính', { exact: true })).toBeVisible();
}
test('inspect → wait Member → stock-in → SKU → shelf history (fixtures)', async ({
  page,
  browser,
}, testInfo) => {
  testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
  await page.goto('/moderator/counter');
  await identify(page);
  await nav(page, 'Hàng đợi công việc');
  await page.getByRole('tab', { name: 'Kiểm định', exact: true }).click();
  await page.getByRole('button', { name: 'Nhận việc', exact: true }).click();
  await page.getByRole('link', { name: 'Mở', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu kiểm định tại quầy' }).click();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await page.getByLabel('Ghi chú tình trạng thực tế').fill('Đường may nguyên vẹn');
  await page.getByLabel('Giá chốt thỏa thuận (VND)').fill('250000');
  await page.getByLabel('Độ dài kỳ ký gửi', { exact: true }).selectOption('30');
  await page.getByRole('button', { name: 'Đạt kiểm định — Tạo biên nhận ký gửi' }).click();
  await expect(page.getByText(/Đang chờ Member xác nhận/)).toBeVisible();
  await expect(page.getByLabel('Tên sản phẩm')).toHaveCount(0);
  await page.evaluate(async () => {
    const fixtures = await import('/src/features/moderator/fixtures/warehouseFixtures.js');
    fixtures.confirmFixtureReceipt('receipt-1');
  });
  await page.getByRole('button', { name: 'Tải lại biên nhận' }).click();
  await page.getByLabel('Tên sản phẩm').fill('Quần jeans thử nghiệm');
  await page.getByLabel('Size', { exact: true }).fill('M');
  await page.getByLabel('Vị trí kệ', { exact: true }).fill('A2');
  await page.getByLabel('Danh mục', { exact: true }).selectOption('cat-2');
  await page.getByLabel('Thương hiệu', { exact: true }).selectOption('brand-1');
  await page
    .getByLabel('Ảnh sản phẩm', { exact: true })
    .setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  await page.getByRole('button', { name: 'Nhập kho · tạo SKU' }).click();
  await page.getByRole('link', { name: /Đã nhập kho · TEST-SKU-4/ }).click();
  await expect(page.getByText('SKU: TEST-SKU-4', { exact: true })).toBeVisible();
  await page.getByLabel('Vị trí kệ mới').fill('B2');
  await page.getByRole('button', { name: 'Lưu vị trí kệ' }).click();
  await expect(page.getByText('SHELF_CHANGED', { exact: true })).toBeVisible();
  await expect(page.getByText('Kệ B2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mở / In lại tem SKU' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở PDF tem để xem và in' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('inventory.png'), fullPage: true });
});

test('shared phone selection, catalog modal and all end-of-term branches (fixtures)', async ({
  page,
}) => {
  await page.goto('/moderator/counter');
  await page.getByLabel('Tra cứu bằng').selectOption('phone');
  await page.getByLabel('Số điện thoại').fill('0900000001');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await expect(page.getByRole('button', { name: /Chọn Member MB-/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Chọn Member MB-001' }).click();
  await page.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }).click();
  await nav(page, 'Danh mục & thương hiệu');
  await page.getByRole('button', { name: 'Thêm danh mục' }).click();
  await page.getByLabel('Tên danh mục', { exact: true }).fill('Áo mới');
  await page.getByLabel('Slot thử đồ AI (Bắt buộc)', { exact: true }).selectOption('TOP');
  await page.getByRole('button', { name: 'Lưu danh mục', exact: true }).click();
  await expect(page.getByText('Áo mới', { exact: true })).toBeVisible();
  await nav(page, 'Quầy tiếp nhận');
  await identify(page);
  await page.getByRole('link', { name: 'Mở trang Hàng cuối kỳ' }).click();
  await page.getByRole('button', { name: 'Mở xử lý' }).nth(0).click();
  await page.getByRole('button', { name: 'Bàn giao nhận lại cuối kỳ' }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await page.getByRole('button', { name: 'Mở xử lý' }).nth(0).click();
  await page.getByLabel('Giá ký gửi lại (VND)').fill('180000');
  await page.getByLabel('Độ dài kỳ mới').selectOption('30');
  await page.getByRole('button', { name: 'Chốt giá ký gửi lại' }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByText(/Đang chờ Member xác nhận/)).toBeVisible();
  await page.getByRole('button', { name: 'Mở xử lý' }).click();
  await page.getByLabel('Tên tổ chức đối tác nhận chuyển giao').fill('Đối tác thử');
  await page.getByRole('button', { name: 'Chuyển giao hàng vô thừa nhận' }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByText(/Đã chuyển giao thành công sản phẩm SKU/)).toBeVisible();
});
