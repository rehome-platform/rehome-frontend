import { test, expect } from '@playwright/test';

// Dedicated, seeded integration environment only. Never substitute fixtures here.
const ready =
  process.env.PHASE2_INTEGRATION_URL &&
  process.env.PHASE2_TEST_EMAIL &&
  process.env.PHASE2_TEST_PASSWORD &&
  process.env.PHASE2_TEST_FORM_ID;
test('live Moderator form and Member receipt confirmation', async ({ page }) => {
  test.skip(
    !ready,
    'Blocked: requires approved Gate A/B contracts, dedicated API/mobile environment, account and seeded form.',
  );
  await page.goto('/login');
  await page.locator('#email-input').fill(process.env.PHASE2_TEST_EMAIL);
  await page.locator('#password-input').fill(process.env.PHASE2_TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/moderator\/counter/);
  await page.goto(`/moderator/consignments/${encodeURIComponent(process.env.PHASE2_TEST_FORM_ID)}`);
  await expect(page.getByText('Chế độ dữ liệu thử', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Blocked ·', { exact: false })).toHaveCount(0);
  await expect(page.getByText(/Member đã xác nhận:/)).toBeVisible({ timeout: 90000 });
  // The seeded form must already have a receipt; confirmation is performed by actual mobile.
});
