import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect, vi, describe, beforeAll, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

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
    // API 25: POST /counter/lookup
    http.post(`${API_BASE_URL}/counter/lookup`, async ({ request }) => {
      const body = await request.json();
      if (body.memberCode === 'MB-004821' || body.phone === '0912345456') {
        return HttpResponse.json({
          result: [mockMember],
          isSuccess: true,
          statusCode: 200,
        });
      }
      return HttpResponse.json({
        result: [],
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // API 26: POST /counter/members/:id/confirm-identity
    http.post(`${API_BASE_URL}/counter/members/:id/confirm-identity`, async ({ params }) => {
      return HttpResponse.json({
        result: { memberId: params.id, confirmedAt: new Date().toISOString() },
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // API 27: GET /counter/members/:id/tasks
    http.get(`${API_BASE_URL}/counter/members/:id/tasks`, async () => {
      return HttpResponse.json({
        result: mockTasks,
        isSuccess: true,
        statusCode: 200,
      });
    }),

    // API 72: POST /counter/handover
    http.post(`${API_BASE_URL}/counter/handover`, async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        result: { handoverId: 'HO-999', ...body, completedAt: new Date().toISOString() },
        isSuccess: true,
        statusCode: 200,
        message: 'Bàn giao hiện vật tại quầy thành công',
      });
    })
  );
});

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/moderator/counter']}>
      <Phase2Provider scope={{ warehouseId: 'wh-main' }}>
        {children}
      </Phase2Provider>
    </MemoryRouter>
  );
}

describe('L-06 Withdrawal & Counter Handover Flow (BG-01, QT-01 to QT-03)', () => {
  it('QT-01 & QT-02: looks up member, confirms identity, and displays 4 task categories', async () => {
    render(
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    // Initial screen: QT-01 search
    expect(screen.getByText(/Tra cứu Member tại quầy/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });

    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    // Wait for search result and click "Chọn Member"
    await waitFor(() => {
      expect(screen.getByText(/Chọn Member MB-004821/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Chọn Member MB-004821/i));

    // QT-02 Identity panel shown
    await waitFor(() => {
      expect(screen.getByText(/Tôi đã đối chiếu đúng Member/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ngô Hải F/i).length).toBeGreaterThan(0);
    });

    // Click confirm identity
    fireEvent.click(screen.getByText(/Tôi đã đối chiếu đúng Member/i));

    // QT-03 Task groups shown: 4 categories
    await waitFor(() => {
      expect(screen.getByText(/Hồ sơ Member tại quầy/i)).toBeInTheDocument();
      // 1. Pending forms
      expect(screen.getByText(/1\. Tiếp nhận hàng ký gửi & Kiểm định/i)).toBeInTheDocument();
      // 2. Pending withdrawal (L-06)
      expect(screen.getByText(/hàng rút giữa kỳ/i)).toBeInTheDocument();
      expect(screen.getByText(/RH-K9B47T/i)).toBeInTheDocument();
      // 3. Pending end of term
      expect(screen.getByText(/hết kỳ ký gửi/i)).toBeInTheDocument();
      expect(screen.getByText(/RH-T3N77F/i)).toBeInTheDocument();
      // 4. Pending invalid return (L-05 RT-04)
      expect(screen.getByText(/Nhận lại hàng trả không hợp lệ/i)).toBeInTheDocument();
      expect(screen.getByText(/RH-CV882X/i)).toBeInTheDocument();
    });
  });

  it('BG-01: opens handover modal, requires SKU matching & identity check before enabling handover', async () => {
    render(
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    // Search and confirm member
    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Chọn Member MB-004821/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Chọn Member MB-004821/i));

    await waitFor(() => {
      expect(screen.getByText(/Tôi đã đối chiếu đúng Member/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Tôi đã đối chiếu đúng Member/i));

    // Find the withdrawal task and click "Bàn giao tại quầy"
    await waitFor(() => {
      expect(screen.getByText(/RH-K9B47T/i)).toBeInTheDocument();
    });

    const handoverBtns = screen.getAllByRole('button', { name: 'Bàn giao cho khách' });
    fireEvent.click(handoverBtns[0]); // First one is ITEM_WITHDRAWAL

    // Handover modal appears (internal code badge BG-01 removed per FE-06)
    await waitFor(() => {
      expect(screen.queryByText(/BG-01/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Xác nhận bàn giao hiện vật tại quầy/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Member rút hàng/i).length).toBeGreaterThan(0);
    });

    const confirmBtn = screen.getByRole('button', { name: /^Xác nhận bàn giao$/i });
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
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    // Search and confirm
    const input = screen.getByPlaceholderText(/MB-0000000/i);
    fireEvent.change(input, { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Chọn Member MB-004821/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Chọn Member MB-004821/i));

    await waitFor(() => screen.getByText(/Tôi đã đối chiếu đúng Member/i));
    fireEvent.click(screen.getByText(/Tôi đã đối chiếu đúng Member/i));

    // Find the invalid return task: RH-CV882X
    await waitFor(() => {
      expect(screen.getByText(/RH-CV882X/i)).toBeInTheDocument();
    });

    const handoverBtns = screen.getAllByRole('button', { name: 'Bàn giao cho khách' });
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

  it('does not show "Đã hoàn trả người bán" during PENDING_APPROVAL or PENDING_PICKUP and switches only after handover', async () => {
    let tasksState = {
      member: mockMember,
      pendingForms: [
        {
          id: 'form-w-approval',
          productName: 'Áo khoác gió Uniqlo chống nước',
          desiredPrice: 450000,
          status: 'APPROVED',
          productSku: 'HCM-AK-000018',
          productStatus: 'WAREHOUSE',
          activeWithdrawalId: 'w-approval-1',
          activeWithdrawalStatus: 'PENDING_APPROVAL',
          resumeStep: 'COMPLETED',
        },
      ],
      pendingWithdrawals: [],
      pendingEndOfTerm: [],
      pendingInvalidReturns: [],
    };

    server.use(
      http.get(`${API_BASE_URL}/counter/members/:id/tasks`, async () =>
        HttpResponse.json({ result: tasksState, isSuccess: true, statusCode: 200 }),
      ),
    );

    const { unmount } = render(
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    fireEvent.change(screen.getByPlaceholderText(/MB-0000000/i), { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Chọn Member MB-004821/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Tôi đã đối chiếu đúng Member/i }));

    await waitFor(() => {
      expect(screen.getByText('Áo khoác gió Uniqlo chống nước')).toBeInTheDocument();
    });
    expect(screen.getByText('Chờ duyệt rút hàng')).toBeInTheDocument();
    expect(screen.queryByText('Đã hoàn trả người bán')).not.toBeInTheDocument();
    unmount();

    // Case 2: Moderator approved (PENDING_PICKUP) with unpaid app fee -> blocks handover until Member pays on app and Moderator clicks "Tải lại"
    tasksState = {
      member: mockMember,
      pendingForms: [
        {
          id: 'form-w-pickup',
          productName: 'Áo khoác gió Uniqlo chống nước',
          desiredPrice: 450000,
          status: 'APPROVED',
          productSku: 'HCM-AK-000018',
          productStatus: 'WAREHOUSE',
          activeWithdrawalId: 'w-pickup-1',
          activeWithdrawalStatus: 'PENDING_PICKUP',
          resumeStep: 'COMPLETED',
        },
      ],
      pendingWithdrawals: [
        {
          id: 'w-pickup-1',
          productId: 'HCM-AK-000018',
          productName: 'Áo khoác gió Uniqlo chống nước',
          feeCharged: 50000,
          feePaid: false,
          feePaidAt: null,
        },
      ],
      pendingEndOfTerm: [],
      pendingInvalidReturns: [],
    };

    const handoverResultPromise = new Promise((resolve) => resolve());
    server.use(
      http.post(`${API_BASE_URL}/counter/handover`, async () => {
        await handoverResultPromise;
        tasksState = {
          member: mockMember,
          pendingForms: [
            {
              id: 'form-w-pickup',
              productName: 'Áo khoác gió Uniqlo chống nước',
              desiredPrice: 450000,
              status: 'APPROVED',
              productSku: 'HCM-AK-000018',
              productStatus: 'WITHDRAWN',
              activeWithdrawalId: null,
              activeWithdrawalStatus: null,
              resumeStep: 'COMPLETED',
            },
          ],
          pendingWithdrawals: [],
          pendingEndOfTerm: [],
          pendingInvalidReturns: [],
        };
        return HttpResponse.json({
          result: { completedAt: new Date().toISOString() },
          isSuccess: true,
          statusCode: 200,
        });
      }),
    );

    const view2 = render(
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    fireEvent.change(screen.getByPlaceholderText(/MB-0000000/i), { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Chọn Member MB-004821/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Tôi đã đối chiếu đúng Member/i }));

    await waitFor(() => {
      expect(screen.getByText('Chờ nhận lại')).toBeInTheDocument();
    });
    expect(screen.queryByText('Đã hoàn trả người bán')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bàn giao cho khách' }));
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận bàn giao hiện vật tại quầy/i)).toBeInTheDocument();
    });

    // Cash-collection checkbox removed; Option A warning alert shown instead
    expect(screen.queryByLabelText(/Xác nhận đã thu phí rút hàng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trực tiếp tại quầy/i)).not.toBeInTheDocument();

    const unpaidRegex = /Member chưa trả phí rút hàng 50\.000\s*₫\. Nhắc Member trả trên app ReHome \(Ví hoặc VNPay\), trả xong bấm Tải lại để bàn giao\./;
    const warningAlert = screen.getByRole('alert');
    expect(warningAlert).toHaveTextContent(unpaidRegex);

    fireEvent.click(screen.getByText(/Khớp nhanh/i));
    fireEvent.click(screen.getByLabelText(/Tôi đã hỏi và xác nhận đúng người nhận/i));

    const confirmBtn = screen.getByRole('button', { name: /^Xác nhận bàn giao$/i });
    expect(confirmBtn).toBeDisabled();

    // Member pays fee on mobile app -> Moderator clicks "Tải lại"
    tasksState = {
      ...tasksState,
      pendingWithdrawals: [
        {
          ...tasksState.pendingWithdrawals[0],
          feePaid: true,
          feePaidAt: '2026-11-27T05:05:00Z',
        },
      ],
    };
    fireEvent.click(within(warningAlert).getByRole('button', { name: /^Tải lại$/i }));

    await waitFor(() => {
      expect(confirmBtn).toBeEnabled();
    });
    expect(screen.queryByText(unpaidRegex)).not.toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText('Đã hoàn trả người bán')).toBeInTheDocument();
    });
    view2.unmount();

    // Case 3: Legacy row still having WITHDRAWN while SKU is in pendingWithdrawals -> still shows "Chờ nhận lại"
    tasksState = {
      member: mockMember,
      pendingForms: [
        {
          id: 'form-w-legacy',
          productName: 'Áo khoác gió Uniqlo chống nước',
          desiredPrice: 450000,
          status: 'APPROVED',
          productSku: 'HCM-AK-000018',
          productStatus: 'WITHDRAWN',
          resumeStep: 'COMPLETED',
        },
      ],
      pendingWithdrawals: [
        {
          id: 'w-legacy-1',
          productId: 'HCM-AK-000018',
          productName: 'Áo khoác gió Uniqlo chống nước',
          feeCharged: 0,
        },
      ],
      pendingEndOfTerm: [],
      pendingInvalidReturns: [],
    };

    render(
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    fireEvent.change(screen.getByPlaceholderText(/MB-0000000/i), { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Chọn Member MB-004821/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Tôi đã đối chiếu đúng Member/i }));

    await waitFor(() => {
      expect(screen.getByText('Chờ nhận lại')).toBeInTheDocument();
    });
    expect(screen.queryByText('Đã hoàn trả người bán')).not.toBeInTheDocument();
  });

  it('BG-01: displays unpaid withdrawal fee message when backend returns WITHDRAWAL_FEE_NOT_PAID', async () => {
    server.use(
      http.get(`${API_BASE_URL}/counter/members/:id/tasks`, async () =>
        HttpResponse.json({
          result: {
            member: mockMember,
            pendingForms: [],
            pendingWithdrawals: [
              {
                id: 'w-unpaid-race',
                productId: 'HCM-AK-000018',
                productName: 'Áo khoác gió Uniqlo chống nước',
                feeCharged: 50000,
                feePaid: true,
              },
            ],
            pendingEndOfTerm: [],
            pendingInvalidReturns: [],
          },
          isSuccess: true,
          statusCode: 200,
        }),
      ),
      http.post(`${API_BASE_URL}/counter/handover`, async () =>
        HttpResponse.json(
          {
            code: 'WITHDRAWAL_FEE_NOT_PAID',
            message:
              'Member chưa trả phí rút hàng. Nhắc Member trả trên app ReHome (Ví hoặc VNPay), trả xong bấm Tải lại để bàn giao.',
            isSuccess: false,
            statusCode: 409,
          },
          { status: 409 },
        ),
      ),
    );

    render(
      <Wrapper>
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
        </Routes>
      </Wrapper>
    );

    fireEvent.change(screen.getByPlaceholderText(/MB-0000000/i), { target: { value: 'MB-004821' } });
    fireEvent.click(screen.getByRole('button', { name: /^Tra cứu$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Chọn Member MB-004821/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Tôi đã đối chiếu đúng Member/i }));

    await waitFor(() => {
      expect(screen.getByText(/HCM-AK-000018/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Bàn giao cho khách' }));
    await waitFor(() => {
      expect(screen.getByText(/Xác nhận bàn giao hiện vật tại quầy/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Khớp nhanh/i));
    fireEvent.click(screen.getByLabelText(/Tôi đã hỏi và xác nhận đúng người nhận/i));
    fireEvent.click(screen.getByRole('button', { name: /^Xác nhận bàn giao$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Member chưa trả phí rút hàng 50\.000\s*₫\. Nhắc Member trả trên app ReHome \(Ví hoặc VNPay\), trả xong bấm Tải lại để bàn giao\./,
      );
    });
  });
});
