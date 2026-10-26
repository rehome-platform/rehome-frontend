import { test, expect } from '@playwright/test';

test('Phase 4 shows the unsupported moderator read without fixture details or shipments', async ({ page }) => {
  await page.addInitScript(() => {
    const encode = value => btoa(JSON.stringify(value));
    localStorage.setItem('rehome_token', `${encode({ alg: 'none' })}.${encode({ sub: 'mod-a', roles: ['ROLE_MODERATOR'], exp: Math.floor(Date.now() / 1000) + 3600 })}.test`);
    localStorage.setItem('rehome_user', JSON.stringify({ id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' }));
  });
  await page.route('**/api/account/me', route => route.fulfill({ json: { email: 'moderator@example.test', authorities: ['ROLE_MODERATOR'], warehouseId: 'warehouse-a' } }));
  await page.route('**/members/me', route => route.fulfill({ json: { accountId: 'mod-a', fullName: 'Moderator thử nghiệm' } }));
  await page.route('**/api/notifications', route => route.fulfill({ json: [] }));
  await page.route('**/ws/**', route => route.fulfill({ status: 404 }));
  await page.goto('/moderator/packing?orderId=order-test');
  await expect(page.getByText('Chưa thể xem chi tiết đơn hàng để đóng gói. Vui lòng liên hệ quản trị viên.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo vận đơn GHN', exact: true })).toHaveCount(0);
  await expect(page.getByText('Mô phỏng chụp ảnh kiện hàng')).toHaveCount(0);
  await page.getByRole('link', { name: /Quay lại hàng đợi$/ }).focus();
  await expect(page.getByRole('link', { name: /Quay lại hàng đợi$/ })).toBeFocused();
});
