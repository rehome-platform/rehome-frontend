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

    // GET /return-requests/:id/detail
    http.get(`${API_BASE_URL}/return-requests/:id/detail`, async ({ params }) => {
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      return HttpResponse.json({
        result: item || { id: params.id, code: params.id },
        isSuccess: true,
        statusCode: 200,
      });
    }),
    http.get(`${API_BASE_URL}/return-requests/:id`, async ({ params }) => {
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      return HttpResponse.json({
        result: item || { id: params.id, code: params.id },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // GET /orders/:id
    http.get(`${API_BASE_URL}/orders/:id`, async ({ params }) => {
      return HttpResponse.json({
        result: { id: params.id, orderNo: params.id, items: [] },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // POST /uploads
    http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.UPLOADS}`, async () => {
      return HttpResponse.json({
        result: { url: 'https://photos.test/evidence-upload.jpg' },
        url: 'https://photos.test/evidence-upload.jpg',
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

    // POST /return-requests/:id/item-action
    http.post(`${API_BASE_URL}/return-requests/:id/item-action`, async ({ params, request }) => {
      const body = await request.json();
      const item = moderatorMockData.returnRequests.find((r) => String(r.id) === String(params.id));
      if (item) {
        item.status = 'VALID';
        item.itemAction = body.action;
      }
      return HttpResponse.json({
        result: { id: params.id, status: 'VALID', itemAction: body.action },
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

    // Upload evidence photos (2 to 5 photos required)
    const fileInput = screen.getByLabelText(/Tải ảnh bằng chứng kiểm hàng/i);
    const file1 = new File(['a'], 'ev1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['b'], 'ev2.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(screen.getByText(/2 \/ 5 ảnh đã tải lên/i)).toBeInTheDocument();
    });

    // Verify checklist guidance items are rendered (without checkboxes)
    expect(screen.getByText(/Còn nguyên tem SKU trên sản phẩm/i)).toBeInTheDocument();
    expect(screen.getByText(/Không có hư hỏng mới so với ảnh nhập kho/i)).toBeInTheDocument();
    expect(screen.getByText(/Không có dấu vết đã qua sử dụng thêm/i)).toBeInTheDocument();
    expect(screen.getByText(/Đủ phụ kiện đi kèm nếu có/i)).toBeInTheDocument();

    // Select "Hợp lệ"
    const validRadio = screen.getByLabelText(/Hợp lệ — hoàn tiền cho người mua/i);
    fireEvent.click(validRadio);

    // Click "Lưu kết luận" -> refunds buyer (Step 1) and opens TH-04 outcome dialog (Step 2)
    fireEvent.click(screen.getByText(/Lưu kết luận/i));

    await waitFor(() => {
      expect(screen.getByText(/Chọn phương án xử lý món hàng/i)).toBeInTheDocument();
      expect(screen.getByText(/ĐÃ HOÀN TIỀN NGƯỜI MUA/i)).toBeInTheDocument();
    });
    window.alert.mockClear();

    // Click "Đăng bán lại (Relist)" should only select, not auto-submit
    fireEvent.click(screen.getByText(/Đăng bán lại \(Relist\)/i));
    expect(window.alert).not.toHaveBeenCalled();

    // Confirm explicitly
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xử lý' }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('C.1 #4: hides unsupported counterfeit flagging UI in return inspection view', async () => {
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
      expect(screen.getByText(/kiểm tra hàng về kho/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Báo nghi hàng giả/i)).not.toBeInTheDocument();
  });

  it('TH-08: allows marking a returning parcel as lost with buyer refund', async () => {
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

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận thất lạc/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('maps handoverDeadline, pickupDeadline, and order returnDeadline with countdowns without hardcoding 3 or 7 days', async () => {
    const handoverFuture = new Date(Date.now() + 2 * 24 * 3600000).toISOString();
    const pickupFuture = new Date(Date.now() + 5 * 24 * 3600000).toISOString();
    const returnFuture = new Date(Date.now() + 3 * 24 * 3600000).toISOString();

    server.use(
      http.get(`${API_BASE_URL}/return-requests/:id/detail`, async ({ params }) => {
        return HttpResponse.json({
          result: {
            id: params.id,
            code: 'YC-DL01',
            orderId: 'ORD-DL01',
            status: 'APPROVED',
            handoverDeadline: handoverFuture,
            pickupDeadline: pickupFuture,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/:id`, async ({ params }) => {
        return HttpResponse.json({
          result: {
            id: params.id,
            code: 'YC-DL01',
            orderId: 'ORD-DL01',
            status: 'APPROVED',
            handoverDeadline: handoverFuture,
            pickupDeadline: pickupFuture,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/orders/:id`, async ({ params }) => {
        return HttpResponse.json({
          result: {
            id: params.id,
            orderNo: 'ORD-DL01',
            returnDeadline: returnFuture,
            autoCompleteDeadline: returnFuture,
            items: [{ productId: 'P-DL01', name: 'Đầm lụa' }],
          },
          isSuccess: true,
          statusCode: 200,
        });
      })
    );

    const detail = await returnService.detail('RET-DL01');
    expect(detail.handoverDeadline).toBe(handoverFuture);
    expect(detail.pickupDeadline).toBe(pickupFuture);
    expect(detail.returnDeadline).toBe(returnFuture);
    expect(detail.carrierStatus).toMatch(/Hạn bàn giao GHN:.*còn/);
  });

  it('displays exact server-returned refundAmount and discountAmount without client-side recomputation', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, async () => {
        return HttpResponse.json({
          result: {
            content: [
              {
                id: 'RET-VOUCHER-01',
                code: 'YC-VOUCHER',
                orderId: 'ORD-VOUCHER-01',
                status: 'INSPECTING',
                buyerName: 'Nguyễn Thị V',
                productName: 'Áo khoác dạ',
                amount: 500000,
                shippingFee: 30000,
                discountAmount: 100000,
                refundAmount: 430000,
              },
            ],
            totalElements: 1,
            page: 0,
            size: 20,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/RET-VOUCHER-01/detail`, async () => {
        return HttpResponse.json({
          result: {
            id: 'RET-VOUCHER-01',
            code: 'YC-VOUCHER',
            orderId: 'ORD-VOUCHER-01',
            status: 'INSPECTING',
            buyerName: 'Nguyễn Thị V',
            productName: 'Áo khoác dạ',
            amount: 500000,
            shippingFee: 30000,
            discountAmount: 100000,
            refundAmount: 430000,
          },
          isSuccess: true,
          statusCode: 200,
        });
      })
    );

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Hàng đã về, chờ kiểm ·/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Hàng đã về, chờ kiểm ·/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Kiểm tra hàng/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra hàng/i }));

    await waitFor(() => {
      expect(screen.getByText(/Nếu kết luận hợp lệ, hoàn cho người mua/i)).toBeInTheDocument();
    });

    // Must show voucher discount (-100.000 ₫) and exact server refundAmount (430.000 ₫), NOT 530.000 ₫
    expect(screen.getByText(/Giảm giá \/ Voucher/i)).toBeInTheDocument();
    expect(screen.getByText(/-100\.000/)).toBeInTheDocument();
    expect(screen.getByText(/430\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/530\.000/)).not.toBeInTheDocument();
  });

  it('uses packingPhotoUrls to compare against buyer return photos in review, compare modal, and inspection screens, with stock-in fallback for legacy orders', async () => {
    const packingUrl = 'https://storage.rehome.test/order-packing/pack-1.jpg';
    const buyerUrl = 'https://storage.rehome.test/return-buyer/buyer-1.jpg';
    const stockUrl = 'https://storage.rehome.test/products/stock-1.jpg';

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, async () => {
        return HttpResponse.json({
          result: {
            content: [
              {
                id: 'RET-PACK-01',
                code: 'YC-PACK01',
                orderId: 'ORD-PACK-01',
                status: 'PENDING',
                buyerName: 'Lê Hoàng P',
                productName: 'Áo khoác kaki',
                photoUrls: [buyerUrl],
                packingPhotoUrls: [packingUrl],
                initialConsignmentPhotoUrls: [stockUrl],
              },
              {
                id: 'RET-LEGACY-01',
                code: 'YC-LEG01',
                orderId: 'ORD-LEG-01',
                status: 'INSPECTING',
                buyerName: 'Trần Thị L',
                productName: 'Váy đơn cũ',
                photoUrls: [buyerUrl],
                packingPhotoUrls: [],
                initialConsignmentPhotoUrls: [stockUrl],
              },
            ],
            totalElements: 2,
            page: 0,
            size: 20,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/RET-PACK-01/detail`, async () => {
        return HttpResponse.json({
          result: {
            id: 'RET-PACK-01',
            code: 'YC-PACK01',
            orderId: 'ORD-PACK-01',
            status: 'PENDING',
            buyerName: 'Lê Hoàng P',
            productName: 'Áo khoác kaki',
            photoUrls: [buyerUrl],
            packingPhotoUrls: [packingUrl],
            initialConsignmentPhotoUrls: [stockUrl],
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/RET-LEGACY-01/detail`, async () => {
        return HttpResponse.json({
          result: {
            id: 'RET-LEGACY-01',
            code: 'YC-LEG01',
            orderId: 'ORD-LEG-01',
            status: 'INSPECTING',
            buyerName: 'Trần Thị L',
            productName: 'Váy đơn cũ',
            photoUrls: [buyerUrl],
            packingPhotoUrls: [],
            initialConsignmentPhotoUrls: [stockUrl],
          },
          isSuccess: true,
          statusCode: 200,
        });
      })
    );

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // 1. Màn hình duyệt (TH-02) hiển thị ảnh đóng gói đối chiếu với ảnh người mua trả về
    const reviewBtn = await screen.findByRole('button', { name: /Duyệt yêu cầu/i });
    fireEvent.click(reviewBtn);

    expect(await screen.findByText(/So với ảnh đóng gói lúc xuất kho/i)).toBeInTheDocument();
    const packingThumb = screen.getByAltText('Ảnh đóng gói 1');
    expect(packingThumb).toHaveAttribute('src', packingUrl);

    // Mở modal so sánh cạnh nhau
    fireEvent.click(screen.getByRole('button', { name: /Mở so sánh/i }));
    expect(await screen.findByText(/So sánh ảnh đóng gói vs ảnh người mua trả về/i)).toBeInTheDocument();
    const modalPackingImgs = screen.getAllByAltText('Ảnh đóng gói 1');
    expect(modalPackingImgs.some((img) => img.getAttribute('src') === packingUrl)).toBe(true);
    const modalBuyerImgs = screen.getAllByAltText('Ảnh người mua 1');
    expect(modalBuyerImgs.some((img) => img.getAttribute('src') === buyerUrl)).toBe(true);

    // Đóng modal và quay lại hàng đợi
    fireEvent.click(screen.getAllByRole('button', { name: /^Đóng$/i })[0]);
    fireEvent.click(screen.getByTitle('Quay lại hàng đợi'));

    // 2. Đơn cũ không có packingPhotoUrls ở màn kiểm hàng (TH-03) vẫn fallback sang ảnh nhập kho
    fireEvent.click(await screen.findByText(/Hàng đã về, chờ kiểm ·/i));
    fireEvent.click(await screen.findByRole('button', { name: /Kiểm tra hàng/i }));

    expect(await screen.findByText(/Chưa có ảnh đóng gói/i)).toBeInTheDocument();
    expect(screen.getByAltText('Ảnh nhập kho 1')).toHaveAttribute('src', stockUrl);
  });

  it('BUG-E2E-010: handles GHN sandbox fallback on approve with LOCAL-RT code, handoverDeadline, and fallback badge', async () => {
    window.alert = vi.fn();
    const handoverFuture = new Date(Date.now() + 2 * 24 * 3600000).toISOString();
    let approvedState = false;

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, async () => {
        return HttpResponse.json({
          result: {
            content: [
              {
                id: 'RET-FB-01',
                code: 'YC-FB01',
                orderId: 'ORD-FB-01',
                status: approvedState ? 'APPROVED' : 'PENDING',
                buyerName: 'Nguyễn Văn F',
                productName: 'Áo sơ mi linen',
                ghnReturnTrackingCode: approvedState ? 'LOCAL-RT-12345678' : null,
                ghnFallbackUsed: approvedState,
                handoverDeadline: approvedState ? handoverFuture : null,
              },
            ],
            totalElements: 1,
            page: 0,
            size: 20,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/RET-FB-01/detail`, async () => {
        return HttpResponse.json({
          result: {
            id: 'RET-FB-01',
            code: 'YC-FB01',
            orderId: 'ORD-FB-01',
            status: approvedState ? 'APPROVED' : 'PENDING',
            buyerName: 'Nguyễn Văn F',
            productName: 'Áo sơ mi linen',
            ghnReturnTrackingCode: approvedState ? 'LOCAL-RT-12345678' : null,
            ghnFallbackUsed: approvedState,
            handoverDeadline: approvedState ? handoverFuture : null,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.post(`${API_BASE_URL}/return-requests/RET-FB-01/approve`, async () => {
        approvedState = true;
        return HttpResponse.json({
          result: {
            id: 'RET-FB-01',
            status: 'APPROVED',
            ghnReturnTrackingCode: 'LOCAL-RT-12345678',
            ghnFallbackUsed: true,
            handoverDeadline: handoverFuture,
          },
          isSuccess: true,
          statusCode: 200,
        });
      })
    );

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    const reviewBtn = await screen.findByRole('button', { name: /Duyệt yêu cầu/i });
    fireEvent.click(reviewBtn);

    const approveBtn = await screen.findByRole('button', { name: /Duyệt & tạo vận đơn trả/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('LOCAL-RT-12345678'));
    });

    // Switch to WAITING_BUYER_DISPATCH tab and verify fallback badge in row & detail view
    fireEvent.click(await screen.findByText(/Chờ người mua gửi · 1/i));
    expect(await screen.findByText(/GHN fallback/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Theo dõi/i }));
    expect(await screen.findByText('LOCAL-RT-12345678')).toBeInTheDocument();
    expect(screen.getByText(/Mã thu hồi nội bộ \(GHN fallback\)/i)).toBeInTheDocument();
  });

  it('BUG-E2E-010: surfaces error and stays in review view when approve returns 502 (fallback disabled)', async () => {
    window.alert = vi.fn();

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, async () => {
        return HttpResponse.json({
          result: {
            content: [
              {
                id: 'RET-502-01',
                code: 'YC-502',
                orderId: 'ORD-502-01',
                status: 'PENDING',
                buyerName: 'Trần Thị E',
                productName: 'Túi đeo chéo',
              },
            ],
            totalElements: 1,
            page: 0,
            size: 20,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/RET-502-01/detail`, async () => {
        return HttpResponse.json({
          result: {
            id: 'RET-502-01',
            code: 'YC-502',
            orderId: 'ORD-502-01',
            status: 'PENDING',
            buyerName: 'Trần Thị E',
            productName: 'Túi đeo chéo',
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.post(`${API_BASE_URL}/return-requests/RET-502-01/approve`, async () => {
        return HttpResponse.json(
          { isSuccess: false, statusCode: 502, message: 'GHN_ERROR: cannot create return shipment.' },
          { status: 502 }
        );
      })
    );

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Duyệt yêu cầu/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Duyệt & tạo vận đơn trả/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Có lỗi xảy ra khi duyệt yêu cầu/i));
    });
    expect(screen.getByRole('button', { name: /Duyệt & tạo vận đơn trả/i })).toBeInTheDocument();
  });

  it('API 88 + item-action 2-step flow: refunds without action, allows deferring with Để sau, and resumes Step 2 with exact { action } payload', async () => {
    window.alert = vi.fn();
    let resolvePayload = null;
    let resolveCalls = 0;
    let itemActionPayload = null;
    let state = {
      id: 'RET-2STEP-01',
      code: 'YC-2STEP',
      orderId: 'ORD-2STEP-01',
      status: 'INSPECTING',
      itemAction: null,
      degraded: false,
      buyerName: 'Lê Minh T',
      productName: 'Áo blazer xám',
      amount: 600000,
      refundAmount: 600000,
    };

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.RETURNS}`, async () => {
        return HttpResponse.json({
          result: {
            content: [
              state,
              {
                id: 'RET-DEG-VALID',
                code: 'YC-DEG',
                orderId: 'ORD-DEG-01',
                status: 'VALID',
                itemAction: null,
                degraded: true,
                buyerName: 'Phạm Thị D',
                productName: 'Túi da xuống cấp',
              },
            ],
            totalElements: 2,
            page: 0,
            size: 20,
          },
          isSuccess: true,
          statusCode: 200,
        });
      }),
      http.get(`${API_BASE_URL}/return-requests/RET-2STEP-01/detail`, async () => {
        return HttpResponse.json({ result: state, isSuccess: true, statusCode: 200 });
      }),
      http.post(`${API_BASE_URL}/return-requests/RET-2STEP-01/resolve`, async ({ request }) => {
        resolveCalls += 1;
        resolvePayload = await request.json();
        state = { ...state, status: 'VALID', itemAction: null };
        return HttpResponse.json({ result: state, isSuccess: true, statusCode: 200 });
      }),
      http.post(`${API_BASE_URL}/return-requests/RET-2STEP-01/item-action`, async ({ request }) => {
        itemActionPayload = await request.json();
        state = { ...state, status: 'VALID', itemAction: itemActionPayload.action };
        return HttpResponse.json({ result: state, isSuccess: true, statusCode: 200 });
      })
    );

    render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <Routes>
          <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Go to RECEIVED_INSPECT and inspect RET-2STEP-01
    fireEvent.click(await screen.findByText(/Hàng đã về, chờ kiểm · 1/i));
    fireEvent.click(await screen.findByRole('button', { name: /Kiểm tra hàng/i }));

    const fileInput = await screen.findByLabelText(/Tải ảnh bằng chứng kiểm hàng/i);
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['a'], 'ev1.jpg', { type: 'image/jpeg' }),
          new File(['b'], 'ev2.jpg', { type: 'image/jpeg' }),
        ],
      },
    });
    await screen.findByText(/2 \/ 5 ảnh đã tải lên/i);

    fireEvent.click(screen.getByLabelText(/Hợp lệ — hoàn tiền cho người mua/i));
    fireEvent.click(screen.getByText(/Lưu kết luận/i));

    // Step 1: resolve called with resolution = VALID and NO action; modal shows Bước 2 / 2
    await screen.findByText(/Chọn phương án xử lý món hàng/i);
    expect(resolveCalls).toBe(1);
    expect(resolvePayload.resolution).toBe('VALID');
    expect(resolvePayload.action).toBeUndefined();
    expect(screen.getByText(/Bước 2 \/ 2/i)).toBeInTheDocument();

    // Defer Step 2 with "Để sau" and return to queue
    fireEvent.click(screen.getByRole('button', { name: /Để sau/i }));
    fireEvent.click(screen.getByTitle('Quay lại hàng đợi'));

    // Switch to RESOLVED tab: RET-2STEP-01 shows "Chọn xử lý món"; degraded RET-DEG-VALID does NOT
    fireEvent.click(await screen.findByText(/Đã xong tuần này · 2/i));
    expect(await screen.findByText(/Đã hoàn tiền · Chờ xử lý món/i)).toBeInTheDocument();
    const chooseActionBtns = screen.getAllByRole('button', { name: /Chọn xử lý món/i });
    expect(chooseActionBtns).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Biên bản xuống cấp/i })).toBeInTheDocument();

    // Resume Step 2 from queue -> POST /return-requests/:id/item-action with exact { action: 'RELIST' }
    fireEvent.click(chooseActionBtns[0]);
    await screen.findByText(/Chọn phương án xử lý món hàng/i);
    fireEvent.click(screen.getByText(/Đăng bán lại \(Relist\)/i));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xử lý' }));

    await waitFor(() => {
      expect(itemActionPayload).toEqual({ action: 'RELIST' });
    });
    expect(resolveCalls).toBe(1);
  });
});
