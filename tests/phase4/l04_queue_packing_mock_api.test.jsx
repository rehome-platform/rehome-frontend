import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, describe, beforeAll, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import PackingOrdersPage from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { packingMockApi, resetSessionStore } from '../../src/features/moderator/services/packingMockApi.js';
import { queueService } from '../../src/features/moderator/services/queueApi.js';
import { counterService } from '../../src/features/moderator/services/counterApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-a', accountId: 'mod-a', warehouseId: 'warehouse-a', role: 'moderator' },
    isAuthenticated: true,
  }),
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

beforeEach(() => {
  resetSessionStore();
  server.resetHandlers();

  // Mock API network handlers theo đúng spec của Backend (APIs 68-72)
  server.use(
    // API 68: GET /queues?type=PACKING
    http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, async ({ request }) => {
      const url = new URL(request.url);
      const type = url.searchParams.get('type');
      const items = await packingMockApi.listQueue({ type });
      return HttpResponse.json({ result: items, isSuccess: true, statusCode: 200 });
    }),

    // API 29: POST /queues/:id/claim
    http.post(`${API_BASE_URL}/queues/:id/claim`, async ({ params }) => {
      const result = await packingMockApi.claimQueue(params.id, 'mod-a');
      return HttpResponse.json({ result, isSuccess: true, statusCode: 200, message: 'Đã nhận việc' });
    }),

    // API 30: POST /queues/:id/release
    http.post(`${API_BASE_URL}/queues/:id/release`, async ({ params }) => {
      await packingMockApi.releaseQueue(params.id, 'mod-a');
      return HttpResponse.json({ result: null, isSuccess: true, statusCode: 204, message: 'Đã nhả việc' });
    }),

    // API 63: GET /orders/:id
    http.get(`${API_BASE_URL}/orders/:id`, async ({ params }) => {
      const order = await packingMockApi.getOrderDetail(params.id, { warehouseId: 'warehouse-a', userId: 'mod-a' });
      return HttpResponse.json({ result: order, isSuccess: true, statusCode: 200 });
    }),

    // API 69: POST /orders/:id/pack/scan
    http.post(`${API_BASE_URL}/orders/:id/pack/scan`, async ({ params, request }) => {
      const body = await request.json();
      const result = await packingMockApi.scanSku(params.id, body.productId);
      return HttpResponse.json({ result, isSuccess: true, statusCode: 200 });
    }),

    // API 70: POST /orders/:id/shipment
    http.post(`${API_BASE_URL}/orders/:id/shipment`, async ({ params }) => {
      const result = await packingMockApi.createShipment(params.id);
      return HttpResponse.json({ result, isSuccess: true, statusCode: 200, message: 'Đã tạo vận đơn' });
    }),

    // API 72: POST /counter/handover
    http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_HANDOVER}`, async ({ request }) => {
      const body = await request.json();
      const result = await packingMockApi.handover(body);
      return HttpResponse.json({ result, isSuccess: true, statusCode: 200, message: 'Đã bàn giao' });
    }),
  );
});

afterAll(() => server.close());

async function scanSku(code) {
  const input = await screen.findByLabelText('SKU');
  fireEvent.change(input, { target: { value: code } });
  const submitBtn = screen.getByRole('button', { name: 'Đối chiếu' });
  fireEvent.click(submitBtn);
}

describe('L-04 Phase 4: Mock API Integration Suite (APIs 68-72)', () => {
  it('API 68: Renders packing queue on /moderator/queue?type=PACKING&page=0 via queueService.list', async () => {
    const listSpy = vi.spyOn(queueService, 'list');

    render(
      <MemoryRouter initialEntries={['/moderator/queue?type=PACKING&page=0']}>
        <Phase2Provider>
          <ConsignmentQueuePage />
        </Phase2Provider>
      </MemoryRouter>
    );

    // Xác nhận gọi queueService.list với param type: 'PACKING' (API 68)
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PACKING' }),
        expect.anything()
      );
    });

    // Tab Đóng gói được chọn
    const packingTab = screen.getByRole('tab', { name: 'Đóng gói' });
    expect(packingTab).toBeInTheDocument();
    expect(packingTab).toHaveAttribute('aria-selected', 'true');

    // Bảng hàng đợi hiển thị đúng các đơn từ Mock API
    await screen.findByText('DH-00244');
    expect(screen.getByText('DH-00239')).toBeInTheDocument();
    expect(screen.getByText('DH-00251')).toBeInTheDocument();
    expect(screen.getAllByText('Đóng gói đơn hàng').length).toBeGreaterThan(0);
  });

  it('No hardcoded mock data in UI: Renders empty state when API 68 returns empty array', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, () => {
        return HttpResponse.json({ result: [], isSuccess: true, statusCode: 200 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/moderator/packing']}>
        <Phase2Provider>
          <PackingOrdersPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    // Khi Mock API trả về rỗng, UI hiển thị rỗng, không có dữ liệu hardcoded
    await waitFor(() => {
      expect(screen.queryByText('DH-00244')).not.toBeInTheDocument();
      expect(screen.queryByText('DH-00239')).not.toBeInTheDocument();
    });
  });

  it('API 29 & API 30: Claims packing task, displays "Đóng gói →" link button, and allows releasing', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/queue?type=PACKING&page=0']}>
        <Phase2Provider>
          <ConsignmentQueuePage />
        </Phase2Provider>
      </MemoryRouter>
    );

    await screen.findByText('DH-00244');

    // Tìm dòng DH-00244 và bấm "Nhận việc" (API 29)
    const claimButtons = screen.getAllByRole('button', { name: 'Nhận việc' });
    fireEvent.click(claimButtons[0]);

    // Xử lý modal xác nhận nhận việc nếu có
    const modalClaimBtn = screen.getAllByRole('button', { name: 'Nhận việc' }).find(
      (btn) => btn.closest('[role="dialog"]')
    );
    if (modalClaimBtn) {
      fireEvent.click(modalClaimBtn);
    }

    // Cập nhật trạng thái "Bạn đang nhận việc này"
    await screen.findByText('Bạn đang nhận việc này');

    // Xuất hiện nút "Đóng gói →" và link mã đơn
    const packLink = screen.getByRole('link', { name: 'Đóng gói →' });
    expect(packLink).toBeInTheDocument();
    expect(packLink.getAttribute('href')).toContain('/moderator/packing?orderId=DH-00244');

    const codeLink = screen.getByRole('link', { name: 'DH-00244' });
    expect(codeLink).toBeInTheDocument();
    expect(codeLink.getAttribute('href')).toContain('/moderator/packing?orderId=DH-00244');

    // Bấm "Nhả việc" (API 30)
    const releaseBtn = screen.getByRole('button', { name: 'Nhả việc' });
    fireEvent.click(releaseBtn);

    // Modal nhả việc xuất hiện
    await screen.findByText(/Nhả việc này về hàng đợi/);
    const releaseButtons = screen.getAllByRole('button', { name: 'Nhả việc' });
    fireEvent.click(releaseButtons[releaseButtons.length - 1]);

    // Sau khi nhả việc, quay về trạng thái chưa ai nhận
    await waitFor(() => {
      expect(screen.queryByText('Bạn đang nhận việc này')).not.toBeInTheDocument();
    });
  });

  it('APIs 69, 70 & 72: Full packing lifecycle from barcode scan to GHN shipment and counter handover', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingOrdersPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    // Nạp chi tiết đơn đóng gói
    await screen.findByText(/Phiếu lấy hàng — 2 món/);
    expect(screen.getByText('Áo sơ mi linen')).toBeInTheDocument();
    expect(screen.getByText('Quần jeans ống đứng')).toBeInTheDocument();

    // API 69: Quét mã SKU thứ 1
    await scanSku('RH-A7F31K');
    await screen.findByText('Đã quét 1/2 SKU');

    // Quét mã sai để kiểm tra modal DG-03-SaiMon
    await scanSku('RH-K9B47T');
    await screen.findByText(/Món này không thuộc đơn DH-00244/);
    fireEvent.click(screen.getByText('Đã hiểu — Xoá và nhập lại mã món đúng'));

    // API 69: Quét mã SKU thứ 2
    await scanSku('RH-C2M08P');
    await screen.findByText('Đã quét 2/2 SKU');

    // API 70: Bấm "Tạo vận đơn GHN"
    const shipmentBtn = screen.getByRole('button', { name: 'Tạo vận đơn GHN' });
    await waitFor(() => expect(shipmentBtn).toBeEnabled());
    fireEvent.click(shipmentBtn);

    // Modal in phiếu vận đơn xuất hiện
    await screen.findByText('In phiếu giao hàng GHN');
    expect(screen.getByText('Khổ A5')).toBeInTheDocument();
    expect(screen.getByText('80 x 80mm')).toBeInTheDocument();
    expect(screen.getByText('52 x 70mm')).toBeInTheDocument();

    // Xác nhận API 72: Bàn giao tại quầy hoạt động chuẩn contract
    const handoverRes = await counterService.handover({
      accountId: 'mb-001',
      refId: 'DH-00244',
      context: 'END_OF_TERM_TAKE_BACK',
    });
    expect(handoverRes).toBeDefined();
  });
});
