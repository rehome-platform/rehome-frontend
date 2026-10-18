import { test, expect } from '@playwright/test';

// Real Chrome/Edge rendering; authentication endpoints and Phase 2 data are mocked.
test.use({ viewport: { width: 390, height: 844 } });

async function session(page, role = 'staff') {
  const authority = role === 'admin' ? 'ROLE_ADMIN' : 'ROLE_MODERATOR';
  const token = `e30.${Buffer.from(JSON.stringify({ sub: 'mod-a', exp: 4102444800, roles: [authority] })).toString('base64url')}.fixture`;
  await page.addInitScript(({ role, token }) => {
    localStorage.setItem('rehome_token', token);
    localStorage.setItem('rehome_user', JSON.stringify({ id: 'mod-a', accountId: 'mod-a', role,
      email: 'staff@example.test', warehouseId: 'warehouse-a', warehouseName: 'Kho A' }));
  }, { role, token });
  await page.route('**/api/account/me', (route) => route.fulfill({ json: {
    email: 'staff@example.test', authorities: [authority], warehouseId: 'warehouse-a', warehouseName: 'Kho A',
  } }));
  await page.route('**/members/me', (route) => route.fulfill({ json: { accountId: 'mod-a', fullName: 'Staff' } }));
  await page.route('**/api/notifications', (route) => route.fulfill({ json: [] }));
  await page.route('**/ws/**', (route) => route.fulfill({ status: 404 }));
}
async function fits(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('mobile direct navigation and refresh preserve consignment and end-of-term controls', async ({ page, browser }, testInfo) => {
  testInfo.annotations.push({ type: 'browser-version', description: browser.version() });
  await session(page);
  await page.goto('/moderator/consignments/form-review');
  await expect(page.getByRole('heading', { name: 'Chi tiết ký gửi' })).toBeVisible();
  await page.getByRole('button', { name: 'Nhận việc', exact: true }).click();
  await page.getByLabel('Lý do từ chối').fill('Giữ nguyên nội dung nhập');
  await expect(page.getByRole('button', { name: 'Từ chối form' })).toBeEnabled();
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath('consignment-mobile.png'), fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Nhận việc', exact: true })).toBeVisible();
  await page.goto('/moderator/end-of-term?sku=TEST-SKU-3');
  await expect(page.getByRole('heading', { name: 'Xử lý TEST-SKU-3' })).toBeVisible();
  await page.getByLabel('Tên tổ chức đối tác nhận chuyển giao').fill('Đối tác thử');
  await page.getByRole('button', { name: 'Chuyển giao hàng vô thừa nhận' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Tên tổ chức đối tác nhận chuyển giao')).toHaveValue('Đối tác thử');
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath('end-of-term-mobile.png'), fullPage: true });
});

test('anonymous direct access and refresh retain the login guard', async ({ page }) => {
  await page.goto('/moderator/consignments/form-review');
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page.locator('#email-input')).toBeVisible();
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/login$/);
});

test('Moderator default, Admin denial and fallback redirects remain intact', async ({ page }) => {
  await session(page);
  for (const path of ['/', '/moderator', '/admin/users', '/unknown-route']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/moderator\/counter$/);
    await expect(page.getByRole('heading', { name: 'Quầy tiếp nhận' })).toBeVisible();
  }
});

test('Admin nested legacy redirect survives refresh', async ({ page }) => {
  await session(page, 'admin');
  await page.goto('/admin/system');
  await expect(page).toHaveURL(/\/admin\/users$/);
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'Tài khoản', exact: true })).toBeVisible();
});
