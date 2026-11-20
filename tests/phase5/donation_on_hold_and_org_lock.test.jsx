import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const {
  mockToast,
  mockDonationService,
  mockAdminApi,
  mockViolationReportService,
} = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  mockDonationService: {
    myWarehouses: vi.fn(),
    warehouseCampaigns: vi.fn(),
    listDonations: vi.fn(),
    recordDonation: vi.fn(),
    handoverDonations: vi.fn(),
    reassignDonations: vi.fn(),
  },
  mockAdminApi: {
    getBanPreview: vi.fn(),
    banAccount: vi.fn(),
    unbanAccount: vi.fn(),
  },
  mockViolationReportService: {
    list: vi.fn(),
    getDetail: vi.fn(),
    resolveReport: vi.fn(),
    dismissReport: vi.fn(),
  },
}));

vi.mock('../../src/context/ToastContext.jsx', () => ({
  useToast: () => mockToast,
}));

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', role: 'MODERATOR', warehouseId: 'wh-1', fullName: 'Mod A' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../src/features/moderator/services/donationApi.js', () => ({
  CAMPAIGN_STATUS_LABELS: { OPEN: 'Đang diễn ra', ACTIVE: 'Đang diễn ra' },
  isCampaignActive: (c) => Boolean(c && c.status === 'OPEN' && !c.organizationLocked),
  donationService: mockDonationService,
}));

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: mockAdminApi,
}));

vi.mock('../../src/features/moderator/services/violationReportApi.js', () => ({
  violationReportService: mockViolationReportService,
}));

vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

import DonationsPage from '../../src/features/moderator/pages/DonationsPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import AdminAccountsView from '../../src/features/admin/components/AdminAccountsView.jsx';
import ViolationReportsPage from '../../src/features/moderator/pages/ViolationReportsPage.jsx';

describe('Donation ON_HOLD & Org Lock Review Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ON_HOLD tab sorted oldest-first without handover button and reassigns to active campaign', async () => {
    mockDonationService.myWarehouses.mockResolvedValue([{ id: 'wh-1', name: 'Kho Q1' }]);
    mockDonationService.warehouseCampaigns.mockResolvedValue({
      items: [
        { id: 'camp-new', title: 'Chiến dịch Mùa Đông', organizationName: 'Tổ chức B', status: 'OPEN' },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
    mockDonationService.listDonations.mockImplementation(async (_wh, params = {}) => {
      if (params.status === 'ON_HOLD') {
        return [
          {
            id: 'don-newer',
            status: 'ON_HOLD',
            heldAt: '2026-11-15T10:00:00Z',
            holdReason: 'Chiến dịch tạm ẩn',
            campaignId: 'camp-old-2',
            campaignTitle: 'Chiến dịch Cũ 2',
            organizationName: 'Org 2',
            note: 'Túi đồ ![Hiện vật 1](https://example.com/bag.jpg)',
          },
          {
            id: 'don-oldest',
            status: 'ON_HOLD',
            heldAt: '2026-11-10T08:00:00Z',
            holdReason: 'Tổ chức đã bị khoá',
            campaignId: 'camp-old-1',
            campaignTitle: 'Chiến dịch Cũ 1',
            organizationName: 'Org 1',
            isConsignedItem: true,
            sku: 'SKU-101',
            productName: 'Áo khoác len',
            productPhotoUrl: 'https://example.com/coat.jpg',
          },
        ];
      }
      return [];
    });
    mockDonationService.reassignDonations.mockResolvedValue({ reassignedCount: 1 });

    render(
      <MemoryRouter initialEntries={['/moderator/donations?tab=ON_HOLD']}>
        <Phase2Provider>
          <DonationsPage />
        </Phase2Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Chiến dịch Cũ 1')).toBeInTheDocument();
    });

    // Oldest heldAt row appears before newer row
    const rows = screen.getAllByRole('row');
    const rowTexts = rows.map((r) => r.textContent);
    const oldestIdx = rowTexts.findIndex((t) => t.includes('Chiến dịch Cũ 1'));
    const newerIdx = rowTexts.findIndex((t) => t.includes('Chiến dịch Cũ 2'));
    expect(oldestIdx).toBeGreaterThan(0);
    expect(oldestIdx).toBeLessThan(newerIdx);

    // Handover button does not exist in ON_HOLD tab
    expect(screen.queryByText(/Bàn giao cho tổ chức/i)).not.toBeInTheDocument();

    // Select oldest donation and open reassign modal
    fireEvent.click(screen.getByLabelText('Chọn lượt tạm giữ don-oldest'));
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang chiến dịch/i }));

    await waitFor(() => {
      expect(screen.getByText('Chiến dịch Mùa Đông')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển/i }));

    await waitFor(() => {
      expect(mockDonationService.reassignDonations).toHaveBeenCalledWith('wh-1', {
        donationIds: ['don-oldest'],
        campaignId: 'camp-new',
      });
    });
  });

  it('shows empty campaign message in reassign modal when no active campaigns exist', async () => {
    mockDonationService.myWarehouses.mockResolvedValue([{ id: 'wh-1', name: 'Kho Q1' }]);
    mockDonationService.warehouseCampaigns.mockResolvedValue({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    mockDonationService.listDonations.mockImplementation(async (_wh, params = {}) => {
      if (params.status === 'ON_HOLD') {
        return [
          {
            id: 'don-1',
            status: 'ON_HOLD',
            heldAt: '2026-11-10T08:00:00Z',
            holdReason: 'Tổ chức đã bị khoá',
            campaignId: 'camp-old',
            campaignTitle: 'Chiến dịch Cũ',
          },
        ];
      }
      return [];
    });

    render(
      <MemoryRouter initialEntries={['/moderator/donations?tab=ON_HOLD']}>
        <Phase2Provider>
          <DonationsPage />
        </Phase2Provider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn lượt tạm giữ don-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Chọn lượt tạm giữ don-1'));
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang chiến dịch/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Chưa có chiến dịch nào phù hợp.*vẫn được tạm giữ/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Xác nhận chuyển/i })).toBeDisabled();
  });

  it('shows pending report and donation counts in Admin organization lock modal', async () => {
    mockAdminApi.getBanPreview.mockResolvedValue({
      pendingReportCount: 3,
      pendingPickupDonationCount: 5,
    });

    const orgAccount = {
      id: 'org-1',
      name: 'Quỹ Từ Thiện ABC',
      email: 'abc@org.vn',
      phone: '0901234567',
      role: 'ORGANIZATION',
      status: 'ACTIVE',
      initials: 'QT',
      joined: '01/11/2026',
    };

    render(
      <AdminAccountsView
        remoteAccounts={[orgAccount]}
        onBanAccount={vi.fn()}
        onUnbanAccount={vi.fn()}
      />,
    );

    // Open row action menu and click Khóa tài khoản
    const actionButtons = screen.getAllByRole('button');
    const menuBtn = actionButtons.find((b) => b.textContent.includes('more_vert') || b.getAttribute('title') === 'Thao tác');
    if (menuBtn) {
      fireEvent.click(menuBtn);
    }
    const lockBtn = await screen.findByText(/Khóa tài khoản/i);
    fireEvent.click(lockBtn);

    await waitFor(() => {
      expect(mockAdminApi.getBanPreview).toHaveBeenCalledWith('org-1');
      expect(screen.getByText(/Sẽ tự đóng/i)).toBeInTheDocument();
      expect(screen.getByText(/báo cáo đang chờ và tạm giữ/i)).toBeInTheDocument();
    });
  });

  it('shows auto-closed reason "Tổ chức đã bị khoá" on ViolationReportsPage', async () => {
    mockViolationReportService.list.mockResolvedValue({
      data: [
        {
          id: 'rep-1',
          targetType: 'CAMPAIGN',
          targetId: 'camp-99',
          reportCount: 2,
          sampleReason: 'Nghi vấn minh bạch',
          status: 'RESOLVED',
          resolutionReason: 'Tổ chức đã bị khoá',
          latestReportedAt: '2026-11-16T10:00:00Z',
        },
      ],
    });
    mockViolationReportService.getDetail.mockResolvedValue({
      id: 'rep-1',
      targetType: 'CAMPAIGN',
      targetId: 'camp-99',
      status: 'RESOLVED',
      resolutionReason: 'Tổ chức đã bị khoá',
      reason: 'Nghi vấn minh bạch',
    });

    render(
      <MemoryRouter>
        <ViolationReportsPage />
      </MemoryRouter>,
    );

    const detailBtn = await screen.findByRole('button', { name: 'Chi tiết' });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Tổ chức đã bị khoá/i).length).toBeGreaterThan(0);
    });
  });
});
