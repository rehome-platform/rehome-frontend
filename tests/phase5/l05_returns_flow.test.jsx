import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect, vi, describe, beforeAll, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import ReturnProcessingPage from '../../src/features/moderator/pages/ReturnProcessingPage.jsx';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { resetModeratorMockData, moderatorMockData } from '../../src/features/moderator/services/moderatorMockData.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-01', accountId: 'mod-01', warehouseId: 'wh-main', role: 'moderator' },
    isAuthenticated: true,
  }),
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

beforeEach(() => {
  resetModeratorMockData();
  server.resetHandlers();

  // Mock endpoints for return requests
  server.use(
    // GET /return-requests/queue
    http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, async () => {
      return HttpResponse.json({
        result: {
          content: moderatorMockData.returnRequests,
          totalElements: moderatorMockData.returnRequests.length,
          page: 0,
          size: 20,
        },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/approve and /return-requests/:id/approve-return
    http.post(`${API_BASE_URL}/return-requests/:id/approve`, async ({ params }) => {
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'WAITING_BUYER_DISPATCH';
        item.carrierStatus = 'Đã tạo vận đơn thu hồi GHN';
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'WAITING_BUYER_DISPATCH', waybillCode: 'GHN-RET-1234' },
        isSuccess: true,
        statusCode: 200,
      });
    }),
    http.post(`${API_BASE_URL}/return-requests/:id/approve-return`, async ({ params }) => {
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'WAITING_BUYER_DISPATCH';
        item.carrierStatus = 'Đã tạo vận đơn thu hồi GHN';
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'WAITING_BUYER_DISPATCH', waybillCode: 'GHN-RET-1234' },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/reject
    http.post(`${API_BASE_URL}/return-requests/:id/reject`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'RESOLVED';
        item.rejectReason = body.reason;
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'REJECTED' },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/inspect
    http.post(`${API_BASE_URL}/return-requests/:id/inspect`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.inspection = body;
      }
      return HttpResponse.json({
        result: { id: params.id, ...body, status: 'INSPECTING' },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/resolve (VALID / INVALID)
    http.post(`${API_BASE_URL}/return-requests/:id/resolve`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'RESOLVED';
        if (body.resolution === 'VALID') item.outcome = body.outcome;
        else if (body.resolution === 'INVALID') item.invalidReason = body.reason;
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'RESOLVED', ...body },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/resolve-valid
    http.post(`${API_BASE_URL}/return-requests/:id/resolve-valid`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'RESOLVED';
        item.outcome = body.outcome;
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'RESOLVED', outcome: body.outcome },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/resolve-invalid
    http.post(`${API_BASE_URL}/return-requests/:id/resolve-invalid`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'RESOLVED';
        item.invalidReason = body.reason;
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'RESOLVED', valid: false },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/flag-counterfeit
    http.post(`${API_BASE_URL}/return-requests/:id/flag-counterfeit`, async ({ params }) => {
      return HttpResponse.json({
        result: { id: params.id, suspectedCounterfeit: true },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/counterfeit-conclusion
    http.post(`${API_BASE_URL}/return-requests/:id/counterfeit-conclusion`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'RESOLVED';
        item.counterfeitVerdict = body.verdict;
      }
      return HttpResponse.json({
        result: { id: params.id, ...body },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /return-requests/:id/mark-lost
    http.post(`${API_BASE_URL}/return-requests/:id/mark-lost`, async ({ params }) => {
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'RESOLVED';
        item.isLost = true;
      }
      return HttpResponse.json({
        result: { id: params.id, isLost: true, refundIssued: true },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /degraded-item-cases
    http.post(`${API_BASE_URL}/degraded-item-cases`, async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        result: { id: 'DEG-01', ...body, status: 'PENDING_SELLER_CHOICE' },
        isSuccess: true,
        statusCode: 200,
      });
    })
  );
});

describe('L-05 Returns Flow (API & UI integration)', () => {
  it('returnService.list fetches and normalizes spring page response data', async () => {
    const res = await returnService.list();
    expect(res.data).toBeDefined();
    expect(res.data.length).toBeGreaterThan(0);
    const first = res.data[0];
    expect(first.code).toBeDefined();
    expect(first.buyerName).toBeDefined();
    expect(first.status).toBeDefined();
  });

  it('renders ReturnProcessingPage queue tabs and filters items correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial load: PENDING_APPROVAL tab
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Yêu cầu trả hàng/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Chờ duyệt ·/i)).toBeInTheDocument();
    expect(screen.getByText(/Chờ người mua gửi ·/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang về kho ·/i)).toBeInTheDocument();
    expect(screen.getByText(/Hàng đã về, chờ kiểm ·/i)).toBeInTheDocument();

    // Switch to RECEIVED_INSPECT tab
    fireEvent.click(screen.getByText(/Hàng đã về, chờ kiểm ·/i));
    await waitFor(() => {
      expect(screen.getByText(/Kiểm tra hàng/i)).toBeInTheDocument();
    });
  });

  it('TH-02: allows reviewing and approving a pending return request with GHN waybill', async () => {
    window.alert = vi.fn();

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Duyệt yêu cầu/i }).length).toBeGreaterThan(0);
    });

    // Click first "Duyệt yêu cầu" to open TH-02 review view
    const approveBtns = screen.getAllByRole('button', { name: /Duyệt yêu cầu/i });
    fireEvent.click(approveBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Người mua nói gì/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Duyệt & tạo vận đơn trả/i })).toBeInTheDocument();
    });

    // Approve return request
    fireEvent.click(screen.getByRole('button', { name: /Duyệt & tạo vận đơn trả/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('TH-03 & TH-04: inspects returned item, checks SKU, and selects Relist outcome', async () => {
    window.alert = vi.fn();

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Switch to RECEIVED_INSPECT tab
    await waitFor(() => {
      expect(screen.getByText(/Hàng đã về, chờ kiểm ·/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Hàng đã về, chờ kiểm ·/i));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Kiểm tra hàng/i }).length).toBeGreaterThan(0);
    });

    // Click "Kiểm tra hàng"
    const inspectBtns = screen.getAllByRole('button', { name: /Kiểm tra hàng/i });
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/kiểm tra hàng về kho/i)).toBeInTheDocument();
      expect(screen.getByText(/Đối chiếu hàng về với ảnh nhập kho/i)).toBeInTheDocument();
    });

    // Enter matching SKU (RH-A7F31K)
    const skuInput = screen.getByPlaceholderText(/Nhập SKU.../i);
    fireEvent.change(skuInput, { target: { value: 'RH-A7F31K' } });

    // Check all checklist items
    fireEvent.click(screen.getByLabelText(/Đúng món theo mã SKU/i));
    fireEvent.click(screen.getByLabelText(/Còn nguyên tem SKU trên sản phẩm/i));
    fireEvent.click(screen.getByLabelText(/Không có hư hỏng mới so với ảnh nhập kho/i));
    fireEvent.click(screen.getByLabelText(/Không có dấu vết đã qua sử dụng thêm/i));
    fireEvent.click(screen.getByLabelText(/Đủ phụ kiện đi kèm nếu có/i));

    // Select "Hợp lệ"
    const validRadio = screen.getByLabelText(/Hợp lệ — hoàn tiền cho người mua/i);
    fireEvent.click(validRadio);

    // Click "Lưu kết luận" -> opens TH-04 outcome dialog
    fireEvent.click(screen.getByText(/Lưu kết luận/i));

    await waitFor(() => {
      expect(screen.getByText(/Chọn phương án xử lý món hàng \(TH-04\)/i)).toBeInTheDocument();
    });

    // Choose "Đăng bán lại (Relist)"
    fireEvent.click(screen.getByText(/Đăng bán lại \(Relist\)/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('F-134/F-135: supports 2-Moderator counterfeit flagging & conclusion', async () => {
    window.alert = vi.fn();

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Go to RECEIVED_INSPECT and click "Kiểm tra hàng"
    fireEvent.click(screen.getByText(/Hàng đã về, chờ kiểm ·/i));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Kiểm tra hàng/i }).length).toBeGreaterThan(0);
    });
    const inspectBtns = screen.getAllByRole('button', { name: /Kiểm tra hàng/i });
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Báo nghi hàng giả \(2 Moderator\)/i)).toBeInTheDocument();
    });

    // Click counterfeit button
    fireEvent.click(screen.getByText(/⚠️ Báo nghi hàng giả \(2 Moderator\)/i));

    await waitFor(() => {
      expect(screen.getByText(/Hội Chẩn Hàng Nghi Giả 2 Moderator/i)).toBeInTheDocument();
    });

    // Fill note and submit
    const noteInput = screen.getByPlaceholderText(/Ghi rõ chi tiết đối chiếu chất liệu vải/i);
    fireEvent.change(noteInput, { target: { value: 'Chất liệu vải nhái thô cứng, chỉ thừa nhiều' } });

    fireEvent.click(screen.getByText(/Lưu biên bản & Thực thi/i));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('TH-08: allows marking a returning parcel as lost with buyer refund', async () => {
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Switch to RETURNING tab
    fireEvent.click(screen.getByText(/Đang về kho ·/i));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Báo thất lạc/i }).length).toBeGreaterThan(0);
    });

    const lostBtns = screen.getAllByRole('button', { name: /Báo thất lạc/i });
    fireEvent.click(lostBtns[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalled();
    });
  });
});
