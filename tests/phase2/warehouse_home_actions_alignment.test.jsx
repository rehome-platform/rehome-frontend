import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { inventoryService, queueService } from '../../src/features/moderator/services/warehouseApi.js';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import { formatWarehouseDisplayName } from '../../src/utils/formatters.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho ReHome TP.HCM' },
  }),
}));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/moderator']}>
      <Phase2Provider>
        <Routes>
          <Route path="/moderator" element={<WarehouseHomePage />} />
          <Route path="/moderator/queue" element={<p>Queue</p>} />
          <Route path="/moderator/packing" element={<p>Packing</p>} />
          <Route path="/moderator/counter" element={<p>Counter</p>} />
        </Routes>
      </Phase2Provider>
    </MemoryRouter>,
  );
}

describe('WarehouseHomePage action column alignment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(inventoryService, 'list').mockResolvedValue([]);
    vi.spyOn(queueService, 'list').mockResolvedValue([
      {
        queueId: 'q-unclaimed',
        formId: 'form-1',
        type: 'FORM_REVIEW',
        targetName: 'Tạ Thị Ngọc Anh',
        claimedBy: null,
        createdAt: '2026-11-27T05:00:00Z',
      },
      {
        queueId: 'q-mine',
        formId: 'form-2',
        type: 'INSPECTION',
        targetName: 'Lê Hoàng Cường',
        claimedBy: 'mod-a',
        createdAt: '2026-11-27T04:00:00Z',
      },
      {
        queueId: 'q-other',
        orderId: 'order-3',
        type: 'PACKING',
        targetName: 'Nguyễn Văn An',
        claimedBy: 'mod-other',
        createdAt: '2026-11-27T03:00:00Z',
      },
    ]);
  });

  it('uses fixed second grid track for claim/open/claimed-by-other slots so Xem chi tiết stays aligned across rows', async () => {
    renderHome();

    const actionCells = await screen.findAllByTestId('home-task-actions-cell');
    expect(actionCells).toHaveLength(3);
    actionCells.forEach((cell) => {
      expect(cell.className).toContain('inline-grid');
      expect(cell.className).toContain('grid-cols-[auto_144px]');
    });

    const claimBtn = screen.getByRole('button', { name: 'Nhận việc' });
    const openLink = screen.getByRole('link', { name: 'Mở' });
    const claimedBtn = screen.getByRole('button', { name: 'Đã có người nhận' });

    expect(claimBtn.className).toContain('w-full');
    expect(openLink.className).toContain('w-full');
    expect(claimedBtn).toBeDisabled();
    expect(claimedBtn.className).toContain('w-full');

    const viewBtns = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    expect(viewBtns).toHaveLength(3);

    fireEvent.click(viewBtns[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/mọi số liệu chỉ tính trong Điểm kí gửi ReHome TP\.HCM/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kho ReHome TP\.HCM/i)).not.toBeInTheDocument();
  });

  it('formatWarehouseDisplayName normalizes leading Kho to Điểm kí gửi safely for Vietnamese words', () => {
    expect(formatWarehouseDisplayName('Kho ReHome TP.HCM')).toBe('Điểm kí gửi ReHome TP.HCM');
    expect(formatWarehouseDisplayName('Kho Quận 7')).toBe('Điểm kí gửi Quận 7');
    expect(formatWarehouseDisplayName('Điểm kí gửi Q7')).toBe('Điểm kí gửi Q7');
    expect(formatWarehouseDisplayName('Không gian xanh')).toBe('Không gian xanh');
  });
});
