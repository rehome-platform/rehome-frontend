import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReceiptPanel from '../../src/features/moderator/components/ReceiptPanel.jsx';
import DonationsPage from '../../src/features/moderator/pages/DonationsPage.jsx';
import Footer from '../../src/components/footer.jsx';
import MembershipPlansPage from '../../src/features/admin/membership/MembershipPlansPage.jsx';
import MembershipSubscriptionsPage from '../../src/features/admin/membership/MembershipSubscriptionsPage.jsx';
import VoucherTemplateModal from '../../src/features/admin/membership/VoucherTemplateModal.jsx';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import { consignmentService } from '../../src/features/moderator/services/warehouseApi.js';
import { donationService } from '../../src/features/moderator/services/donationApi.js';
import membershipAdminApiDefault, { membershipAdminApi } from '../../src/features/admin/services/membershipAdminApi.js';
import {
  MEMBERSHIP_PAYMENT_METHODS,
  VALID_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  MEMBERSHIP_PAYMENT_METHOD_LABELS,
  VOUCHER_TYPE_LABELS,
} from '../../src/features/admin/membership/membershipConstants.js';
import { API_ENDPOINTS } from '../../src/configs/api.config.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-01', accountId: 'mod-01', warehouseId: 'wh-main', role: 'MODERATOR' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => {
  const api = {
    getPlans: vi.fn().mockResolvedValue([]),
    updatePlan: vi.fn(),
    getSubscriptions: vi.fn().mockResolvedValue({ content: [], totalPages: 1, totalElements: 0 }),
    cancelSubscription: vi.fn(),
  };
  return {
    default: api,
    membershipAdminApi: api,
  };
});

vi.mock('../../src/features/moderator/services/warehouseApi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    consignmentService: {
      ...actual.consignmentService,
      receipt: vi.fn(),
      updateReceipt: vi.fn(),
      voidReceipt: vi.fn(),
      pdf: vi.fn(),
    },
  };
});

vi.mock('../../src/features/moderator/services/donationApi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    donationService: {
      ...actual.donationService,
      myWarehouses: vi.fn(),
      warehouseCampaigns: vi.fn(),
      listDonations: vi.fn(),
      recordDonation: vi.fn(),
      handoverDonations: vi.fn(),
      reassignDonations: vi.fn(),
      unhideCampaign: vi.fn(),
    },
  };
});

function renderWithProviders(ui, initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Phase2Provider>{ui}</Phase2Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Web Updates (18/11): Receipt Edit/Void, Unhide Campaign, ON_HOLD Reassign, Donation Photos, MoMo Removal & W-01/W-04', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('5 & 6: removes MOMO from membership constants, api.config, Footer, and updates W-01 / W-04 texts', async () => {
    expect(MEMBERSHIP_PAYMENT_METHODS).toEqual(['WALLET', 'VNPAY']);
    expect(VALID_PAYMENT_METHODS).toEqual(['WALLET', 'VNPAY']);
    expect(PAYMENT_METHOD_LABELS.MOMO).toBeUndefined();
    expect(MEMBERSHIP_PAYMENT_METHOD_LABELS.MOMO).toBeUndefined();
    expect(VOUCHER_TYPE_LABELS.SHIPPING).toBe('Giảm phí vận chuyển');
    expect(API_ENDPOINTS.MOMO).toBeUndefined();
    expect(API_ENDPOINTS.MODERATOR.UNHIDE_CAMPAIGN('c-1')).toBe('/campaigns/c-1/unhide');

    const { unmount } = renderWithProviders(<Footer />);
    expect(screen.getByText('Sandbox VNPay & GHN')).toBeInTheDocument();
    expect(screen.queryByText(/Sandbox MoMo/i)).not.toBeInTheDocument();
    unmount();

    membershipAdminApi.getPlans.mockResolvedValueOnce([]);
    const { unmount: unmountPlans } = renderWithProviders(<MembershipPlansPage />);
    expect(await screen.findByText(/hạng cao hơn được xếp trên/i)).toBeInTheDocument();
    unmountPlans();

    renderWithProviders(<VoucherTemplateModal isOpen onClose={() => {}} />);
    expect(screen.getByText(/áp một lần cho cả lần thanh toán/i)).toBeInTheDocument();
  });

  it('1a: shows Edit button for PENDING receipt, recalculates floorPrice, and handles 409 RECEIPT_NOT_EDITABLE', async () => {
    consignmentService.receipt.mockResolvedValue({
      id: 'rec-1',
      receiptNo: 'KG-2026-0001',
      status: 'PENDING',
      agreedPrice: 300000,
      floorPrice: 150000,
      conditionNote: 'Còn mới',
      moderatorNote: 'Áo đẹp',
      commissionRateTerm1: 0.1,
      commissionRateTerm2: 0.15,
      commissionRateTerm3: 0.2,
      termLengthDays: 30,
      editedAt: '2026-11-18T10:00:00Z',
      editReason: 'Điều chỉnh giá theo thị trường',
    });
    consignmentService.updateReceipt.mockRejectedValue({
      response: { status: 409, data: { code: 'RECEIPT_NOT_EDITABLE', message: 'not editable' } },
    });

    renderWithProviders(<ReceiptPanel receiptId="rec-1" />);

    expect(await screen.findByText(/Đã sửa lúc/i)).toBeInTheDocument();
    expect(screen.getByText(/Điều chỉnh giá theo thị trường/i)).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: 'Sửa biên nhận' });
    expect(editBtn).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Huỷ biên nhận' })).not.toBeInTheDocument();

    fireEvent.click(editBtn);
    const priceInput = screen.getByLabelText(/Giá chốt/i);
    fireEvent.change(priceInput, { target: { value: '350000' } });
    expect(priceInput.checkValidity()).toBe(true);
    expect(screen.getByText(/175\.000/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Lý do sửa biên nhận/i), { target: { value: 'Giảm giá chút' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Lưu thay đổi' }).closest('form'));

    expect(await screen.findByText('Biên nhận đã được xác nhận, không sửa được nữa')).toBeInTheDocument();
  });

  it('1b: shows Void button for CONFIRMED receipt without SKU, handles 409 RECEIPT_HAS_PRODUCT, and calls onReceiptVoided with receipt data on success', async () => {
    const receiptData = {
      id: 'rec-2',
      receiptNo: 'KG-2026-0002',
      status: 'CONFIRMED',
      confirmedAt: '2026-11-18T10:00:00Z',
      agreedPrice: 300000,
      floorPrice: 150000,
      commissionRateTerm1: 0.1,
      commissionRateTerm2: 0.15,
      commissionRateTerm3: 0.2,
      termLengthDays: 30,
      productSku: null,
    };
    consignmentService.receipt.mockResolvedValue(receiptData);
    consignmentService.voidReceipt
      .mockRejectedValueOnce({
        response: { status: 409, data: { code: 'RECEIPT_HAS_PRODUCT', message: 'has product' } },
      })
      .mockResolvedValueOnce({ ...receiptData, status: 'VOIDED' });

    const onReceiptVoided = vi.fn();
    renderWithProviders(<ReceiptPanel receiptId="rec-2" onReceiptVoided={onReceiptVoided} />);

    const voidBtn = await screen.findByRole('button', { name: 'Huỷ biên nhận' });
    expect(screen.queryByRole('button', { name: 'Sửa biên nhận' })).not.toBeInTheDocument();

    fireEvent.click(voidBtn);
    expect(screen.getByText(/Member sẽ phải xác nhận lại biên nhận mới/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Lý do huỷ biên nhận/i), { target: { value: 'Nhập nhầm giá' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận huỷ biên nhận' }));

    expect(await screen.findByText('Món đã nhập kho, không huỷ được')).toBeInTheDocument();

    // Second attempt succeeds and invokes onReceiptVoided so parent form returns to inspection step
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận huỷ biên nhận' }));
    await waitFor(() => {
      expect(onReceiptVoided).toHaveBeenCalledWith(expect.objectContaining({ id: 'rec-2', commissionRateTerm1: 0.1 }));
    });
  });

  it('1c: renders VOIDED receipt with reason, voidedBy, voidedAt, and link to replacedByReceiptId', async () => {
    consignmentService.receipt
      .mockResolvedValueOnce({
        id: 'rec-old',
        receiptNo: 'KG-2026-0003',
        status: 'VOIDED',
        voidedAt: '2026-11-18T10:05:00Z',
        voidReason: 'Sai thông tin tình trạng',
        voidedBy: 'mod-uuid-1',
        replacedByReceiptId: 'rec-new',
      })
      .mockResolvedValueOnce({
        id: 'rec-new',
        receiptNo: 'KG-2026-0003-02',
        status: 'PENDING',
        agreedPrice: 280000,
        floorPrice: 140000,
      });

    renderWithProviders(<ReceiptPanel receiptId="rec-old" />);

    expect(await screen.findByText('Đã huỷ')).toBeInTheDocument();
    expect(screen.getByText(/Sai thông tin tình trạng/i)).toBeInTheDocument();
    expect(screen.getByText(/mod-uuid-1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem biên nhận mới' }));

    await waitFor(() => {
      expect(screen.getAllByText(/KG-2026-0003-02/).length).toBeGreaterThan(0);
    });
  });

  it('2: unhide campaign button on HIDDEN campaign handles 409 CAMPAIGN_ORGANIZATION_BANNED, 409 CAMPAIGN_NOT_HIDDEN (reloads), and success', async () => {
    donationService.myWarehouses.mockResolvedValue([{ id: 'wh-1', name: 'Kho Q7' }]);
    donationService.warehouseCampaigns.mockResolvedValue({
      items: [
        {
          id: 'camp-hidden',
          title: 'Chiến dịch Đang Tạm Ẩn',
          status: 'HIDDEN',
          organizationId: 'org-1',
          organizationName: 'Quỹ Tấm Lòng Vàng',
          endTime: '2026-12-30T00:00:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
    donationService.listDonations.mockResolvedValue([]);
    donationService.unhideCampaign
      .mockRejectedValueOnce({
        status: 409,
        code: 'CAMPAIGN_ORGANIZATION_BANNED',
        message: 'Org banned',
      })
      .mockRejectedValueOnce({
        status: 409,
        code: 'CAMPAIGN_NOT_HIDDEN',
        message: 'Not hidden',
      })
      .mockResolvedValueOnce({ id: 'camp-hidden', status: 'OPEN' });

    renderWithProviders(<DonationsPage />);

    const unhideBtn = await screen.findByRole('button', { name: 'Bỏ ẩn' });
    fireEvent.click(unhideBtn);

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Lý do bỏ ẩn/i), {
      target: { value: 'Tổ chức đã giải trình đầy đủ' },
    });

    // 1st click -> 409 CAMPAIGN_ORGANIZATION_BANNED
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bỏ ẩn' }));
    expect(
      await within(dialog).findByText('Tổ chức đang bị khoá, mở khoá tổ chức trước')
    ).toBeInTheDocument();

    // 2nd click -> 409 CAMPAIGN_NOT_HIDDEN
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bỏ ẩn' }));
    expect(await within(dialog).findByText('Chiến dịch không còn bị ẩn')).toBeInTheDocument();

    // 3rd click -> Success
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận bỏ ẩn' }));
    await waitFor(() => {
      expect(donationService.unhideCampaign).toHaveBeenCalledWith(
        'camp-hidden',
        'Tổ chức đã giải trình đầy đủ'
      );
    });
  });

  it('3 & 4: displays reassignedFromCampaignTitle + reassignedAt, photoUrls lightbox modal, and surfaces 409 BE message on reassign failure', async () => {
    donationService.myWarehouses.mockResolvedValue([{ id: 'wh-1', name: 'Kho Q7' }]);
    donationService.warehouseCampaigns.mockResolvedValue({
      items: [
        {
          id: 'camp-open',
          title: 'Chiến dịch Đích Đang Mở',
          status: 'OPEN',
          organizationId: 'org-2',
          organizationName: 'Quỹ Hy Vọng',
          endTime: '2026-12-30T00:00:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });
    donationService.listDonations.mockImplementation(async (_whId, params = {}) => {
      if (params.status === 'ON_HOLD') {
        return [
          {
            id: 'don-hold-1',
            status: 'ON_HOLD',
            heldAt: '2026-11-10T08:00:00Z',
            holdReason: 'Chiến dịch bị ẩn do báo cáo',
            campaignId: 'camp-old',
            campaignTitle: 'Chiến dịch Cũ',
            organizationName: 'Quỹ Cũ',
            note: '3 áo ấm',
            photoUrls: ['https://img.test/don-photo-1.jpg'],
          },
        ];
      }
      return [
        {
          id: 'don-reassigned-1',
          status: 'PENDING_PICKUP',
          createdAt: '2026-11-12T08:00:00Z',
          campaignId: 'camp-open',
          campaignTitle: 'Chiến dịch Đích Đang Mở',
          organizationId: 'org-2',
          organizationName: 'Quỹ Hy Vọng',
          donorName: 'Lê Minh',
          note: '2 chăn bông',
          photoUrls: ['https://img.test/don-photo-2.jpg'],
          reassignedFromCampaignTitle: 'Chiến dịch Cũ Đã Ẩn',
          reassignedAt: '2026-11-18T09:30:00Z',
        },
      ];
    });
    donationService.reassignDonations.mockRejectedValueOnce({
      status: 409,
      code: 'DONATION_NOT_ON_HOLD',
      message: 'Có lượt quyên góp không còn ở trạng thái tạm giữ.',
    });

    renderWithProviders(<DonationsPage />);

    // List tab: shows "Chuyển từ chiến dịch Chiến dịch Cũ Đã Ẩn" and photoUrls
    expect(await screen.findByText(/Chuyển từ chiến dịch/i)).toBeInTheDocument();
    expect(screen.getByText('Chiến dịch Cũ Đã Ẩn')).toBeInTheDocument();

    // Click photo thumbnail to open large lightbox modal
    const imgThumb = screen.getByRole('img', { name: 'Hiện vật 1' });
    expect(imgThumb).toHaveAttribute('src', 'https://img.test/don-photo-2.jpg');
    fireEvent.click(imgThumb.closest('a'));
    expect(await screen.findByRole('img', { name: /Ảnh hiện vật quyên góp kích thước lớn/i })).toHaveAttribute(
      'src',
      'https://img.test/don-photo-2.jpg'
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Đóng' })[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Switch to ON_HOLD tab and test 409 reassign error message from BE
    fireEvent.click(screen.getByRole('button', { name: /Tạm giữ/i }));
    expect(await screen.findByText('Chiến dịch bị ẩn do báo cáo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Chọn lượt tạm giữ don-hold-1'));
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang chiến dịch khác/i }));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận chuyển/i }));

    expect(
      await within(dialog).findByText('Có lượt quyên góp không còn ở trạng thái tạm giữ.')
    ).toBeInTheDocument();
  });

  it('7: renders 5 clickable KPI Stat links on WarehouseHomePage (/moderator) and Cancel button on MembershipSubscriptionsPage', async () => {
    const { unmount } = renderWithProviders(<WarehouseHomePage />);
    expect(screen.getByText('Việc chờ xử lý').closest('a')).toHaveAttribute('href', '/moderator/queue');
    expect(screen.getByText(/Quá hạn 48h/i).closest('a')).toHaveAttribute('href', '/moderator/queue');
    expect(screen.getByText('Đơn chờ đóng gói').closest('a')).toHaveAttribute('href', '/moderator/packing');
    expect(screen.getByText('Chờ rút hàng').closest('a')).toHaveAttribute('href', '/moderator/queue?type=WITHDRAWAL');
    expect(screen.getByText('Tồn kho đang bán').closest('a')).toHaveAttribute(
      'href',
      '/moderator/inventory?status=ON_SALE'
    );
    unmount();

    membershipAdminApiDefault.getSubscriptions.mockResolvedValueOnce({
      content: [
        {
          id: 'sub-active-1',
          memberEmail: 'vip1@rehome.vn',
          memberName: 'VIP Member 1',
          tier: 'GOLD',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          pricePaid: 149000,
          daysRemaining: 12,
        },
      ],
      totalPages: 1,
      totalElements: 1,
    });

    renderWithProviders(<MembershipSubscriptionsPage />);
    expect(await screen.findByText('vip1@rehome.vn')).toBeInTheDocument();
    const cancelBtn = screen.getByRole('button', { name: 'Hủy gói' });
    expect(cancelBtn).not.toBeDisabled();
    fireEvent.click(cancelBtn);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hủy gói thành viên')).toBeInTheDocument();
  });
});
