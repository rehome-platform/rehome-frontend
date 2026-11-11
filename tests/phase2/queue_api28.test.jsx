import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import { queueService } from '../../src/features/moderator/services/queueApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'mod-a', role: 'moderator', warehouseId: 'wh-a' } }),
}));

const server = setupServer();
const queuesUrl = `${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`;
const ok = (result) => HttpResponse.json({ isSuccess: true, result });
const withdrawal = {
  id: 'queue-w', type: 'WITHDRAWAL', refId: 'withdrawal-1',
  targetName: 'Áo len', subjectSubtitle: 'Nguyễn An',
  accountId: 'account-1', memberCode: 'MB-001', claimedBy: 'mod-a',
  status: 'PENDING_PICKUP', createdAt: '2026-11-11T00:00:00Z',
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage(page, url = '/moderator/queue') {
  return render(<MemoryRouter initialEntries={[url]}><Phase2Provider>{page}</Phase2Provider></MemoryRouter>);
}

describe('API 28 queue contract', () => {
  it('preserves withdrawal identity fields from the API', async () => {
    server.use(http.get(queuesUrl, () => ok([withdrawal])));
    const items = await queueService.list({ type: 'WITHDRAWAL' });
    expect(items[0]).toMatchObject({ queueId: 'queue-w', refId: 'withdrawal-1', accountId: 'account-1', memberCode: 'MB-001' });
  });

  it('shows Member code separately in the withdrawal row and check modal, with identical counter links', async () => {
    server.use(http.get(queuesUrl, () => ok([withdrawal])));
    renderPage(<ConsignmentQueuePage />);
    const row = (await screen.findByText('Áo len')).closest('tr');
    expect(within(row).getByText('Nguyễn An')).toBeInTheDocument();
    expect(within(row).getByText('MB-001')).toBeInTheDocument();
    const openHref = within(row).getByRole('link', { name: 'Mở việc' }).getAttribute('href');
    fireEvent.click(within(row).getByRole('button', { name: 'Check đơn' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Nguyễn An')).toBeInTheDocument();
    expect(within(dialog).getByText('MB-001')).toBeInTheDocument();
    const counterHref = within(dialog).getByRole('link', { name: /Đến Quầy bàn giao/ }).getAttribute('href');
    expect(counterHref).toBe(openHref);
    expect(new URL(counterHref, 'http://localhost').searchParams.get('accountId')).toBe('account-1');
    expect(new URL(counterHref, 'http://localhost').searchParams.get('refId')).toBe('withdrawal-1');
    expect(new URL(counterHref, 'http://localhost').searchParams.get('memberCode')).toBe('MB-001');
  });

  it('omits Member code when absent and still preserves accountId in the modal link', async () => {
    server.use(http.get(queuesUrl, () => ok([{ ...withdrawal, memberCode: null }])));
    renderPage(<ConsignmentQueuePage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Check đơn' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Nguyễn An')).toBeInTheDocument();
    expect(within(dialog).queryByText(/Mã Member/)).not.toBeInTheDocument();
    const href = within(dialog).getByRole('link', { name: /Đến Quầy bàn giao/ }).getAttribute('href');
    expect(new URL(href, 'http://localhost').searchParams.get('accountId')).toBe('account-1');
    expect(new URL(href, 'http://localhost').searchParams.has('memberCode')).toBe(false);
  });

  it('lists backend PENDING returns and uses queue ID for claim/release and return ID for opening work', async () => {
    let claimedBy = null;
    const requests = [];
    server.use(
      http.get(queuesUrl, ({ request }) => {
        requests.push(new URL(request.url).searchParams.get('type'));
        return ok([{ id: 'queue-r', type: 'RETURN', refId: 'return-1', targetName: 'DH-001', subjectSubtitle: 'Seller / Buyer', claimedBy, createdAt: '2026-11-11T00:00:00Z' }]);
      }),
      http.post(`${API_BASE_URL}/queues/:id/claim`, ({ params }) => {
        expect(params.id).toBe('queue-r');
        claimedBy = 'mod-a';
        return ok({ id: 'queue-r', claimedBy });
      }),
      http.post(`${API_BASE_URL}/queues/:id/release`, ({ params }) => {
        expect(params.id).toBe('queue-r');
        claimedBy = null;
        return ok(null);
      }),
    );
    renderPage(<ConsignmentQueuePage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Trả hàng' }));
    let row = (await screen.findByText('DH-001')).closest('tr');
    await waitFor(() => expect(requests).toContain('RETURN'));
    fireEvent.click(within(row).getByRole('button', { name: 'Nhận việc' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nhận việc' }));
    expect(await screen.findByRole('link', { name: 'Mở việc' })).toHaveAttribute('href', '/moderator/returns?id=return-1');
    expect(screen.getByRole('alert')).toHaveTextContent('Trả hàng');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Kiểm định');
    row = screen.getByRole('link', { name: 'Mở việc' }).closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: 'Nhả việc' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nhả việc' }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Mở việc' })).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Nhận việc' })).toBeInTheDocument();
  });

  it('preserves an empty RETURN response', async () => {
    server.use(http.get(queuesUrl, () => ok([])));
    renderPage(<ConsignmentQueuePage />, '/moderator/queue?type=RETURN');
    expect(await screen.findByText('Chưa có dữ liệu phù hợp.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nhận việc' })).not.toBeInTheDocument();
  });

  it('prefers memberCode when both Member identifiers are present at the counter', async () => {
    let lookupBody;
    server.use(http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP}`, async ({ request }) => {
      lookupBody = await request.json();
      return ok({ accountId: 'account-1', memberCode: 'MB-001', fullName: 'Nguyễn An' });
    }));
    renderPage(<CounterPage />, '/moderator/counter?memberCode=MB-001&accountId=account-1');
    expect((await screen.findAllByText('Nguyễn An')).length).toBeGreaterThan(0);
    expect(lookupBody).toEqual({ memberCode: 'MB-001' });
  });

  it('asks for a supported lookup instead of sending accountId as a Member code', async () => {
    let lookupCount = 0;
    server.use(http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP}`, () => {
      lookupCount += 1;
      return ok({ accountId: 'account-1', memberCode: 'MB-001', fullName: 'Nguyễn An' });
    }));
    renderPage(<CounterPage />, '/moderator/counter?accountId=account-1&refId=withdrawal-1');
    expect(await screen.findByRole('status')).toHaveTextContent('Nhập mã Member hoặc số điện thoại');
    expect(screen.getByPlaceholderText(/MB-0000000/)).toHaveValue('');
    expect(lookupCount).toBe(0);
    fireEvent.change(screen.getByPlaceholderText(/MB-0000000/), { target: { value: 'MB-001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }));
    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument();
    expect(lookupCount).toBe(1);
  });
});
