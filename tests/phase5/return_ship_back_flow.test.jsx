import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import ReturnShipBackDetailPage from '../../src/features/moderator/pages/ReturnShipBackDetailPage.jsx';
import { ReturnReviewDecision } from '../../src/features/moderator/components/returns/ReturnSections.jsx';
import { mapReturnItem } from '../../src/features/moderator/services/returnApi.js';
import ConfigPage from '../../src/features/admin/pages/ConfigPage.jsx';
import AdminDashboardPage from '../../src/features/admin/pages/AdminDashboardPage.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-01', accountId: 'mod-01', warehouseId: 'wh-main', role: 'moderator', fullName: 'Mod A' },
    isAuthenticated: true,
  }),
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

beforeEach(() => {
  server.resetHandlers();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function LocationDisplay() {
  const loc = useLocation();
  return <output data-testid="loc">{loc.pathname}{loc.search}</output>;
}

function ModWrapper({ initialEntries = ['/moderator/queue'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Phase2Provider scope={{ userId: 'mod-01', warehouseId: 'wh-main' }}>
          <LocationDisplay />
          <Routes>
            <Route path="/moderator/queue" element={<ConsignmentQueuePage />} />
            <Route path="/moderator/returns/ship-back/:returnId" element={<ReturnShipBackDetailPage />} />
            <Route path="/moderator/returns" element={<p>Trang trả hàng</p>} />
          </Routes>
        </Phase2Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('INVALID return SHIP_BACK Web flow (Specs 2.1 - 2.5)', () => {
  it('2.1: renders RETURN_SHIP_BACK queue tab with orderNo, SKU, product, recipient, province, fee, paidAt, red near-deadline, and Gửi hàng link', async () => {
    const soonDeadline = new Date(Date.now() + 4 * 3600 * 1000).toISOString();
    const paidAt = '2026-11-27T04:00:00Z';

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('type') && url.searchParams.get('type') !== 'RETURN_SHIP_BACK') {
          return HttpResponse.json({ result: [], isSuccess: true, statusCode: 200 });
        }
        return HttpResponse.json({
          result: [
            {
              id: 'q-sb-1',
              type: 'RETURN_SHIP_BACK',
              refId: 'rr-sb-1',
              orderNo: 'OD-2026-000123',
              sku: 'HCM-AK-000018',
              targetName: 'Áo khoác gió Uniqlo chống nước',
              recipientName: 'Trần Minh Khôi',
              subjectSubtitle: 'Trần Minh Khôi',
              shippingProvinceName: 'TP. Hồ Chí Minh',
              shippingPhone: '0901234567',
              shippingAddress: '45 Lê Lợi, Phường Bến Nghé, TP. Hồ Chí Minh',
              shipBackFee: 30000,
              feeCharged: 30000,
              feePaid: true,
              shipBackPaymentMethod: 'WALLET',
              shipBackFeePaidAt: paidAt,
              shipBackDeadline: soonDeadline,
              claimedBy: 'mod-01',
              createdAt: '2026-11-27T04:00:00Z',
            },
          ],
          isSuccess: true,
          statusCode: 200,
        });
      }),
    );

    render(<ModWrapper initialEntries={['/moderator/queue?type=RETURN_SHIP_BACK']} />);

    expect(screen.getByRole('tab', { name: 'Gửi lại hàng trả không hợp lệ' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('OD-2026-000123')).toBeInTheDocument();
    expect(screen.getByText('HCM-AK-000018')).toBeInTheDocument();
    expect(screen.getByText('Áo khoác gió Uniqlo chống nước')).toBeInTheDocument();
    expect(screen.getByText('Trần Minh Khôi')).toBeInTheDocument();
    expect(screen.getByText('TP. Hồ Chí Minh')).toBeInTheDocument();
    expect(screen.getByText(/30\.000/)).toBeInTheDocument();

    const deadlineEl = screen.getByText(/còn \d+ giờ|Sắp quá hạn|Đã quá hạn/i);
    expect(deadlineEl.className).toContain('text-[#B42318]');

    const shipLink = screen.getByRole('link', { name: 'Gửi hàng' });
    expect(shipLink).toHaveAttribute('href', '/moderator/returns/ship-back/rr-sb-1');
  });

  it('2.2: ReturnShipBackDetailPage requires both checklists, shows 502 error message, then creates GHN waybill with copy & print label', async () => {
    const returnId = 'rr-sb-2';
    let shippedCode = null;
    let shipCallCount = 0;

    server.use(
      http.get(`${API_BASE_URL}/return-requests/${returnId}/detail`, () =>
        HttpResponse.json({
          result: {
            id: returnId,
            orderId: 'ord-sb-2',
            orderNo: 'OD-2026-000999',
            status: 'INVALID',
            invalidReturnChoice: 'SHIP_BACK',
            shipBackStatus: 'PAID',
            sku: 'HCM-AK-000018',
            productName: 'Áo khoác gió Uniqlo chống nước',
            packingPhotoUrls: ['https://cdn.rehome.vn/a.jpg'],
            buyerName: 'Nguyễn Văn B',
            buyerPhone: '0988777666',
            shipBackRecipientName: 'Nguyễn Văn B',
            shipBackPhone: '0988777666',
            shipBackAddressDetail: '12 Nguyễn Huệ',
            shipBackWardName: 'Bến Nghé',
            shipBackProvinceName: 'TP.HCM',
            shipBackFee: 35000,
            shipBackPaymentMethod: 'VNPAY',
            shipBackPaidAt: '2026-11-27T04:30:00Z',
            shipBackShipDeadline: '2026-11-29T04:30:00Z',
            shipBackTrackingCode: shippedCode,
            shipBackShippedAt: shippedCode ? '2026-11-27T05:00:00Z' : null,
          },
          isSuccess: true,
          statusCode: 200,
        }),
      ),
      http.get(`${API_BASE_URL}/orders/ord-sb-2`, () =>
        HttpResponse.json({ result: { id: 'ord-sb-2', orderNo: 'OD-2026-000999', items: [] }, isSuccess: true, statusCode: 200 }),
      ),
      http.post(`${API_BASE_URL}/return-requests/${returnId}/ship-back/ship`, () => {
        shipCallCount += 1;
        if (shipCallCount === 1) {
          return HttpResponse.json(
            { isSuccess: false, statusCode: 502, message: 'GHN chưa tạo được vận đơn, thử lại' },
            { status: 502 },
          );
        }
        shippedCode = 'GHN-SB-777888';
        return HttpResponse.json({
          result: {
            id: returnId,
            orderId: 'ord-sb-2',
            orderNo: 'OD-2026-000999',
            status: 'INVALID',
            invalidReturnChoice: 'SHIP_BACK',
            shipBackStatus: 'SHIPPING',
            shipBackTrackingCode: shippedCode,
            shipBackShippedAt: '2026-11-27T05:00:00Z',
            shipBackPrintUrl: 'https://dev-online-gateway.ghn.vn/a5/public-api/printA5?token=tok123',
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
    );

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<ModWrapper initialEntries={[`/moderator/returns/ship-back/${returnId}`]} />);

    expect(await screen.findByText('HCM-AK-000018')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn B')).toBeInTheDocument();
    expect(screen.getByText('0988777666')).toBeInTheDocument();
    expect(screen.getByText('12 Nguyễn Huệ, Bến Nghé, TP.HCM')).toBeInTheDocument();
    expect(screen.getByText(/35\.000/)).toBeInTheDocument();
    expect(screen.getByText('VNPay')).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: 'Tạo vận đơn GHN' });
    expect(createBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Đã kiểm SKU'));
    expect(createBtn).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Đã đóng gói'));
    expect(createBtn).toBeEnabled();

    // First attempt -> 502
    fireEvent.click(createBtn);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('GHN chưa tạo được vận đơn, thử lại');
    });

    // Retry -> success
    fireEvent.click(screen.getByRole('button', { name: 'Tạo vận đơn GHN' }));
    await waitFor(() => {
      expect(screen.getByText('GHN-SB-777888')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy mã vận đơn' }));
    expect(writeText).toHaveBeenCalledWith('GHN-SB-777888');

    fireEvent.click(screen.getByRole('button', { name: 'In nhãn GHN' }));
    expect(openSpy).toHaveBeenCalledWith(
      'https://dev-online-gateway.ghn.vn/a5/public-api/printA5?token=tok123',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('2.3: ReturnReviewDecision renders SHIP_BACK milestones (AWAITING_PAYMENT -> DELIVERED / FAILED) and WAREHOUSE_PICKUP pickedUpAt for INVALID return', () => {
    const awaitingPaymentItem = mapReturnItem({
      id: 'rr-3a',
      orderId: 'ord-3a',
      orderNo: 'OD-2026-000331',
      status: 'INVALID',
      invalidReturnChoice: 'SHIP_BACK',
      shipBackStatus: 'AWAITING_PAYMENT',
      shipBackFee: 30000,
      shipBackFeeDeadline: '2026-11-27T05:15:00Z',
    });

    const { rerender } = render(
      <MemoryRouter>
        <ReturnReviewDecision selectedItem={awaitingPaymentItem} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Cách nhận lại hàng trả không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('ReHome gửi lại')).toBeInTheDocument();
    expect(screen.getByText('Chờ trả phí')).toBeInTheDocument();

    const shipBackItem = mapReturnItem({
      id: 'rr-3',
      orderId: 'ord-3',
      orderNo: 'OD-2026-000333',
      status: 'INVALID',
      invalidReturnChoice: 'SHIP_BACK',
      shipBackStatus: 'DELIVERED',
      shipBackFee: 30000,
      shipBackPaymentMethod: 'WALLET',
      shipBackFeeDeadline: '2026-11-27T05:15:00Z',
      shipBackPaidAt: '2026-11-27T05:05:00Z',
      shipBackTrackingCode: 'GHN-SB-333',
      shipBackShippedAt: '2026-11-27T06:00:00Z',
      shipBackDeliveredAt: '2026-11-28T09:00:00Z',
    });

    rerender(
      <MemoryRouter>
        <ReturnReviewDecision selectedItem={shipBackItem} />
      </MemoryRouter>,
    );

    expect(screen.getByText('ReHome gửi lại')).toBeInTheDocument();
    expect(screen.getByText('Đã giao lại thành công')).toBeInTheDocument();
    expect(screen.getByText(/30\.000/)).toBeInTheDocument();
    expect(screen.getByText('GHN-SB-333')).toBeInTheDocument();
    expect(screen.getByText(/Đã giao thành công lúc/i)).toBeInTheDocument();

    const failedFallbackItem = mapReturnItem({
      id: 'rr-3f',
      orderId: 'ord-3f',
      orderNo: 'OD-2026-000339',
      status: 'INVALID',
      invalidReturnChoice: 'WAREHOUSE_PICKUP',
      shipBackStatus: 'FAILED',
      shipBackFee: 30000,
      shipBackPaidAt: '2026-11-27T05:05:00Z',
      shipBackTrackingCode: 'GHN-SB-999',
      shipBackFailedAt: '2026-11-29T10:00:00Z',
    });

    rerender(
      <MemoryRouter>
        <ReturnReviewDecision selectedItem={failedFallbackItem} />
      </MemoryRouter>,
    );

    expect(screen.getByText('ReHome gửi lại (thất bại) → Đến địa điểm lấy')).toBeInTheDocument();
    expect(screen.getByText(/Giao thất bại lúc/i)).toBeInTheDocument();

    const pickupItem = mapReturnItem({
      id: 'rr-4',
      orderId: 'ord-4',
      orderNo: 'OD-2026-000444',
      status: 'INVALID',
      invalidReturnChoice: 'WAREHOUSE_PICKUP',
      pickedUpAt: '2026-11-27T11:30:00Z',
    });

    rerender(
      <MemoryRouter>
        <ReturnReviewDecision selectedItem={pickupItem} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Đến địa điểm lấy')).toBeInTheDocument();
    expect(screen.getByText(/Đã bàn giao tại quầy lúc/i)).toBeInTheDocument();
  });

  it('2.5: Admin ConfigPage shows all 5 new config params & AdminDashboardPage shows Phí gửi lại hàng trả row', async () => {
    const configRows = [
      { key: 'term_length_days', value: '30', defaultValue: '30', type: 'INT', min: 1, max: 365 },
      { key: 're_consign_confirm_days', value: '7', defaultValue: '7', type: 'INT', min: 1, max: 30 },
      { key: 're_consign_max_counter_rounds', value: '2', defaultValue: '2', type: 'INT', min: 0, max: 10 },
      { key: 're_consign_moderator_response_days', value: '2', defaultValue: '2', type: 'INT', min: 1, max: 14 },
      { key: 'order_payment_timeout_minutes', value: '15', defaultValue: '15', type: 'INT', min: 1, max: 1440 },
      { key: 'return_ship_back_fee_deadline_minutes', value: '30', defaultValue: '30', type: 'INT', min: 5, max: 1440 },
      { key: 'return_ship_back_ship_within_days', value: '2', defaultValue: '2', type: 'INT', min: 1, max: 30 },
    ];
    let putCall = null;

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.ADMIN.CONFIGS}`, () =>
        HttpResponse.json({ result: configRows, isSuccess: true, statusCode: 200 }),
      ),
      http.put(`${API_BASE_URL}/api/admin/config/:key`, async ({ params, request }) => {
        const body = await request.json();
        putCall = { key: params.key, value: body.value };
        return HttpResponse.json({ result: { key: params.key, value: body.value }, isSuccess: true, statusCode: 200 });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.ADMIN.DASHBOARD}`, () =>
        HttpResponse.json({
          result: {
            revenue: 1000000,
            platformRevenue: 155000,
            commissionRevenue: 100000,
            withdrawalFeeRevenue: 25000,
            returnShipBackFeeRevenue: 30000,
            membershipRevenue: 0,
            heldOrderAmount: 0,
            totalSoldItemsCount: 1,
            netProfitMarginPercent: 15.5,
          },
          isSuccess: true,
          statusCode: 200,
        }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.ADMIN.REVENUE_TREND}`, () =>
        HttpResponse.json({ result: { total: 155000, points: [] }, isSuccess: true, statusCode: 200 }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.ADMIN.REVENUE_ITEMS}`, () =>
        HttpResponse.json({ result: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }, isSuccess: true, statusCode: 200 }),
      ),
    );

    const viewCfg = render(
      <MemoryRouter>
        <ToastProvider>
          <ConfigPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('spinbutton', { name: /Độ dài một kỳ/ })).toHaveValue(30);
    });

    expect(screen.getByLabelText('Hạn Member xác nhận giá ký gửi lại (ngày)')).toHaveValue(7);
    expect(screen.getByLabelText('Số lượt trả giá tối đa khi ký gửi lại')).toHaveValue(2);
    expect(screen.getByLabelText('Hạn Moderator phản hồi trả giá (ngày)')).toHaveValue(2);

    fireEvent.click(screen.getByRole('button', { name: /4\. Đơn & Trả hàng/i }));
    const timeoutInput = screen.getByLabelText('Hạn trả phí gửi lại (phút)');
    const dispatchInput = screen.getByLabelText('Hạn Moderator gửi hàng (ngày)');
    expect(timeoutInput).toHaveValue(30);
    expect(dispatchInput).toHaveValue(2);

    fireEvent.click(screen.getByRole('button', { name: 'Sửa: Hạn Moderator gửi hàng (ngày)' }));
    fireEvent.change(dispatchInput, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi tham số/i }));

    await waitFor(() => {
      expect(putCall).toEqual({ key: 'return_ship_back_ship_within_days', value: '3' });
    });
    viewCfg.unmount();

    render(
      <MemoryRouter>
        <ToastProvider>
          <AdminDashboardPage />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Phí gửi lại hàng trả')).toBeInTheDocument();
    expect(screen.getByText(/30\.000/)).toBeInTheDocument();
  });
});
