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

  it('shows item photo, name, SKU, Member and Duyệt/Từ chối for PENDING_APPROVAL withdrawal, then transitions to handover after approve', async () => {
    let status = 'PENDING_APPROVAL';
    let approveCalled = false;
    server.use(
      http.get(queuesUrl, () => ok([{
        ...withdrawal,
        status,
        sku: 'WH-Q7-AK2-000018',
        productImageUrl: 'https://img.test/ao-len.jpg',
      }])),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.APPROVE_WITHDRAWAL('withdrawal-1')}`, () => {
        approveCalled = true;
        status = 'PENDING_PICKUP';
        return ok({ id: 'withdrawal-1', status: 'PENDING_PICKUP', pickupDeadline: '2026-11-18T00:00:00Z', feeCharged: 0 });
      }),
    );

    renderPage(<ConsignmentQueuePage />);
    const row = (await screen.findByText('Áo len')).closest('tr');
    expect(within(row).getByText('Chờ duyệt')).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: 'Mở việc' })).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole('button', { name: 'Duyệt yêu cầu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Áo len' })).toHaveAttribute('src', 'https://img.test/ao-len.jpg');
    expect(within(dialog).getByText('WH-Q7-AK2-000018')).toBeInTheDocument();
    expect(within(dialog).getByText('Nguyễn An')).toBeInTheDocument();
    expect(within(dialog).getByText('MB-001')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: /Đến Quầy bàn giao/ })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(approveCalled).toBe(true));
    expect(await within(dialog).findByRole('link', { name: /Đến Quầy bàn giao/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: 'Mở việc' })).toHaveAttribute('href', expect.stringContaining('/moderator/counter')));
  });

  it('requires a reason when rejecting a PENDING_APPROVAL withdrawal and posts reason to backend', async () => {
    let items = [{
      ...withdrawal,
      status: 'PENDING_APPROVAL',
      sku: 'WH-Q7-AK2-000018',
      productImageUrl: 'https://img.test/ao-len.jpg',
    }];
    let rejectBody = null;
    server.use(
      http.get(queuesUrl, () => ok(items)),
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.REJECT_WITHDRAWAL('withdrawal-1')}`, async ({ request }) => {
        rejectBody = await request.json();
        items = [];
        return ok({ id: 'withdrawal-1', status: 'REJECTED', rejectReason: rejectBody.reason });
      }),
    );

    renderPage(<ConsignmentQueuePage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Duyệt yêu cầu' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận từ chối' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Vui lòng nhập lý do từ chối');
    expect(rejectBody).toBeNull();

    fireEvent.change(within(dialog).getByLabelText(/Lý do từ chối/), { target: { value: '  Sản phẩm đang giữ cho đơn hàng khác  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận từ chối' }));
    await waitFor(() => expect(rejectBody).toEqual({ reason: 'Sản phẩm đang giữ cho đơn hàng khác' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
