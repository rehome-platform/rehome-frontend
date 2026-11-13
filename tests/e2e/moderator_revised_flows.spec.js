import { test, expect } from '@playwright/test';

function createModeratorToken() {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'mod-a', exp: 4102444800, roles: ['ROLE_MODERATOR'] }),
  ).toString('base64url');
  return `e30.${payload}.fixture`;
}

test.beforeEach(async ({ page }) => {
  const token = createModeratorToken();
  await page.addInitScript(
    ({ token }) => {
      window.__REHOME_API_MODE__ = true;
      localStorage.setItem('rehome_token', token);
      localStorage.setItem(
        'rehome_user',
        JSON.stringify({
          id: 'mod-a',
          accountId: 'mod-a',
          role: 'staff',
          email: 'moderator@example.test',
          warehouseId: 'wh-1',
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
        warehouseId: 'wh-1',
        warehouseName: 'Kho A',
      },
    }),
  );
  await page.route('**/members/me', (route) =>
    route.fulfill({ json: { accountId: 'mod-a', fullName: 'Moderator thử nghiệm' } }),
  );
  await page.route('**/api/notifications', (route) => route.fulfill({ json: [] }));
  await page.route('**/ws/**', (route) => route.fulfill({ status: 404 }));
  await page.route('**/warehouses/moderator*', (route) =>
    route.fulfill({ json: [{ id: 'wh-1', name: 'Kho A' }] }),
  );
});

test('Inventory & End-of-term have no shelf filter, column, or CHANGE_SHELF action', async ({
  page,
}) => {
  const inventoryItems = [
    {
      id: 'SKU-100',
      sku: 'SKU-100',
      name: 'Áo khoác denim',
      status: 'ON_SALE',
      currentPrice: 250000,
      categoryName: 'Áo khoác',
      brandName: 'Levi',
      size: 'M',
      photos: [{ url: 'https://example.test/p1.jpg' }],
    },
  ];

  await page.route('**/inventory*', (route) => {
    if (route.request().url().includes('/inventory/SKU-100')) {
      return route.fulfill({ json: inventoryItems[0] });
    }
    return route.fulfill({
      json: { content: inventoryItems, totalElements: 1, totalPages: 1 },
    });
  });
  await page.route('**/end-of-term-decisions/pending-pricing*', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/warehouses/*/degraded-cases*', (route) =>
    route.fulfill({ json: { content: [], totalElements: 0, totalPages: 0 } }),
  );

  await page.goto('/moderator/inventory');
  await expect(page.getByText('Áo khoác denim')).toBeVisible();
  await expect(page.getByText(/Vị trí kệ|CHANGE_SHELF|Đổi kệ/)).toHaveCount(0);

  await page.goto('/moderator/end-of-term');
  await expect(page.getByText(/Vị trí kệ|CHANGE_SHELF|Đổi kệ/)).toHaveCount(0);
});

test('ProductEditModal only allows editing name and photoUrls when ON_SALE and sends strictly { name, photoUrls }', async ({
  page,
}) => {
  const productDetail = {
    id: 'SKU-100',
    sku: 'SKU-100',
    name: 'Áo khoác denim',
    status: 'ON_SALE',
    currentPrice: 250000,
    categoryName: 'Áo khoác',
    brandName: 'Levi',
    size: 'M',
    conditionNote: 'Như mới (99%)',
    photos: ['https://example.test/p1.jpg'],
  };

  let capturedPutBody = null;

  await page.route('**/inventory/SKU-100*', (route) => {
    if (route.request().resourceType() === 'document') {
      return route.continue();
    }
    return route.fulfill({ json: productDetail });
  });
  await page.route('**/end-of-term-decisions/pending-pricing*', (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/products/SKU-100', async (route) => {
    if (route.request().method() === 'PUT') {
      capturedPutBody = route.request().postDataJSON();
      await route.fulfill({
        json: { ...productDetail, name: capturedPutBody.name, photos: capturedPutBody.photoUrls },
      });
      return;
    }
    await route.fulfill({ json: productDetail });
  });

  await page.goto('/moderator/inventory/SKU-100');
  await expect(page.getByText('Áo khoác denim')).toBeVisible();

  await page.getByRole('button', { name: 'Chỉnh sửa thông tin' }).click();
  await expect(page.locator('#edit-product-name')).toBeEnabled();
  await expect(page.locator('#edit-product-sku')).toBeDisabled();
  await expect(page.locator('#edit-product-status')).toBeDisabled();
  await expect(page.locator('#edit-product-price')).toBeDisabled();
  await expect(page.locator('#edit-product-category')).toBeDisabled();
  await expect(page.locator('#edit-product-brand')).toBeDisabled();
  await expect(page.locator('#edit-product-size')).toBeDisabled();

  await page.locator('#edit-product-name').fill('Áo khoác denim mới');

  const putPromise = page.waitForResponse(
    (res) => res.url().includes('/products/SKU-100') && res.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await putPromise;

  expect(Object.keys(capturedPutBody).sort()).toEqual(['name', 'photoUrls']);
  expect(capturedPutBody).toEqual({
    name: 'Áo khoác denim mới',
    photoUrls: ['https://example.test/p1.jpg'],
  });
});

test('StockInForm has no AI try-on slot or background-removal UI', async ({ page }) => {
  await page.route('**/moderator/consignment-forms/form-1*', (route) =>
    route.fulfill({
      json: {
        id: 'form-1',
        formId: 'form-1',
        status: 'INSPECTING',
        claimedBy: 'mod-a',
        resumeStep: 'STOCK_IN',
        receiptId: 'receipt-1',
        productName: 'Áo sơ mi trắng',
        size: 'M',
        memberId: 'mem-1',
        memberCode: 'MB-001',
        memberName: 'Nguyễn Văn A',
        warehouseId: 'wh-1',
      },
    }),
  );
  await page.route('**/consignment-receipts/receipt-1*', (route) =>
    route.fulfill({
      json: {
        id: 'receipt-1',
        receiptId: 'receipt-1',
        formId: 'form-1',
        status: 'CONFIRMED',
        confirmedAt: '2026-11-01T03:00:00Z',
        agreedPrice: 200000,
        termLengthDays: 30,
        productName: 'Áo sơ mi trắng',
      },
    }),
  );
  await page.route('**/categories*', (route) =>
    route.fulfill({ json: [{ id: 'cat-1', name: 'Áo sơ mi', hidden: false }] }),
  );
  await page.route('**/brands*', (route) =>
    route.fulfill({ json: [{ id: 'brand-1', name: 'Uniqlo', hidden: false }] }),
  );

  await page.goto('/moderator/consignments/form-1');
  await expect(page.getByText('Nhập thông tin sản phẩm và nhập kho')).toBeVisible();
  await expect(page.getByText(/Slot thử đồ AI|tryOnSlot|Xóa nền|Tách nền|removeBackground/i)).toHaveCount(0);
});

test('DonationsPage supports ACTIVE vs HISTORY tabs, blocks new donation on closed campaign, and requires both handover checkboxes', async ({
  page,
}) => {
  const activeCampaigns = [
    {
      id: 'camp-open',
      title: 'Chiến dịch Mùa Đông',
      status: 'OPEN',
      organizationId: 'org-1',
      organizationName: 'Quỹ Áo Ấm',
      pendingPickupCount: 0,
      handedOverCount: 2,
    },
  ];
  const historyCampaigns = [
    {
      id: 'camp-closed',
      title: 'Chiến dịch Đã Đóng',
      status: 'CLOSED',
      organizationId: 'org-1',
      organizationName: 'Quỹ Áo Ấm',
      pendingPickupCount: 1,
      handedOverCount: 3,
    },
  ];
  let donations = [
    {
      id: 'don-1',
      campaignId: 'camp-closed',
      organizationId: 'org-1',
      organizationName: 'Quỹ Áo Ấm',
      donorName: 'Trần Thị B',
      status: 'PENDING_PICKUP',
      source: 'DIRECT',
      note: '2 áo len',
      createdAt: '2026-11-01T10:00:00Z',
    },
  ];

  let handoverCalled = false;

  await page.route('**/warehouses/wh-1/campaigns*', (route) => {
    const url = new URL(route.request().url());
    const view = url.searchParams.get('view');
    const items = view === 'HISTORY' ? historyCampaigns : activeCampaigns;
    return route.fulfill({
      json: { items, page: 0, size: 20, totalElements: items.length, totalPages: 1 },
    });
  });

  await page.route('**/warehouses/wh-1/donations/handover*', async (route) => {
    if (route.request().method() === 'POST') {
      handoverCalled = true;
      donations = donations.map((d) => ({ ...d, status: 'HANDED_OVER' }));
      await route.fulfill({ json: { handedOverCount: 1 } });
      return;
    }
    await route.fallback();
  });

  await page.route('**/warehouses/wh-1/donations*', (route) =>
    route.fulfill({ json: donations }),
  );

  await page.goto('/moderator/donations');
  await expect(page.getByText('Chiến dịch Mùa Đông').first()).toBeVisible();

  // Switch to HISTORY tab
  await page.getByRole('tab', { name: /Lịch sử chiến dịch/ }).click();
  await expect(page.getByText('Chiến dịch Đã Đóng').first()).toBeVisible();
  await page.getByText('Chiến dịch Đã Đóng').first().click();

  // Closed campaign blocks new donation
  await expect(
    page.getByText(/Không thể ghi nhận lượt quyên góp mới cho chiến dịch này/),
  ).toBeVisible();

  // Handover of pending donation is still allowed and requires both confirmation checkboxes
  await page.locator('tbody input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: /Bàn giao cho tổ chức \(1\)/ }).click();

  const confirmBtn = page.getByRole('button', { name: 'Xác nhận bàn giao' });
  await expect(confirmBtn).toBeDisabled();

  const modalCheckboxes = page.getByRole('dialog').getByRole('checkbox');
  await modalCheckboxes.nth(0).check();
  await expect(confirmBtn).toBeDisabled();

  await modalCheckboxes.nth(1).check();
  await expect(confirmBtn).toBeEnabled();

  await confirmBtn.click();
  await expect.poll(() => handoverCalled).toBe(true);
});
