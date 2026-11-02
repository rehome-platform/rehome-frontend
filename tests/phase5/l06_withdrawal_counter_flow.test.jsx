import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect, vi, describe, beforeAll, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-01', accountId: 'mod-01', warehouseId: 'wh-main', role: 'moderator' },
    isAuthenticated: true,
  }),
}));

const mockMember = {
  memberId: 'mem-101',
  memberCode: 'MB-004821',
  fullName: 'Ngô Hải F',
  phone: '0912345456',
  email: 'haif@rehome.vn',
};

const mockTasks = {
  member: mockMember,
  pendingForms: [
    {
      formId: 'CF-1001',
      productName: 'Áo khoác dạ nữ Zara',
      desiredPrice: 450000,
      status: 'APPROVED',
    },
  ],
  pendingWithdrawals: [
    {
      productId: 'PROD-201',
      productName: 'Áo khoác denim Zara',
      sku: 'RH-K9B47T',
      brand: 'Zara',
      location: 'kệ A3-07',
      withdrawalReason: 'Khách muốn giữ lại sử dụng',
      withdrawalFee: 0,
      feeStatus: 'EXEMPT',
    },
  ],
  pendingEndOfTerm: [
    {
      productId: 'PROD-301',
      productName: 'Áo len cổ lọ Muji',
      sku: 'RH-T3N77F',
      brand: 'Muji',
      location: 'kệ A2-09',
      consignEndDate: '2026-10-30',
    },
  ],
  pendingInvalidReturns: [
    {
      returnId: 'RET-401',
      productName: 'Giày sneaker Converse',
      sku: 'RH-CV882X',
      carrierStatus: 'Lưu kho 7 ngày',
      warehouseDeadline: '2026-11-08',
      retrievalMethod: 'WAREHOUSE_PICKUP',
    },
  ],
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterAll(() => server.close());

beforeEach(() => {
  server.resetHandlers();

  server.use(
    // API 25: GET /counter/members
    http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_MEMBERS}`, async ({ request }) => {
      const url = new URL(request.url);
      const code = url.searchParams.get('memberCode');
      const phone = url.searchParams.get('phone');
      if (code === 'MB-004821' || phone === '0912345456') {
        return HttpResponse.json({
          result: [mockMember],
          isSuccess: true,
        });
      }
      return HttpResponse.json({
        result: [],
        isSuccess: true,
      });
    }),

    // API 26: GET /counter/members/:id/tasks
    http.get(`${API_BASE_URL}/counter/members/:id/tasks`, async () => {
      return HttpResponse.json({
        result: mockTasks,
        isSuccess: true,
      });
    }),

    // API 72: POST /counter/handover
    http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_HANDOVER}`, async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        result: { handoverId: 'HO-999', ...body, completedAt: new Date().toISOString() },
        isSuccess: true,
        message: 'Bàn giao hiện vật tại quầy thành công',
      });
    })
  );
});

describe('L-06 Withdrawal & Counter Handover Flow (BG-01, QT-01 to QT-03)', () => {
  it('QT-01 & QT-02: looks up member, confirms identity, and displays 4 task categories', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/counter']}>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial screen: QT-01 search
    expect(screen.getByText(/Tra cứu Member tại quầy/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });

    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    // QT-02 Identity panel shown
    await waitFor(() => {
      expect(screen.getByText(/Tôi đã đối chiếu đúng Member/i)).toBeInTheDocument();
      expect(screen.getByText(/Ngô Hải F/i)).toBeInTheDocument();
    });

    // Click confirm identity
    fireEvent.click(screen.getByText(/Tôi đã đối chiếu đúng Member/i));

    // QT-03 Task groups shown: 4 categories
    await waitFor(() => {
      expect(screen.getByText(/Hồ sơ Member tại quầy/i)).toBeInTheDocument();
      // 1. Pending forms
      expect(screen.getByText(/1\. Tiếp nhận hàng ký gửi & Kiểm định/i)).toBeInTheDocument();
      // 2. Pending withdrawal (L-06)
      expect(screen.getByText(/Member rút hàng giữa kỳ/i)).toBeInTheDocument();
      expect(screen.getByText(/RH-K9B47T/i)).toBeInTheDocument();
      // 3. Pending end of term
      expect(screen.getByText(/Nhận lại hàng cuối kỳ/i)).toBeInTheDocument();
      expect(screen.getByText(/RH-T3N77F/i)).toBeInTheDocument();
      // 4. Pending invalid return (L-05 RT-04)
      expect(screen.getByText(/Nhận lại hàng trả không hợp lệ/i)).toBeInTheDocument();
      expect(screen.getByText(/RH-CV882X/i)).toBeInTheDocument();
    });
  });

  it('BG-01: opens handover modal, requires SKU matching & identity check before enabling handover', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/counter']}>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Search and confirm member
    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tôi đã đối chiếu đúng Member/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Tôi đã đối chiếu đúng Member/i));

    // Find the withdrawal task and click "Bàn giao tại quầy"
    await waitFor(() => {
      expect(screen.getByText(/RH-K9B47T/i)).toBeInTheDocument();
    });

    const handoverBtns = screen.getAllByRole('button', { name: /Bàn giao tại quầy/i });
    fireEvent.click(handoverBtns[0]); // First one is ITEM_WITHDRAWAL

    // BG-01 Handover modal appears
    await waitFor(() => {
      expect(screen.getByText(/BG-01 · Bàn giao hiện vật tại quầy/i)).toBeInTheDocument();
      expect(screen.getByText(/Member rút hàng/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đã bàn giao/i });
    // Initially disabled because SKU is empty and checkbox is unchecked
    expect(confirmBtn).toBeDisabled();

    // Check identity box only
    const idCheckbox = screen.getByLabelText(/Tôi đã hỏi và xác nhận đúng người nhận/i);
    fireEvent.click(idCheckbox);
    expect(confirmBtn).toBeDisabled(); // Still disabled, SKU not matched

    // Click "Khớp nhanh" for SKU or type SKU
    const quickMatchBtn = screen.getByText(/Khớp nhanh/i);
    fireEvent.click(quickMatchBtn);

    // Now both SKU and identity are satisfied -> button enabled!
    expect(confirmBtn).toBeEnabled();

    // Execute handover
    fireEvent.click(confirmBtn);

    // Feedback alert shown
    await waitFor(() => {
      expect(screen.getByText(/Đã hoàn tất bàn giao/i)).toBeInTheDocument();
    });
  });

  it('BG-01: supports INVALID_RETURN_PICKUP handover with reason badge', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/counter']}>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Search and confirm
    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));
    await waitFor(() => screen.getByText(/Tôi đã đối chiếu đúng Member/i));
    fireEvent.click(screen.getByText(/Tôi đã đối chiếu đúng Member/i));

    // Find the invalid return task: RH-CV882X
    await waitFor(() => {
      expect(screen.getByText(/RH-CV882X/i)).toBeInTheDocument();
    });

    const handoverBtns = screen.getAllByRole('button', { name: /Bàn giao tại quầy/i });
    // Click the invalid return handover button (the third one)
    fireEvent.click(handoverBtns[2]);

    await waitFor(() => {
      expect(screen.getByText(/Người mua nhận hàng trả/i)).toBeInTheDocument();
    });

    // Match SKU and check identity
    fireEvent.click(screen.getByText(/Khớp nhanh/i));
    fireEvent.click(screen.getByLabelText(/Tôi đã hỏi và xác nhận đúng người nhận/i));

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận đã bàn giao/i });
    expect(confirmBtn).toBeEnabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã hoàn tất bàn giao/i)).toBeInTheDocument();
    });
  });
});
