import { test, expect } from '@playwright/test';

function createAdminToken() {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'admin-1', exp: 4102444800, roles: ['ROLE_ADMIN'] }),
  ).toString('base64url');
  return `e30.${payload}.fixture`;
}

test.beforeEach(async ({ page }) => {
  const token = createAdminToken();
  await page.addInitScript(
    ({ token }) => {
      localStorage.setItem('rehome_token', token);
      localStorage.setItem(
        'rehome_user',
        JSON.stringify({
          id: 'admin-1',
          accountId: 'admin-1',
          role: 'admin',
          email: 'admin@example.test',
        }),
      );
      localStorage.removeItem('rehome_admin_estimated_ai_cost');
    },
    { token },
  );

  await page.route('**/api/account/me', (route) =>
    route.fulfill({
      json: {
        email: 'admin@example.test',
        authorities: ['ROLE_ADMIN'],
      },
    }),
  );
  await page.route('**/api/notifications', (route) => route.fulfill({ json: [] }));
  await page.route('**/ws/**', (route) => route.fulfill({ status: 404 }));
});

test('W-01: MembershipPlansPage shows 4 tiers, FREE has no price/active toggle, null is Không giới hạn, edit persists on reload', async ({
  page,
}) => {
  let plansState = [
    {
      id: 'plan-free',
      tier: 'FREE',
      name: 'Gói Miễn Phí',
      description: 'Gói mặc định',
      pricePerMonth: 0,
      pricePerYear: null,
      liveTryonPerDay: 2,
      liveTryonPerMonth: 20,
      liveTryonMaxSeconds: 15,
      aiTryonPerDay: 3,
      aiTryonPerMonth: 30,
      featuredListing: false,
      maxPendingConsignmentForms: 2,
      active: true,
      sortOrder: 1,
      activeSubscriberCount: 120,
    },
    {
      id: 'plan-silver',
      tier: 'SILVER',
      name: 'Gói Bạc',
      description: 'Gói cơ bản',
      pricePerMonth: 49000,
      pricePerYear: 490000,
      liveTryonPerDay: 10,
      liveTryonPerMonth: 100,
      liveTryonMaxSeconds: 30,
      aiTryonPerDay: 15,
      aiTryonPerMonth: 150,
      featuredListing: false,
      maxPendingConsignmentForms: 5,
      active: true,
      sortOrder: 2,
      activeSubscriberCount: 34,
    },
    {
      id: 'plan-gold',
      tier: 'GOLD',
      name: 'Gói Vàng',
      description: 'Gói nâng cao',
      pricePerMonth: 99000,
      pricePerYear: 990000,
      liveTryonPerDay: 25,
      liveTryonPerMonth: 300,
      liveTryonMaxSeconds: 60,
      aiTryonPerDay: 30,
      aiTryonPerMonth: 400,
      featuredListing: true,
      maxPendingConsignmentForms: 10,
      active: true,
      sortOrder: 3,
      activeSubscriberCount: 18,
    },
    {
      id: 'plan-diamond',
      tier: 'DIAMOND',
      name: 'Gói Kim Cương',
      description: 'Không giới hạn quyền lợi',
      pricePerMonth: 199000,
      pricePerYear: 1990000,
      liveTryonPerDay: null,
      liveTryonPerMonth: null,
      liveTryonMaxSeconds: 120,
      aiTryonPerDay: null,
      aiTryonPerMonth: null,
      featuredListing: true,
      maxPendingConsignmentForms: 20,
      active: true,
      sortOrder: 4,
      activeSubscriberCount: 7,
    },
  ];

  await page.route('**/api/admin/membership-plans', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { result: plansState } });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/admin/membership-plans/*', async (route) => {
    if (route.request().method() === 'PUT') {
      const id = route.request().url().split('/').pop();
      const body = route.request().postDataJSON();
      plansState = plansState.map((p) => (p.id === id ? { ...p, ...body } : p));
      const updated = plansState.find((p) => p.id === id);
      await route.fulfill({ json: { result: updated } });
      return;
    }
    await route.fallback();
  });

  await page.goto('/admin/membership-plans');

  await expect(page.getByText('Gói Miễn Phí')).toBeVisible();
  await expect(page.getByText('Gói Bạc')).toBeVisible();
  await expect(page.getByText('Gói Vàng')).toBeVisible();
  await expect(page.getByText('Gói Kim Cương')).toBeVisible();
  await expect(page.getByText('Không giới hạn').first()).toBeVisible();

  // FREE plan modal should not have price inputs or active toggle
  await page.getByRole('button', { name: 'Sửa gói FREE' }).click();
  await expect(page.locator('#plan-price-month')).toHaveCount(0);
  await expect(page.locator('#plan-price-year')).toHaveCount(0);
  await expect(page.getByRole('dialog').getByText('Đang bán')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();

  // Edit SILVER plan and verify persistence after reload
  await page.getByRole('button', { name: 'Sửa gói SILVER' }).click();
  await page.locator('#plan-name').fill('Gói Bạc Nâng Cấp');
  await page.locator('#plan-price-month').fill('59000');

  const updatePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/api/admin/membership-plans/plan-silver') &&
      res.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await updatePromise;

  await expect(page.getByText('Gói Bạc Nâng Cấp')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Gói Bạc Nâng Cấp')).toBeVisible();
});

test('W-02 & W-03: Subscriptions filter syncs to URL, detail shows effectiveLimits, Grant/Cancel validation', async ({
  page,
}) => {
  const subscriptions = [
    {
      id: 'sub-1',
      memberId: 'mem-1',
      memberName: 'Nguyễn Văn An',
      memberEmail: 'an@example.test',
      memberCode: 'MB-101',
      tier: 'GOLD',
      tierName: 'Gói Vàng',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      pricePaid: 99000,
      startedAt: '2026-11-01T00:00:00Z',
      expiresAt: '2026-12-01T00:00:00Z',
      daysRemaining: 18,
      grantedByAdmin: false,
    },
  ];

  const subscriptionDetail = {
    ...subscriptions[0],
    effectiveLimits: {
      liveTryonDailyLimit: 25,
      aiTryonDailyLimit: null,
      maxPendingConsignmentForms: 10,
    },
    quotaUsage: {
      liveTryonUsedToday: 3,
      liveTryonUsedThisMonth: 12,
      aiTryonUsedToday: 1,
      aiTryonUsedThisMonth: 8,
    },
    payments: [],
    vouchers: [],
  };

  await page.route('**/api/admin/membership-subscriptions?*', (route) =>
    route.fulfill({
      json: {
        result: {
          content: subscriptions,
          totalElements: subscriptions.length,
          totalPages: 1,
        },
      },
    }),
  );

  await page.route('**/api/admin/membership-subscriptions/sub-1', (route) =>
    route.fulfill({ json: { result: subscriptionDetail } }),
  );

  await page.goto('/admin/membership-subscriptions');
  await expect(page.getByText('Nguyễn Văn An')).toBeVisible();

  // Filter syncs to URL
  await page.getByLabel('Lọc theo hạng').selectOption('GOLD');
  await expect(page).toHaveURL(/tier=GOLD/);
  await page.getByLabel('Lọc theo trạng thái').selectOption('ACTIVE');
  await expect(page).toHaveURL(/status=ACTIVE/);

  // Test Grant validation on list page (no member selected)
  await page.getByRole('button', { name: 'Tặng / gia hạn gói' }).click();
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByText('Vui lòng chọn thành viên.')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();

  // Navigate to detail page
  await page.getByText('Nguyễn Văn An').click();
  await expect(page).toHaveURL(/\/admin\/membership-subscriptions\/sub-1$/);

  // Verify effectiveLimits
  await expect(page.getByText('2a. Snapshot hạn mức gói')).toBeVisible();
  await expect(page.getByText('Live try-on / ngày')).toBeVisible();
  await expect(page.getByText('AI try-on / ngày')).toBeVisible();
  await expect(page.getByText('Không giới hạn')).toBeVisible();

  // Test Grant validation with pre-filled member (invalid months & missing reason)
  await page.getByRole('button', { name: 'Gia hạn / tặng thêm' }).click();
  await page.getByLabel(/Số tháng/).fill('0');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByText('Số tháng phải là số nguyên từ 1 đến 24.')).toBeVisible();

  await page.getByLabel(/Số tháng/).fill('3');
  await page.getByRole('dialog').locator('button[type="submit"]').click();
  await expect(page.getByText('Vui lòng nhập lý do tặng / gia hạn.')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();

  // Test Cancel validation (requires reason AND confirmation checkbox)
  await page.getByRole('button', { name: 'Hủy gói' }).click();
  const confirmCancelBtn = page.getByRole('button', { name: 'Xác nhận hủy gói' });
  await expect(confirmCancelBtn).toBeDisabled();

  await page.locator('#cancel-reason').fill('Thành viên yêu cầu hủy');
  await expect(confirmCancelBtn).toBeDisabled();

  await page.getByRole('dialog').getByRole('checkbox').check();
  await expect(confirmCancelBtn).toBeEnabled();
});

test('W-04: VoucherTemplatesPage locks PERCENT for ORDER_DISCOUNT, converts 10% <-> 0.1, deactivates without delete', async ({
  page,
}) => {
  let templatesState = [
    {
      id: 'vt-1',
      name: 'Giảm 10% đơn hàng',
      description: 'Áp dụng đơn từ 200k',
      type: 'ORDER_DISCOUNT',
      discountKind: 'PERCENT',
      discountValue: 0.1,
      maxDiscountAmount: 50000,
      minOrderAmount: 200000,
      validDays: 30,
      active: true,
      tierRules: [{ tier: 'GOLD', quantityPerMonth: 2 }],
    },
  ];

  let capturedPostPayload = null;

  await page.route('**/api/admin/voucher-templates', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ json: { result: templatesState } });
      return;
    }
    if (method === 'POST') {
      capturedPostPayload = route.request().postDataJSON();
      const created = { id: 'vt-2', ...capturedPostPayload };
      templatesState = [...templatesState, created];
      await route.fulfill({ json: { result: created } });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/admin/voucher-templates/*/deactivate', async (route) => {
    if (route.request().method() === 'POST') {
      const parts = route.request().url().split('/');
      const id = parts[parts.length - 2];
      templatesState = templatesState.map((t) => (t.id === id ? { ...t, active: false } : t));
      await route.fulfill({ json: { result: templatesState.find((t) => t.id === id) } });
      return;
    }
    await route.fallback();
  });

  await page.goto('/admin/voucher-templates');
  await expect(page.getByText('Giảm 10% đơn hàng')).toBeVisible();
  await expect(page.getByText('10% (tối đa 50.000đ)')).toBeVisible();

  // Verify edit loads 0.1 as 10 in input
  await page.getByRole('button', { name: 'Sửa' }).first().click();
  await expect(page.locator('#voucher-discount-kind')).toBeDisabled();
  await expect(page.locator('#voucher-discount-kind')).toHaveValue('PERCENT');
  await expect(page.locator('#voucher-discount-value')).toHaveValue('10');
  await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click();

  // Create new ORDER_DISCOUNT template with 10% -> sends 0.1
  await page.getByRole('button', { name: 'Tạo mẫu voucher' }).click();
  await page.locator('#voucher-name').fill('Voucher Vàng 10%');
  await page.locator('#voucher-type').selectOption('ORDER_DISCOUNT');
  await expect(page.locator('#voucher-discount-kind')).toBeDisabled();
  await expect(page.locator('#voucher-discount-kind')).toHaveValue('PERCENT');

  await page.locator('#voucher-discount-value').fill('10');
  await page.locator('#voucher-max-discount').fill('40000');
  await page.locator('#tier-check-SILVER').check();

  const postPromise = page.waitForResponse(
    (res) => res.url().endsWith('/api/admin/voucher-templates') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Lưu mẫu voucher' }).click();
  await postPromise;

  expect(capturedPostPayload.discountKind).toBe('PERCENT');
  expect(capturedPostPayload.discountValue).toBe(0.1);

  // Deactivate without delete button
  await expect(page.getByRole('button', { name: /Xóa/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ngừng phát' }).first().click();
  await expect(
    page.getByText('Ngừng phát chỉ dừng cấp mã mới; các voucher đã phát cho thành viên vẫn giữ hiệu lực.'),
  ).toBeVisible();

  const deactivatePromise = page.waitForResponse(
    (res) => res.url().includes('/deactivate') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Xác nhận ngừng phát' }).click();
  await deactivatePromise;

  await expect(page.getByText('Ngừng phát').first()).toBeVisible();
});

test('W-05: MembershipStatsPage shows Chưa đủ dữ liệu tính for blank AI cost, and MembershipPaymentsPage filters work', async ({
  page,
}) => {
  await page.route('**/api/admin/membership-stats?*', (route) =>
    route.fulfill({
      json: {
        result: {
          totalRevenue: 5000000,
          activeSubscribers: 42,
          revenueByTier: [{ tier: 'GOLD', revenue: 3000000, count: 30 }],
          revenueByMonth: [{ month: '2026-11', revenue: 5000000 }],
        },
      },
    }),
  );

  await page.route('**/api/admin/voucher-stats?*', (route) =>
    route.fulfill({
      json: {
        result: {
          totalIssued: 100,
          totalUsed: 40,
          totalDiscountAmount: 1200000,
        },
      },
    }),
  );

  await page.goto('/admin/membership-stats');
  await expect(page.getByText('Chưa đủ dữ liệu tính')).toBeVisible();

  const paymentCalls = [];
  await page.route('**/api/admin/membership-payments?*', (route) => {
    const url = new URL(route.request().url());
    paymentCalls.push(Object.fromEntries(url.searchParams.entries()));
    const tierParam = url.searchParams.get('tier');
    const items =
      tierParam === 'DIAMOND'
        ? [
            {
              id: 'pay-2',
              memberName: 'Trần Kim Cương',
              memberEmail: 'kc@example.test',
              tier: 'DIAMOND',
              amount: 199000,
              method: 'MOMO',
              status: 'PAID',
              paidAt: '2026-11-10T10:00:00Z',
            },
          ]
        : [
            {
              id: 'pay-1',
              memberName: 'Lê Bạc',
              memberEmail: 'bac@example.test',
              tier: 'SILVER',
              amount: 49000,
              method: 'VNPAY',
              status: 'PAID',
              paidAt: '2026-11-09T10:00:00Z',
            },
          ];
    route.fulfill({
      json: {
        result: {
          content: items,
          totalElements: items.length,
          totalPages: 1,
        },
      },
    });
  });

  await page.goto('/admin/membership-payments');
  await expect(page.getByText('Lê Bạc')).toBeVisible();

  await page.locator('#pay-tier').selectOption('DIAMOND');
  await expect(page.getByText('Trần Kim Cương')).toBeVisible();

  await page.locator('#pay-method').selectOption('MOMO');
  await expect(
    paymentCalls.some((c) => c.tier === 'DIAMOND' && c.method === 'MOMO'),
  ).toBe(true);
});
