import { test, expect } from '@playwright/test';

// Real service adapters with intercepted HTTP responses; no live backend account is used.
test('API mode uses authenticated routes and exposes failures without loading fixtures', async ({ page }) => {
  const token = `e30.${Buffer.from(JSON.stringify({
    sub: 'mod-api', roles: ['ROLE_MODERATOR'], exp: 4102444800,
  })).toString('base64url')}.test`;
  await page.addInitScript(({ token }) => {
    localStorage.setItem('rehome_token', token);
  }, { token });

  const requests = [];
  const fixtures = [];
  const unexpected = [];
  page.on('request', request => {
    if (request.url().includes('warehouseFixtures')) fixtures.push(request.url());
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.startsWith('/ws/')) return route.fulfill({ status: 404 });
    if (!['fetch', 'xhr'].includes(request.resourceType())) return route.continue();

    requests.push({ path, method: request.method(), query: url.searchParams,
      authorization: request.headers().authorization, body: request.postDataJSON() });
    if (path === '/api/account/me') return route.fulfill({ json: {
      id: 'mod-api', email: 'moderator@example.test', authorities: ['ROLE_MODERATOR'],
      warehouseId: 'warehouse-api', warehouseName: 'Kho API',
    } });
    if (path === '/notifications') return route.fulfill({ json: { result: [] } });
    if (path === '/counter/lookup') return route.fulfill({ status: 404,
      json: { code: 'MEMBER_NOT_FOUND', message: 'Không tìm thấy thành viên', result: null } });
    if (path === '/queues') return route.fulfill({ json: { result: [{
      id: 'queue-api-1', refId: 'order-api-1', type: 'PACKING', claimedBy: null,
      createdAt: '2026-10-26T09:00:00Z',
    }] } });
    if (path === '/consignment-forms/form-api-403') return route.fulfill({ status: 403,
      json: { code: 'FORBIDDEN', message: 'Không có quyền đọc form', result: null } });
    unexpected.push(path);
    return route.fulfill({ status: 500, json: { message: `Unexpected API route ${path}` } });
  });

  await page.goto('/moderator/counter');
  await expect(page.getByText('Chế độ dữ liệu thử', { exact: false })).toHaveCount(0);
  await page.getByLabel('Mã Member', { exact: true }).fill('MB-NOT-FOUND');
  await page.getByRole('button', { name: 'Tra cứu', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Không tìm thấy dữ liệu.');
  await expect(page.getByRole('button', { name: /^Chọn Member/ })).toHaveCount(0);
  expect(requests.find(request => request.path === '/counter/lookup')).toMatchObject({
    method: 'POST', authorization: `Bearer ${token}`, body: { memberCode: 'MB-NOT-FOUND' },
  });

  await page.goto('/moderator/queue?type=PACKING');
  await expect(page.getByRole('row').filter({ hasText: 'order-api-1' })).toBeVisible();
  const queue = requests.find(request => request.path === '/queues');
  expect(queue.method).toBe('GET');
  expect(queue.query.get('type')).toBe('PACKING');
  expect(queue.authorization).toBe(`Bearer ${token}`);

  await page.goto('/moderator/consignments/form-api-403');
  await expect(page.getByRole('alert')).toContainText('Bạn không có quyền truy cập dữ liệu của kho này.');

  await page.goto('/moderator/packing?orderId=order-api-1');
  await expect(page.getByRole('alert')).toContainText('Chưa thể xem chi tiết đơn hàng để đóng gói.');
  await expect(page.getByRole('button', { name: 'Tạo vận đơn GHN', exact: true })).toHaveCount(0);
  expect(fixtures).toEqual([]);
  expect(unexpected).toEqual([]);
});
