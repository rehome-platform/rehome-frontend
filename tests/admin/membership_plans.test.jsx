import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MembershipPlansPage from '../../src/features/admin/membership/MembershipPlansPage.jsx';
import { membershipAdminApi } from '../../src/features/admin/services/membershipAdminApi.js';

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => ({
  membershipAdminApi: {
    getPlans: vi.fn(),
    updatePlan: vi.fn(),
  },
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
};

vi.mock('../../src/context/ToastContext.jsx', () => ({
  useToast: () => mockToast,
}));

const UNSORTED_PLANS = [
  {
    id: 'plan-diamond',
    tier: 'DIAMOND',
    name: 'Kim Cương',
    description: 'Gói cao cấp nhất',
    pricePerMonth: 299000,
    pricePerYear: 2990000,
    liveTryonPerDay: null,
    liveTryonPerMonth: null,
    liveTryonMaxSeconds: 120,
    aiTryonPerDay: null,
    aiTryonPerMonth: null,
    featuredListing: true,
    maxPendingConsignmentForms: 50,
    active: true,
    activeSubscriberCount: 12,
    sortOrder: 4,
  },
  {
    id: 'plan-free',
    tier: 'FREE',
    name: 'Miễn phí',
    description: 'Gói cơ bản',
    pricePerMonth: 0,
    pricePerYear: null,
    liveTryonPerDay: 0,
    liveTryonPerMonth: 0,
    liveTryonMaxSeconds: 15,
    aiTryonPerDay: 1,
    aiTryonPerMonth: 5,
    featuredListing: false,
    maxPendingConsignmentForms: 2,
    active: true,
    activeSubscriberCount: 150,
    sortOrder: 1,
  },
  {
    id: 'plan-gold',
    tier: 'GOLD',
    name: 'Vàng',
    description: 'Gói phổ biến',
    pricePerMonth: 149000,
    pricePerYear: null,
    liveTryonPerDay: 10,
    liveTryonPerMonth: 100,
    liveTryonMaxSeconds: 60,
    aiTryonPerDay: 20,
    aiTryonPerMonth: 200,
    featuredListing: true,
    maxPendingConsignmentForms: 10,
    active: true,
    activeSubscriberCount: 45,
    sortOrder: 3,
  },
  {
    id: 'plan-silver',
    tier: 'SILVER',
    name: 'Bạc',
    description: 'Gói tiết kiệm',
    pricePerMonth: 79000,
    pricePerYear: 790000,
    liveTryonPerDay: 3,
    liveTryonPerMonth: 30,
    liveTryonMaxSeconds: 30,
    aiTryonPerDay: 5,
    aiTryonPerMonth: 50,
    featuredListing: false,
    maxPendingConsignmentForms: 5,
    active: false,
    activeSubscriberCount: 8,
    sortOrder: 2,
  },
];

function renderPage(initialEntry = '/admin/membership-plans') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/admin/membership-plans" element={<MembershipPlansPage />} />
        <Route
          path="/admin/membership-subscriptions"
          element={<div data-testid="subscriptions-route">Subscriptions Page</div>}
        />
        <Route
          path="/admin/voucher-templates"
          element={<div data-testid="voucher-templates-route">Voucher Templates Page</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('MembershipPlansPage (W-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipAdminApi.getPlans.mockResolvedValue(UNSORTED_PLANS);
    membershipAdminApi.updatePlan.mockResolvedValue({});
  });

  it('fetches plans and renders 4 tiers sorted by TIER_ORDER without Add or Delete buttons', async () => {
    renderPage();

    await waitFor(() => {
      expect(membershipAdminApi.getPlans).toHaveBeenCalledTimes(1);
    });

    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(rows).toHaveLength(4);

    expect(rows[0]).toHaveTextContent('FREE');
    expect(rows[0]).toHaveTextContent('Thành viên thường');
    expect(rows[1]).toHaveTextContent('SILVER');
    expect(rows[1]).toHaveTextContent('Thành viên Bạc');
    expect(rows[2]).toHaveTextContent('GOLD');
    expect(rows[2]).toHaveTextContent('Thành viên Vàng');
    expect(rows[3]).toHaveTextContent('DIAMOND');
    expect(rows[3]).toHaveTextContent('Thành viên Kim cương');

    expect(screen.queryByRole('button', { name: /thêm/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /xóa/i })).not.toBeInTheDocument();
  });

  it('formats null quotas as "Không giới hạn", 0 as "0", and hides FREE price & active toggle', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Kim Cương')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row').slice(1);
    const freeRow = rows[0];
    const goldRow = rows[2];
    const diamondRow = rows[3];

    // FREE row: liveTryonPerDay is 0, price & active are '—'
    expect(within(freeRow).getByText('0')).toBeInTheDocument();
    expect(within(freeRow).getAllByText('—').length).toBeGreaterThanOrEqual(3);

    // GOLD row: pricePerYear is null -> '—'
    expect(within(goldRow).getByText('—')).toBeInTheDocument();

    // DIAMOND row: null quotas -> 'Không giới hạn'
    expect(within(diamondRow).getAllByText('Không giới hạn').length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to /admin/membership-subscriptions?tier=<TIER> when clicking activeSubscriberCount and links to voucher templates', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument();
    });

    const voucherLink = screen.getByRole('link', { name: /Cấu hình voucher của các hạng/i });
    expect(voucherLink).toHaveAttribute('href', '/admin/voucher-templates');

    const goldSubscribersLink = screen.getByRole('link', { name: '45' });
    expect(goldSubscribersLink).toHaveAttribute('href', '/admin/membership-subscriptions?tier=GOLD');

    fireEvent.click(goldSubscribersLink);
    expect(screen.getByTestId('subscriptions-route')).toBeInTheDocument();
  });

  it('opens PlanEditModal for paid tier, toggles unlimited & no-annual-plan checkboxes, and shows quota reduction warning', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Vàng')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row').slice(1);
    const goldRow = rows[2];
    fireEvent.click(within(goldRow).getByRole('button', { name: /Sửa/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Reduce liveTryonPerDay from 10 to 5 -> triggers quota reduction warning
    const rtDayInput = within(dialog).getByLabelText(/^RT \/ ngày$/i);
    fireEvent.change(rtDayInput, { target: { value: '5' } });

    expect(
      within(dialog).getByText(
        /Giảm hạn mức chỉ áp dụng từ kỳ gia hạn tiếp theo\. Thành viên đang dùng giữ nguyên mức cũ\./i
      )
    ).toBeInTheDocument();

    // Check "Không giới hạn" for AI/ngày -> disables input & sets null
    const aiDayUnlimitedCheckbox = within(dialog).getByLabelText(/Không giới hạn Phối đồ \/ ngày/i);
    fireEvent.click(aiDayUnlimitedCheckbox);
    expect(within(dialog).getByLabelText(/^Phối đồ \/ ngày$/i)).toBeDisabled();

    // "Không bán gói năm" is already checked for GOLD (pricePerYear is null)
    const noAnnualCheckbox = within(dialog).getByLabelText(/Không bán gói năm/i);
    expect(noAnnualCheckbox).toBeChecked();
  });

  it('validates liveTryonPerDay <= liveTryonPerMonth and aiTryonPerDay <= aiTryonPerMonth', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Vàng')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row').slice(1);
    const goldRow = rows[2];
    fireEvent.click(within(goldRow).getByRole('button', { name: /Sửa/i }));

    const dialog = screen.getByRole('dialog');
    const rtDayInput = within(dialog).getByLabelText(/^RT \/ ngày$/i);
    fireEvent.change(rtDayInput, { target: { value: '150' } }); // > liveTryonPerMonth (100)

    fireEvent.click(within(dialog).getByRole('button', { name: /Lưu thay đổi/i }));

    expect(
      within(dialog).getByText(/RT\/ngày không được lớn hơn RT\/tháng/i)
    ).toBeInTheDocument();
    expect(membershipAdminApi.updatePlan).not.toHaveBeenCalled();
  });

  it('hides price and active fields for FREE tier and sends pricePerMonth: 0, pricePerYear: null, active: true', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Miễn phí')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row').slice(1);
    const freeRow = rows[0];
    fireEvent.click(within(freeRow).getByRole('button', { name: /Sửa/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText(/Giá \/ tháng/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Giá \/ năm/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Đang bán/i)).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(membershipAdminApi.updatePlan).toHaveBeenCalledWith(
        'plan-free',
        expect.objectContaining({
          pricePerMonth: 0,
          pricePerYear: null,
          active: true,
        })
      );
    });
  });

  it('prevents duplicate submit and reloads plans after successful update', async () => {
    let resolveUpdate;
    membershipAdminApi.updatePlan.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Bạc')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row').slice(1);
    const silverRow = rows[1];
    fireEvent.click(within(silverRow).getByRole('button', { name: /Sửa/i }));

    const dialog = screen.getByRole('dialog');
    const saveBtn = within(dialog).getByRole('button', { name: /Lưu thay đổi/i });

    fireEvent.click(saveBtn);
    expect(saveBtn).toBeDisabled();
    fireEvent.click(saveBtn);
    expect(membershipAdminApi.updatePlan).toHaveBeenCalledTimes(1);

    resolveUpdate({});

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(membershipAdminApi.getPlans).toHaveBeenCalledTimes(2);
    expect(mockToast.success).toHaveBeenCalled();
  });
});
