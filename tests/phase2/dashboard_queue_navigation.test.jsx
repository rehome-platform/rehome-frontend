import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { consignmentService, inventoryService, queueService } from '../../src/features/moderator/services/warehouseApi.js';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import ConsignmentDetailPage from '../../src/features/moderator/pages/ConsignmentDetailPage.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' },
  }),
}));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderApp(entry = '/moderator') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Phase2Provider>
        <Location />
        <Routes>
          <Route path="/moderator" element={<WarehouseHomePage />} />
          <Route path="/moderator/queue" element={<ConsignmentQueuePage />} />
          <Route path="/moderator/packing" element={<p>Đóng gói</p>} />
          <Route path="/moderator/consignments/:formId" element={<ConsignmentDetailPage />} />
        </Routes>
      </Phase2Provider>
    </MemoryRouter>,
  );
}

const task = (type = 'FORM_REVIEW') => ({
  queueId: 'queue /1', formId: 'form-1', orderId: 'order /1', type,
  claimedBy: 'mod-a', createdAt: '2026-10-01T00:00:00Z',
});

const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: () => {} });
});
afterAll(() => {
  if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll);
  else delete Element.prototype.scrollIntoView;
});

beforeEach(() => {
  vi.spyOn(inventoryService, 'list').mockResolvedValue([]);
  vi.spyOn(consignmentService, 'read').mockResolvedValue(null);
});

describe('Open dashboard tasks in the queue', () => {
  it.each(['FORM_REVIEW', 'INSPECTION'])('opens and highlights %s without reading form details', async (type) => {
    vi.spyOn(queueService, 'list').mockImplementation(async (params) => params.type === type ? [task(type)] : []);
    const scroll = vi.fn();
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(scroll);
    renderApp();
    await userEvent.click(await screen.findByRole('link', { name: 'Mở', exact: true }));
    const location = screen.getByTestId('location').textContent;
    expect(location.split('?')[0]).toBe('/moderator/queue');
    const query = new URLSearchParams(location.split('?')[1]);
    expect(query.get('type')).toBe(type);
    expect(query.get('queueId')).toBe('queue /1');
    const row = (await screen.findByText('Việc vừa mở')).closest('tr');
    expect(within(row).getByRole('checkbox')).not.toBeChecked();
    expect(within(row).getByRole('button', { name: 'Nhả việc' })).toBeEnabled();
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(consignmentService.read).not.toHaveBeenCalled();
  });

  it('keeps the packing destination and encoded order id', async () => {
    vi.spyOn(queueService, 'list').mockImplementation(async ({ type }) => type === 'PACKING' ? [task(type)] : []);
    renderApp();
    await userEvent.click(await screen.findByRole('link', { name: 'Mở', exact: true }));
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator/packing?orderId=order%20%2F1');
    expect(consignmentService.read).not.toHaveBeenCalled();
  });

  it('restores the highlight from the URL on a fresh mount', async () => {
    vi.spyOn(queueService, 'list').mockResolvedValue([task()]);
    const entry = '/moderator/queue?type=FORM_REVIEW&queueId=queue+%2F1';
    const first = renderApp(entry);
    await screen.findByText('Việc vừa mở');
    first.unmount();
    renderApp(entry);
    expect(await screen.findByText('Việc vừa mở')).toBeInTheDocument();
    expect(consignmentService.read).not.toHaveBeenCalled();
  });

  it.each([{ items: [] }, { items: [task()] }])('reports a missing task after a successful load: $items.length items', async ({ items }) => {
    vi.spyOn(queueService, 'list').mockResolvedValue(items);
    renderApp('/moderator/queue?type=FORM_REVIEW&queueId=gone');
    expect(await screen.findByText('Công việc không còn trong hàng đợi hiện tại')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại', exact: true })).toBeEnabled();
    if (items.length) expect(screen.getByText('form-1')).toBeInTheDocument();
    expect(consignmentService.read).not.toHaveBeenCalled();
  });

  it('keeps load failures distinct from a missing task and supports retry', async () => {
    vi.spyOn(queueService, 'list')
      .mockRejectedValueOnce(new Phase2Error('Không tải được hàng đợi', 500))
      .mockResolvedValue([task()]);
    renderApp('/moderator/queue?type=FORM_REVIEW&queueId=queue+%2F1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được hàng đợi');
    expect(screen.queryByText('Công việc không còn trong hàng đợi hiện tại')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tải lại', exact: true }));
    expect(await screen.findByText('Việc vừa mở')).toBeInTheDocument();
  });

  it('does not show missing-task feedback while loading', async () => {
    let resolve;
    vi.spyOn(queueService, 'list').mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderApp('/moderator/queue?type=FORM_REVIEW&queueId=gone');
    expect(await screen.findByText('Đang tải dữ liệu…')).toBeInTheDocument();
    expect(screen.queryByText('Công việc không còn trong hàng đợi hiện tại')).not.toBeInTheDocument();
    resolve([]);
    await screen.findByText('Công việc không còn trong hàng đợi hiện tại');
  });

  it('hides passed form data and claim status when the detail API denies access', async () => {
    consignmentService.read.mockRejectedValue(new Phase2Error('Forbidden', 403));
    renderApp({
      pathname: '/moderator/consignments/form-1',
      state: { form: { ...task(), name: 'Dữ liệu cũ', status: 'PENDING' } },
    });
    await screen.findByText('Tài khoản hiện tại chưa được phép xem chi tiết ký gửi này');
    expect(screen.queryByText('BẠN ĐANG NHẬN VIỆC NÀY')).not.toBeInTheDocument();
    expect(screen.queryByText(/Dữ liệu cũ/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt form' })).not.toBeInTheDocument();
  });
});
