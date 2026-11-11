import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { consignmentService, inventoryService, queueService } from '../../src/features/moderator/services/warehouseApi.js';
import ConsignmentDetailPage from '../../src/features/moderator/pages/ConsignmentDetailPage.jsx';
import InventoryDetailPage from '../../src/features/moderator/pages/InventoryDetailPage.jsx';
import { CounterHandoverTask } from '../../src/features/moderator/components/counter/CounterHandoverTask.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' },
    isAuthenticated: true,
  }),
}));

const pendingForm = {
  id: 'form-deadline', formId: 'form-deadline', name: 'Áo ký gửi',
  status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'], claimedBy: 'mod-a',
};

function renderPage(path, route, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Phase2Provider>
        <Routes><Route path={route} element={element} /></Routes>
      </Phase2Provider>
    </MemoryRouter>,
  );
}

describe('Moderator uses stored consignment deadlines', () => {
  it.each([
    ['approval response', { bringInDeadline: '2026-12-19' }],
    ['detail reload', {}],
  ])('shows the actual deadline from %s after approval', async (_, response) => {
    const approved = {
      ...pendingForm, status: 'APPROVED', allowedActions: [],
      bringInDeadline: '2026-12-19', bringDeadline: '2026-12-19',
    };
    vi.spyOn(consignmentService, 'read')
      .mockResolvedValueOnce(pendingForm).mockResolvedValue(approved);
    vi.spyOn(queueService, 'approve').mockResolvedValue({ status: 'APPROVED', ...response });

    renderPage('/moderator/consignments/form-deadline', '/moderator/consignments/:formId', <ConsignmentDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Duyệt form/ }));

    expect(await screen.findByText(/Đã duyệt form ký gửi thành công.*19\/12\/2026/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Hạn mang đến kho').parentElement).toHaveTextContent('19/12/2026');
    });
    expect(screen.queryByText(/có 7 ngày/)).not.toBeInTheDocument();
  });

  it.each(['missing', 'failed'])('keeps approval successful when the detail deadline is %s', async (scenario) => {
    const read = vi.spyOn(consignmentService, 'read').mockResolvedValueOnce(pendingForm);
    if (scenario === 'failed') read.mockRejectedValue(new Error('Detail unavailable'));
    else read.mockResolvedValue({ ...pendingForm, status: 'APPROVED', allowedActions: [] });
    vi.spyOn(queueService, 'approve').mockResolvedValue({ status: 'APPROVED' });

    renderPage('/moderator/consignments/form-deadline', '/moderator/consignments/:formId', <ConsignmentDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Duyệt form/ }));

    expect(await screen.findByText('Đã duyệt form ký gửi thành công!')).toBeInTheDocument();
    expect(screen.queryByText(/có 7 ngày/)).not.toBeInTheDocument();
  });

  it.each([
    [{}, 'Chưa có thông tin thời hạn'],
    [{ deadline: '2026-12-19T10:00:00Z' }, '19/12/2026'],
  ])('shows counter deadline data without inventing a duration (%j)', (item, expected) => {
    render(<CounterHandoverTask item={{ id: 'task-1', ...item }} context="END_OF_TERM_TAKE_BACK" setConfirmHandover={() => {}} />);
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
    expect(screen.queryByText(/30 ngày/)).not.toBeInTheDocument();
  });

  it.each([
    [undefined, undefined],
    [0, 'còn 0 ngày'],
    [12, 'còn 12 ngày'],
  ])('only shows remaining pickup days supplied by inventory (%s)', async (daysToTakeBack, expected) => {
    vi.spyOn(inventoryService, 'read').mockResolvedValue({
      id: 'product-1', sku: 'RH-1', name: 'Hàng cuối kỳ', decision: 'TAKE_BACK',
      status: 'WITHDRAWN', daysToTakeBack, degradedCaseId: null,
    });
    vi.spyOn(inventoryService, 'movements').mockResolvedValue([]);
    renderPage('/moderator/inventory/RH-1', '/moderator/inventory/:sku', <InventoryDetailPage />);

    const notice = await screen.findByText(/Khách đã chọn nhận lại hàng/);
    if (expected) expect(notice).toHaveTextContent(expected);
    else expect(notice).not.toHaveTextContent(/còn \d+ ngày/);
    expect(notice).not.toHaveTextContent('30 ngày');
  });
});
