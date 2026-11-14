import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { WarehouseHistoryTabs } from '../../src/features/moderator/components/WarehouseHistoryTabs.jsx';
import { warehouseHistoryService } from '../../src/features/moderator/services/warehouseHistoryApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({
  user: { id: 'mod', warehouseId: 'warehouse-a' }, isAuthenticated: true,
}) }));

function mount(url = '/moderator/packing?view=history') {
  return render(<MemoryRouter initialEntries={[url]}><Phase2Provider>
    <WarehouseHistoryTabs type="PACKING"><p>Đang làm việc</p></WarehouseHistoryTabs>
  </Phase2Provider></MemoryRouter>);
}
it('loads persistent history from the server on reload and paginates separately from the queue', async () => {
  const list = vi.spyOn(warehouseHistoryService, 'list').mockImplementation(async (_, params) => ({
    content: [{ id: `event-${params.page}`, actionType: 'CREATE_SHIPMENT', targetType: 'ORDER',
      targetId: 'o1', targetLabel: `DH-${params.page}`, actorName: 'Nhân viên A',
      createdAt: '2026-11-14T01:00:00Z', result: 'SUCCESS' }], totalPages: 2,
  }));
  const first = mount();
  await screen.findByText('DH-0');
  expect(screen.getByText('Nhân viên A')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
  await screen.findByText('DH-1');
  expect(list).toHaveBeenLastCalledWith('PACKING', { page: 1, size: 20 }, expect.any(Object));
  first.unmount();
  mount('/moderator/packing?view=history&historyPage=1');
  await screen.findByText('DH-1');
});
it('does not fetch history on the work tab; handles errors and retry without fake rows', async () => {
  const list = vi.spyOn(warehouseHistoryService, 'list').mockRejectedValueOnce(new Error('Không tải được lịch sử'))
    .mockResolvedValue({ content: [], totalPages: 0 });
  mount('/moderator/packing');
  expect(list).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Lịch sử' }));
  await screen.findByText('Không tải được lịch sử');
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại lịch sử' }));
  await waitFor(() => expect(screen.getByText('Chưa có lịch sử thao tác.')).toBeInTheDocument());
});
