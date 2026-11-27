import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
      const mine = url.searchParams.get('mine') === 'true';
      const items = await packingMockApi.listQueue({ type, mine, userId: mine ? 'mod-a' : undefined });
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

    // API 71: PUT /orders/:id/pack/photos
    http.put(`${API_BASE_URL}/orders/:id/pack/photos`, async ({ params, request }) => {
      const body = await request.json();
      const result = await packingMockApi.updatePackingPhotos(params.id, body.photoUrls);
      return HttpResponse.json({ result, isSuccess: true, statusCode: 200 });
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
  const input = await screen.findByLabelText('Mã hàng hóa');
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

    // Bảng hàng đợi hiển thị tên đối tượng từ Mock API, ẩn mã đơn và đưa vào Chi tiết (FE-02)
    const ngoCell = await screen.findByText('Ngô Hải F');
    expect(ngoCell).toBeInTheDocument();
    expect(screen.getByText('Vũ Thanh H')).toBeInTheDocument();
    expect(screen.getByText('Trần Minh K')).toBeInTheDocument();
    expect(screen.queryByText('DH-00244')).not.toBeInTheDocument();
    fireEvent.click(within(ngoCell.closest('tr')).getByRole('button', { name: 'Xem chi tiết' }));
    expect(within(screen.getByRole('dialog')).getByText('DH-00244')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Đóng' })[0]);
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

  it('API 29 & API 30: Claims packing task, displays "Đóng gói" link button without arrow, and allows releasing', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/queue?type=PACKING&page=0']}>
        <Phase2Provider>
          <ConsignmentQueuePage />
        </Phase2Provider>
      </MemoryRouter>
    );

    const dh244Cell = await screen.findByText('Ngô Hải F');
    const dh244Row = dh244Cell.closest('tr');

    // Tìm dòng DH-00244 và bấm "Nhận việc" (API 29)
    const claimBtn = dh244Row
      ? within(dh244Row).getByRole('button', { name: 'Nhận việc' })
      : screen.getAllByRole('button', { name: 'Nhận việc' })[0];
    fireEvent.click(claimBtn);

    // Xử lý modal xác nhận nhận việc nếu có
    const modalClaimBtn = screen.getAllByRole('button', { name: 'Nhận việc' }).find(
      (btn) => btn.closest('[role="dialog"]')
    );
    if (modalClaimBtn) {
      fireEvent.click(modalClaimBtn);
    }

    // Cập nhật trạng thái "Bạn đang nhận việc này"
    await screen.findByText('Bạn đang nhận việc này');

    // Xuất hiện nút "Đóng gói" (không có mũi tên) và không hiển thị link mã đơn thừa trong bảng (FE-02)
    const packLink = screen.getByRole('link', { name: 'Đóng gói' });
    expect(packLink).toBeInTheDocument();
    expect(packLink.textContent.trim()).toBe('Đóng gói');
    expect(packLink.textContent).not.toContain('→');
    expect(packLink.textContent).not.toContain('->');
    expect(packLink.getAttribute('href')).toContain('/moderator/packing?orderId=DH-00244');

    expect(screen.queryByRole('link', { name: 'DH-00244' })).not.toBeInTheDocument();

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
    await packingMockApi.updatePackingPhotos('DH-00244', [
      'https://storage.rehome.test/order-packing/dh244-1.jpg',
    ]);
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
    await screen.findByText('Đã quét 1/2 Mã hàng hóa');

    // Quét mã sai để kiểm tra modal DG-03-SaiMon
    await scanSku('RH-K9B47T');
    await screen.findByText(/Món này không thuộc đơn DH-00244/);
    fireEvent.click(screen.getByText('Đã hiểu — Xoá và nhập lại mã món đúng'));

    // API 69: Quét mã SKU thứ 2
    await scanSku('RH-C2M08P');
    await screen.findByText('Đã quét 2/2 Mã hàng hóa');

    // API 70: Bấm "Tạo vận đơn GHN"
    const shipmentBtn = screen.getByRole('button', { name: 'Tạo vận đơn GHN' });
    await waitFor(() => expect(shipmentBtn).toBeEnabled());
    fireEvent.click(shipmentBtn);

    // Modal in phiếu vận đơn xuất hiện
    await screen.findByText('In phiếu giao hàng GHN');
    expect(screen.getByRole('dialog')).toHaveTextContent('In vận đơn A5');
    expect(screen.queryByText('80 x 80mm')).not.toBeInTheDocument();
    expect(screen.queryByText('52 x 70mm')).not.toBeInTheDocument();

    // Xác nhận API 72: Bàn giao tại quầy hoạt động chuẩn contract
    const handoverRes = await counterService.handover({
      accountId: 'mb-001',
      refId: 'DH-00244',
      context: 'END_OF_TERM_TAKE_BACK',
    });
    expect(handoverRes).toBeDefined();
  });

  it('PackingOrdersPage (tab Công việc) queries mine=true and shows only orders claimed by current moderator', async () => {
    await packingMockApi.claimQueue('queue-pk-01', 'mod-a');
    await packingMockApi.claimQueue('queue-pk-02', 'mod-other');
    const listSpy = vi.spyOn(queueService, 'list');

    render(
      <MemoryRouter initialEntries={['/moderator/packing']}>
        <Phase2Provider>
          <PackingOrdersPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PACKING', mine: true }),
        expect.anything()
      );
    });

    await screen.findByText('DH-00244');
    expect(screen.getByText('Bạn đang giữ')).toBeInTheDocument();
    expect(screen.queryByText('DH-00239')).not.toBeInTheDocument();
    expect(screen.queryByText('DH-00251')).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa ai nhận')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nhận việc' })).not.toBeInTheDocument();
    listSpy.mockRestore();
  });

  it('PackingOrdersPage client filter excludes unclaimed and other moderators orders even when API omits mine filtering', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, () =>
        HttpResponse.json({
          result: [
            {
              id: 'q-mine',
              queueId: 'q-mine',
              refId: 'ord-20',
              orderId: 'ord-20',
              orderNo: 'OD-2026-000020',
              type: 'PACKING',
              buyerName: 'Nguyễn Văn An',
              itemCount: 1,
              claimedBy: 'mod-a',
              status: 'PAID',
            },
            {
              id: 'q-free',
              queueId: 'q-free',
              refId: 'ord-18',
              orderId: 'ord-18',
              orderNo: 'OD-2026-000018',
              type: 'PACKING',
              buyerName: 'Nguyễn Văn An',
              itemCount: 1,
              claimedBy: null,
              status: 'PAID',
            },
            {
              id: 'q-other',
              queueId: 'q-other',
              refId: 'ord-19',
              orderId: 'ord-19',
              orderNo: 'OD-2026-000019',
              type: 'PACKING',
              buyerName: 'Trần Thị B',
              itemCount: 1,
              claimedBy: 'mod-other',
              status: 'PAID',
            },
          ],
          isSuccess: true,
          statusCode: 200,
        })
      )
    );

    render(
      <MemoryRouter initialEntries={['/moderator/packing']}>
        <Phase2Provider>
          <PackingOrdersPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    await screen.findByText('OD-2026-000020');
    expect(screen.getByText('Bạn đang giữ')).toBeInTheDocument();
    expect(screen.queryByText('OD-2026-000018')).not.toBeInTheDocument();
    expect(screen.queryByText('OD-2026-000019')).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa ai nhận')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nhận việc' })).not.toBeInTheDocument();
  });

  it('Releasing an order from PackingOrdersPage removes it from tab Công việc and shows empty state link', async () => {
    await packingMockApi.claimQueue('queue-pk-01', 'mod-a');

    render(
      <MemoryRouter initialEntries={['/moderator/packing']}>
        <Phase2Provider>
          <PackingOrdersPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    await screen.findByText('DH-00244');
    fireEvent.click(screen.getByRole('button', { name: 'Nhả' }));

    await screen.findByText('Bạn chưa nhận đơn đóng gói nào.');
    expect(screen.queryByText('DH-00244')).not.toBeInTheDocument();
    const queueLink = screen.getByRole('link', { name: 'Đi tới Hàng đợi công việc để nhận đơn' });
    expect(queueLink.getAttribute('href')).toBe('/moderator/queue?type=PACKING');
  });
});
