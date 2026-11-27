import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import ReConsignNegotiationPage from '../../src/features/moderator/pages/ReConsignNegotiationPage.jsx';
import EndOfTermPage from '../../src/features/moderator/pages/EndOfTermPage.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';

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
  sessionStorage.clear();
});

function Wrapper({ initialEntries, children }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Phase2Provider scope={{ userId: 'mod-01', warehouseId: 'wh-main' }}>
          {children}
        </Phase2Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Re-consign counter-offer & pending-pricing flow (Spec Item 3)', () => {
  it('handles COUNTER_OFFERED with negotiationHistory, ACCEPT/REPROPOSE/KEEP, and RE_CONSIGN_NOT_COUNTERED / INVALID_FLOOR_PRICE errors', async () => {
    let counterPayloads = [];
    let nextCallError = null;
    const oldCounterDate = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();

    server.use(
      http.get(`${API_BASE_URL}/products/SKU-RC-1`, () =>
        HttpResponse.json({
          result: {
            id: 'SKU-RC-1',
            name: 'Túi xách da Coach',
            status: 'WAREHOUSE',
            currentTerm: 3,
            daysIntoTerm: 30,
            currentPrice: 900000,
            floorPrice: 450000,
            newReceiptId: 'rc-prev-1',
          },
          isSuccess: true,
          statusCode: 200,
        }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.PENDING_PRICING}`, () =>
        HttpResponse.json({
          result: [
            {
              decisionId: 'dec-rc-1',
              productId: 'SKU-RC-1',
              productName: 'Túi xách da Coach',
              currentPrice: 900000,
              previousAgreedPrice: 1200000,
              reConsignStatus: 'COUNTER_OFFERED',
              memberCounterPrice: 1050000,
              memberCounterNote: 'Túi còn mới nguyên tag, mong giữ giá hơn 1 triệu',
              counteredAt: oldCounterDate,
              counterRoundsUsed: 1,
              maxCounterRounds: 2,
              newReceiptId: 'rc-prev-1',
              negotiationHistory: [
                {
                  actor: 'MODERATOR',
                  action: 'PROPOSE',
                  price: 900000,
                  note: 'Giá đề xuất vòng 1',
                  createdAt: '2026-11-23T08:00:00Z',
                },
                {
                  actor: 'MEMBER',
                  action: 'COUNTER',
                  price: 1050000,
                  note: 'Túi còn mới nguyên tag, mong giữ giá hơn 1 triệu',
                  createdAt: oldCounterDate,
                },
              ],
            },
          ],
          isSuccess: true,
          statusCode: 200,
        }),
      ),
      http.post(`${API_BASE_URL}/end-of-term-decisions/dec-rc-1/counter-response`, async ({ request }) => {
        const body = await request.json();
        counterPayloads.push(body);
        if (nextCallError === 'INVALID_FLOOR_PRICE') {
          nextCallError = null;
          return HttpResponse.json(
            { code: 'INVALID_FLOOR_PRICE', message: 'Giá sàn phải lớn hơn 0 và không vượt quá giá thỏa thuận.', statusCode: 400 },
            { status: 400 },
          );
        }
        if (nextCallError === 'RE_CONSIGN_NOT_COUNTERED') {
          nextCallError = null;
          return HttpResponse.json(
            { code: 'RE_CONSIGN_NOT_COUNTERED', message: 'Yêu cầu không còn ở trạng thái COUNTER_OFFERED.', statusCode: 409 },
            { status: 409 },
          );
        }
        return HttpResponse.json({
          result: { decisionId: 'dec-rc-1', newReceiptId: 'rc-new-2', reConsignStatus: 'PROPOSED' },
          isSuccess: true,
          statusCode: 200,
        });
      }),
    );

    render(
      <Wrapper initialEntries={['/moderator/inventory/SKU-RC-1/re-consign']}>
        <Routes>
          <Route path="/moderator/inventory/:sku/re-consign" element={<ReConsignNegotiationPage />} />
        </Routes>
      </Wrapper>,
    );

    expect(await screen.findByText(/MEMBER ĐỀ XUẤT GIÁ KHÁC/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã quá 2 ngày kể từ lúc Member trả giá/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1\.050\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lịch sử thương lượng giá')).toBeInTheDocument();
    expect(screen.getByText('Moderator đề xuất giá')).toBeInTheDocument();
    expect(screen.getAllByText('Member trả giá').length).toBeGreaterThanOrEqual(2);

    // Test REPROPOSE + INVALID_FLOOR_PRICE error from BE
    fireEvent.click(screen.getByLabelText(/Đề xuất giá mới khác/i));
    fireEvent.change(screen.getByLabelText(/^Giá đề xuất mới$/i), { target: { value: '980000' } });
    fireEvent.change(screen.getByLabelText(/^Giá sàn mới$/i), { target: { value: '500000' } });
    fireEvent.change(screen.getByLabelText(/^Ghi chú phản hồi gửi Member$/i), { target: { value: 'Chốt 980k hợp lý hơn' } });

    nextCallError = 'INVALID_FLOOR_PRICE';
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi cho Member' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Giá sàn không hợp lệ/i);
    });

    // Test RE_CONSIGN_NOT_COUNTERED error
    nextCallError = 'RE_CONSIGN_NOT_COUNTERED';
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi cho Member' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/không còn ở trạng thái Member trả giá/i);
    });

    // Test ACCEPT action
    fireEvent.click(screen.getByLabelText(/Chấp nhận giá Member/i));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi cho Member' }));

    await waitFor(() => {
      expect(counterPayloads[2]).toEqual({
        action: 'ACCEPT',
        moderatorNote: 'Chốt 980k hợp lý hơn',
      });
      expect(screen.getByText(/Đã chấp nhận mức giá Member đề xuất/i)).toBeInTheDocument();
    });

    // Test KEEP success
    fireEvent.click(screen.getByLabelText(/Giữ nguyên giá đã đề xuất/i));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi cho Member' }));

    await waitFor(() => {
      expect(counterPayloads[3]).toEqual({
        action: 'KEEP',
        moderatorNote: 'Chốt 980k hợp lý hơn',
      });
      expect(screen.getByText(/Đã giữ nguyên giá cũ/i)).toBeInTheDocument();
    });
  });

  it('renders DECLINED and EXPIRED states cleanly on ReConsignNegotiationPage', async () => {
    let status = 'DECLINED';
    server.use(
      http.get(`${API_BASE_URL}/products/SKU-DEC-1`, () =>
        HttpResponse.json({
          result: {
            id: 'SKU-DEC-1',
            name: 'Váy lụa Mango',
            status: 'WITHDRAWN',
            currentPrice: 300000,
            endOfTermDecision: {
              id: 'dec-2',
              reConsignStatus: status,
              declineReason: 'Giá hơi thấp so với kỳ vọng',
              declinedAt: '2026-11-26T10:00:00Z',
              pickupDeadline: '2026-12-03T10:00:00Z',
            },
          },
          isSuccess: true,
          statusCode: 200,
        }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.PENDING_PRICING}`, () =>
        HttpResponse.json({ result: [], isSuccess: true, statusCode: 200 }),
      ),
    );

    const view = render(
      <Wrapper initialEntries={['/moderator/inventory/SKU-DEC-1/re-consign']}>
        <Routes>
          <Route path="/moderator/inventory/:sku/re-consign" element={<ReConsignNegotiationPage />} />
        </Routes>
      </Wrapper>,
    );

    expect(await screen.findByText(/MEMBER KHÔNG ĐỒNG Ý/i)).toBeInTheDocument();
    expect(screen.getByText(/Giá hơi thấp so với kỳ vọng/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mở Quầy tiếp nhận/i })).toBeInTheDocument();

    status = 'EXPIRED';
    fireEvent.click(screen.getByRole('button', { name: /Tải lại/i }));
    expect(await screen.findByRole('heading', { name: /QUÁ HẠN XÁC NHẬN/i })).toBeInTheDocument();
    view.unmount();
  });

  it('EndOfTermPage displays pending-pricing list with status column, COUNTER_OFFERED on top, and red highlight when > 2 days', async () => {
    const overdueTime = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, () =>
        HttpResponse.json({ content: [], totalElements: 0, totalPages: 0 }),
      ),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.PENDING_PRICING}`, () =>
        HttpResponse.json({
          result: [
            {
              decisionId: 'dec-wait',
              productId: 'SKU-AWAIT',
              productName: 'Áo sơ mi Linen',
              currentPrice: 250000,
              previousAgreedPrice: 320000,
              reConsignStatus: 'AWAITING_PRICE',
              decidedAt: '2026-11-26T08:00:00Z',
            },
            {
              decisionId: 'dec-counter',
              productId: 'SKU-COUNTER',
              productName: 'Giày boot da',
              currentPrice: 600000,
              previousAgreedPrice: 800000,
              reConsignStatus: 'COUNTER_OFFERED',
              memberCounterPrice: 700000,
              counteredAt: overdueTime,
            },
          ],
          isSuccess: true,
          statusCode: 200,
        }),
      ),
    );

    render(
      <Wrapper initialEntries={['/moderator/end-of-term']}>
        <Routes>
          <Route path="/moderator/end-of-term" element={<EndOfTermPage />} />
        </Routes>
      </Wrapper>,
    );

    expect(await screen.findByText('Danh sách ký gửi lại – chờ chốt giá mới')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    // Header row + 2 data rows: COUNTER_OFFERED must come first
    expect(rows[1]).toHaveTextContent('Giày boot da');
    expect(rows[1]).toHaveTextContent('Member trả giá');
    expect(rows[1]).toHaveTextContent('Quá 2 ngày chưa phản hồi');
    expect(rows[1].className).toContain('border-l-[#B42318]');
    expect(rows[2]).toHaveTextContent('Áo sơ mi Linen');
    expect(rows[2]).toHaveTextContent('Chờ chốt giá');
  });

  it('ConsignmentQueuePage supports QueueType.RECONSIGN_COUNTER tab and links to re-consign page', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('type') !== 'RECONSIGN_COUNTER') {
          return HttpResponse.json({ result: [], isSuccess: true, statusCode: 200 });
        }
        return HttpResponse.json({
          result: [
            {
              id: 'q-rc-1',
              type: 'RECONSIGN_COUNTER',
              refId: 'dec-rc-1',
              sku: 'SKU-RC-1',
              targetName: 'Túi xách da Coach',
              subjectSubtitle: 'Nguyễn Văn A',
              claimedBy: 'mod-01',
              createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
            },
          ],
          isSuccess: true,
          statusCode: 200,
        });
      }),
    );

    render(
      <Wrapper initialEntries={['/moderator/queue?type=RECONSIGN_COUNTER']}>
        <Routes>
          <Route path="/moderator/queue" element={<ConsignmentQueuePage />} />
        </Routes>
      </Wrapper>,
    );

    expect(screen.getByRole('tab', { name: 'Trả giá ký gửi lại' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('Phản hồi trả giá ký gửi lại')).toBeInTheDocument();
    const respondLink = screen.getByRole('link', { name: 'Phản hồi giá' });
    expect(respondLink).toHaveAttribute('href', '/moderator/inventory/SKU-RC-1/re-consign');
  });
});
