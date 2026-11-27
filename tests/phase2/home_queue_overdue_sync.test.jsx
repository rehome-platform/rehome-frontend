import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import { inventoryService, queueService } from '../../src/features/moderator/services/warehouseApi.js';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import {
  ALL_QUEUE_CACHE_KEY,
  isQueueItemOverdue,
  queueItemMeta,
  queueListCacheKey,
} from '../../src/features/moderator/models/queueModel.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'mod-a', role: 'moderator', warehouseId: 'warehouse-a', warehouseName: 'Kho Q7' },
  }),
}));

const FIXED_NOW = new Date('2026-11-27T10:00:00Z').getTime();
const hoursAgo = (hours, extraMinutes = 0) =>
  new Date(FIXED_NOW - (hours * 60 + extraMinutes) * 60 * 1000).toISOString();

const ALL_QUEUE_ITEMS = [
  {
    queueId: 'q-form-overdue',
    refId: 'form-1',
    formId: 'form-1',
    type: 'FORM_REVIEW',
    targetName: 'Áo khoác dạ',
    subjectSubtitle: 'Nguyễn An',
    claimedBy: null,
    createdAt: hoursAgo(60),
  },
  {
    queueId: 'q-pack-overdue',
    refId: 'ord-1',
    orderId: 'ord-1',
    type: 'PACKING',
    targetName: 'OD-1001',
    subjectSubtitle: 'Trần Bình',
    claimedBy: null,
    createdAt: hoursAgo(50),
  },
  {
    queueId: 'q-return-overdue',
    refId: 'ret-1',
    returnId: 'ret-1',
    type: 'RETURN',
    targetName: 'OD-1002',
    subjectSubtitle: 'Lê Chi / Phạm Dũng',
    claimedBy: 'mod-a',
    createdAt: hoursAgo(72),
  },
  {
    queueId: 'q-org-overdue',
    refId: 'org-1',
    type: 'ORG_VERIFICATION',
    targetName: 'Quỹ Hy Vọng',
    subjectSubtitle: 'Đỗ Hải',
    claimedBy: null,
    createdAt: hoursAgo(48), // exact 48h boundary -> overdue
  },
  {
    queueId: 'q-withdraw-fresh',
    refId: 'wd-1',
    type: 'WITHDRAWAL',
    targetName: 'Quần jeans',
    subjectSubtitle: 'Vũ Giang',
    status: 'PENDING_PICKUP',
    claimedBy: null,
    createdAt: hoursAgo(47, 59), // 47h 59m -> NOT overdue
  },
  {
    queueId: 'q-report-fresh',
    refId: 'rep-1',
    type: 'VIOLATION_REPORT',
    targetName: 'Bài viết vi phạm',
    subjectSubtitle: '2 báo cáo',
    claimedBy: null,
    createdAt: hoursAgo(5),
  },
];

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function renderApp(entry = '/moderator') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ToastProvider>
        <Phase2Provider>
          <Location />
          <Routes>
            <Route path="/moderator" element={<WarehouseHomePage />} />
            <Route path="/moderator/queue" element={<ConsignmentQueuePage />} />
          </Routes>
        </Phase2Provider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Overdue & pending task synchronization between WarehouseHomePage and ConsignmentQueuePage', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    vi.spyOn(inventoryService, 'list').mockResolvedValue({ items: [], content: [], totalElements: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows identical overdue (4) and pending (6) counts across all 11 queue types on Home and Work Queue', async () => {
    const listSpy = vi.spyOn(queueService, 'list').mockImplementation(async (params = {}) => {
      if (params?.type && params.type !== 'ALL') {
        return ALL_QUEUE_ITEMS.filter((item) => item.type === params.type);
      }
      return ALL_QUEUE_ITEMS;
    });

    const homeView = renderApp('/moderator');
    expect(await screen.findByText('2 báo cáo')).toBeInTheDocument();

    const pendingCard = screen.getByText('Việc chờ xử lý').closest('a');
    const overdueCard = screen.getByText('Quá hạn 48h').closest('a');
    const packingCard = screen.getByText('Đơn chờ đóng gói').closest('a');
    const withdrawalCard = screen.getByText('Chờ rút hàng').closest('a');

    expect(within(pendingCard).getByText('6')).toBeInTheDocument();
    expect(within(overdueCard).getByText('4')).toBeInTheDocument();
    expect(within(packingCard).getByText('1')).toBeInTheDocument();
    expect(within(withdrawalCard).getByText('1')).toBeInTheDocument();

    // Home fetches the unified GET /queues source once without per-type filtering
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(listSpy).toHaveBeenCalledWith(expect.not.objectContaining({ type: expect.any(String) }), expect.any(Object));

    homeView.unmount();

    // Verify Work Queue with overdue=1 displays the exact same 4 / 6 count
    renderApp('/moderator/queue?overdue=1');
    expect(await screen.findByText('Hiển thị 4 / 6 việc')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(5); // 1 header + 4 overdue rows
  });

  it('handles 48h overdue boundary and missing/invalid timestamps consistently in queueItemMeta and isQueueItemOverdue', () => {
    expect(ALL_QUEUE_CACHE_KEY).toBe(queueListCacheKey(undefined, '', 0));
    expect(queueItemMeta({ queueId: '1', createdAt: hoursAgo(47, 59) }).isOverdue).toBe(false);
    expect(isQueueItemOverdue({ queueId: '1', createdAt: hoursAgo(47, 59) })).toBe(false);
    expect(queueItemMeta({ queueId: '2', createdAt: hoursAgo(48, 0) }).isOverdue).toBe(true);
    expect(isQueueItemOverdue({ queueId: '2', createdAt: hoursAgo(48, 0) })).toBe(true);
    expect(queueItemMeta({ queueId: '3', queuedAt: hoursAgo(49, 0) }).isOverdue).toBe(true);
    expect(isQueueItemOverdue({ queueId: '3', queuedAt: hoursAgo(49, 0) })).toBe(true);
    expect(queueItemMeta({ queueId: '4' }).isOverdue).toBe(false);
    expect(isQueueItemOverdue({ queueId: '4' })).toBe(false);

    const invalidMeta = queueItemMeta({ queueId: '5', createdAt: 'not-a-valid-date' });
    expect(invalidMeta.isOverdue).toBe(false);
    expect(isQueueItemOverdue({ queueId: '5', createdAt: 'not-a-valid-date' })).toBe(false);
    expect(Number.isFinite(invalidMeta.hours)).toBe(true);
    expect(invalidMeta.formattedTime).not.toBe('Invalid Date');
  });

  it('navigates to the matching Work Queue tab when opening a claimed non-legacy task (RETURN) from Home', async () => {
    const user = userEvent.setup();
    vi.spyOn(queueService, 'list').mockImplementation(async (params = {}) => {
      if (params?.type && params.type !== 'ALL') {
        return ALL_QUEUE_ITEMS.filter((item) => item.type === params.type);
      }
      return ALL_QUEUE_ITEMS.filter((item) => item.queueId === 'q-return-overdue');
    });

    renderApp('/moderator');
    const openLink = await screen.findByRole('link', { name: 'Mở', exact: true });
    await user.click(openLink);

    const locationText = screen.getByTestId('location').textContent;
    expect(locationText.split('?')[0]).toBe('/moderator/queue');
    const query = new URLSearchParams(locationText.split('?')[1]);
    expect(query.get('type')).toBe('RETURN');
    expect(query.get('queueId')).toBe('q-return-overdue');
  });
});
