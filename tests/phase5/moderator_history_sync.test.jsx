import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ModeratorHistoryTable } from '../../src/features/moderator/components/ModeratorHistoryTable.jsx';
import { WarehouseHistoryTabs } from '../../src/features/moderator/components/WarehouseHistoryTabs.jsx';
import { warehouseHistoryService } from '../../src/features/moderator/services/warehouseHistoryApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import ReturnProcessingPage from '../../src/features/moderator/pages/ReturnProcessingPage.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', accountId: 'mod-1', warehouseId: 'wh-1', role: 'moderator' },
    isAuthenticated: true,
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

function LocationSpy({ onChange }) {
  const location = useLocation();
  React.useEffect(() => {
    onChange(`${location.pathname}${location.search}`);
  }, [location, onChange]);
  return null;
}

describe('ModeratorHistoryTable', () => {
  it('renders 6 standard columns, displays "—" for missing fields, and renders view button as link or callback', () => {
    const onView = vi.fn();
    render(
      <MemoryRouter>
        <ModeratorHistoryTable
          rows={[
            {
              key: 'r1',
              time: '',
              target: null,
              contentAction: '',
              actor: undefined,
              result: '',
              detailHref: null,
            },
            {
              key: 'r2',
              time: '20/11/2026',
              target: 'Đơn hàng OD-1',
              contentAction: 'Tạo vận đơn GHN',
              actor: 'Mod A',
              result: 'Thành công',
              detailHref: '/moderator/packing?orderId=o1',
            },
            {
              key: 'r3',
              time: '21/11/2026',
              target: 'Yêu cầu trả hàng YC-1',
              contentAction: 'Chốt trả hàng hợp lệ',
              actor: '—',
              result: 'Hợp lệ · Đăng bán lại',
              onViewDetail: onView,
            },
          ]}
        />
      </MemoryRouter>,
    );

    const headers = screen.getAllByRole('columnheader').map((el) => el.textContent);
    expect(headers).toEqual([
      'Thời gian',
      'Đối tượng',
      'Nội dung / Thao tác',
      'Người thực hiện',
      'Kết quả',
      'Thao tác',
    ]);

    // First row renders 6 em-dashes across all 6 columns when values are missing
    expect(screen.getAllByText('—')).toHaveLength(7); // 6 from r1 + 1 actor in r3

    const linkAction = screen.getByRole('link', { name: 'Xem chi tiết' });
    expect(linkAction).toHaveAttribute('href', '/moderator/packing?orderId=o1');

    const btnAction = screen.getByRole('button', { name: 'Xem chi tiết' });
    fireEvent.click(btnAction);
    expect(onView).toHaveBeenCalledTimes(1);
  });
});

describe('WarehouseHistoryTabs 6-column & URL sync across INSPECTION/INVENTORY/PACKING', () => {
  it('maps detail links across types, renders "—" for missing actor/unnavigable rows, and clears ?view and ?historyPage on Công việc click', async () => {
    vi.spyOn(warehouseHistoryService, 'list').mockResolvedValueOnce({
      content: [
        {
          id: 'e1',
          target: 'DEGRADED_ITEM_CASE SKU-888',
          targetType: 'DEGRADED_ITEM_CASE',
          targetId: 'case-uuid-1',
          action: 'OPEN_DEGRADED_CASE',
          actor: '',
          timestamp: null,
          result: 'OPENED',
        },
        {
          id: 'e2',
          target: 'END_OF_TERM_DECISION SKU-999',
          targetType: 'END_OF_TERM_DECISION',
          targetId: 'dec-uuid-1',
          action: 'PROPOSE_RECONSIGN_TERMS',
          actor: 'Mod E',
          timestamp: '2026-11-22T02:00:00Z',
          result: 'PROPOSED',
        },
        {
          id: 'e3',
          target: 'CONSIGNMENT_RECEIPT BN-01',
          targetType: 'CONSIGNMENT_RECEIPT',
          targetId: 'rcp-uuid-1',
          action: 'CONFIRM_RECEIPT',
          actor: 'Member A',
          timestamp: '2026-11-22T03:00:00Z',
          result: 'CONFIRMED',
        },
      ],
      totalPages: 1,
    });

    let currentUrl = '';
    render(
      <MemoryRouter initialEntries={['/moderator/inventory?view=history&historyPage=1']}>
        <LocationSpy onChange={(url) => { currentUrl = url; }} />
        <Phase2Provider>
          <WarehouseHistoryTabs type="INVENTORY">
            <p>Nội dung công việc kho</p>
          </WarehouseHistoryTabs>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const viewLinks = await screen.findAllByRole('link', { name: 'Xem chi tiết' });
    expect(viewLinks.map((el) => el.getAttribute('href'))).toEqual([
      '/moderator/inventory/SKU-888',
      '/moderator/inventory/SKU-999',
    ]);
    // Missing timestamp, missing actor, and unnavigable CONSIGNMENT_RECEIPT action render "—"
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);

    fireEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    await waitFor(() => {
      expect(screen.getByText('Nội dung công việc kho')).toBeInTheDocument();
    });
    expect(currentUrl).toBe('/moderator/inventory');
  });
});

describe('/moderator/returns History Tab synchronization', () => {
  const sampleHistoryRows = [
    {
      id: 'ret-1',
      code: 'YC-RET0001',
      orderNo: 'OD-1001',
      sku: 'SKU-101',
      buyerName: 'Nguyễn Văn An',
      status: 'RESOLVED',
      rawStatus: 'VALID',
      itemAction: 'RELIST',
      degraded: false,
      reason: 'Sản phẩm bị sờn chỉ',
      rawReason: 'Sản phẩm bị sờn chỉ',
      createdAt: '2026-11-22T02:00:00Z',
      resolvedAt: '2026-11-22T05:00:00Z',
      submittedAt: '22/11/2026',
    },
    {
      id: 'ret-2',
      code: 'YC-RET0002',
      orderNo: 'OD-1002',
      sku: 'SKU-102',
      buyerName: 'Bùi Quang Huy',
      status: 'RESOLVED',
      rawStatus: 'INVALID',
      pickedUpAt: '2026-11-21T08:00:00Z',
      invalidReturnChoice: 'WAREHOUSE_PICKUP',
      reason: 'Người mua đổi ý',
      rawReason: 'Người mua đổi ý',
      createdAt: '2026-11-15T01:00:00Z',
      resolvedAt: '2026-11-21T08:00:00Z',
      submittedAt: '15/11/2026',
    },
    {
      id: 'ret-3',
      code: 'YC-RET0003',
      orderNo: 'OD-1003',
      sku: 'SKU-103',
      buyerName: 'Trần Minh Tâm',
      status: 'RESOLVED',
      rawStatus: 'LOST',
      reason: 'Thất lạc khi thu hồi',
      rawReason: 'Thất lạc khi thu hồi',
      createdAt: '2026-11-20T01:00:00Z',
      resolvedAt: null,
      submittedAt: '20/11/2026',
    },
  ];

  it('opens history via ?view=history with 6 standard columns (no ĐÃ CHỜ), renders "—" for missing actor, and opens quick detail modal', async () => {
    vi.spyOn(returnService, 'listForWorkspace').mockResolvedValue({
      data: sampleHistoryRows,
      total: 3,
      page: 0,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={['/moderator/returns?view=history']}>
        <Phase2Provider>
          <Routes>
            <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
          </Routes>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const headers = (await screen.findAllByRole('columnheader')).map((el) => el.textContent);
    expect(headers).toEqual([
      'Thời gian',
      'Đối tượng',
      'Nội dung / Thao tác',
      'Người thực hiện',
      'Kết quả',
      'Thao tác',
    ]);
    expect(screen.queryByText(/Đã chờ/i)).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: /Tải lại lịch sử/i })).not.toBeInTheDocument();

    expect(screen.getByText('YC-RET0001')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.queryByText('Yêu cầu trả hàng YC-RET0001')).not.toBeInTheDocument();
    expect(screen.getByText('Xử lý món hoàn trả')).toBeInTheDocument();
    expect(screen.queryByText('Sản phẩm bị sờn chỉ')).not.toBeInTheDocument();
    const relistBadge = screen.getByText('Đăng bán lại');
    expect(relistBadge.className).toContain('whitespace-nowrap');
    expect(relistBadge.className).toContain('bg-[#ECFDF3]');

    expect(screen.getByText('Bàn giao hàng trả tại quầy')).toBeInTheDocument();
    expect(screen.getByText('Đã bàn giao quầy')).toBeInTheDocument();

    expect(screen.getByText('Báo thất lạc hàng trả')).toBeInTheDocument();
    const lostBadge = screen.getByText('Thất lạc · Hoàn tiền');
    expect(lostBadge.className).toContain('bg-[#FFFAEB]');

    // Actor is missing in ReturnRequestResponse -> displays "—"
    expect(screen.getAllByText('—')).toHaveLength(3);

    const viewButtons = screen.getAllByRole('button', { name: 'Xem chi tiết' });
    expect(viewButtons).toHaveLength(3);
    fireEvent.click(viewButtons[0]);
    expect(await screen.findByText(/Chi tiết yêu cầu trả hàng/i)).toBeInTheDocument();
  });

  it('syncs ?view=history & ?historyPage= across tabs and paginates 25 resolved returns (20 per page)', async () => {
    const manyReturns = Array.from({ length: 25 }, (_, i) => {
      const idx = i + 1;
      const day = String((i % 28) + 1).padStart(2, '0');
      const resolvedAt = new Date(Date.UTC(2026, 10, 28 - i, 10, 0, 0)).toISOString();
      return {
        id: `ret-p-${idx}`,
        code: `YC-PAGE${String(idx).padStart(2, '0')}`,
        orderNo: `OD-P${idx}`,
        sku: `SKU-P${idx}`,
        buyerName: `Khách hàng ${idx}`,
        status: 'RESOLVED',
        rawStatus: 'VALID',
        itemAction: 'RELIST',
        degraded: false,
        reason: `Lý do ${idx}`,
        rawReason: `Lý do ${idx}`,
        createdAt: `2026-11-${day}T01:00:00Z`,
        resolvedAt,
        submittedAt: `${day}/11/2026`,
      };
    });

    const listSpy = vi.spyOn(returnService, 'listForWorkspace').mockResolvedValue({
      data: manyReturns,
      total: 25,
      page: 0,
      totalPages: 1,
    });

    let currentUrl = '';
    const view = render(
      <MemoryRouter initialEntries={['/moderator/returns']}>
        <LocationSpy onChange={(url) => { currentUrl = url; }} />
        <Phase2Provider>
          <Routes>
            <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
          </Routes>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const historyTab = await screen.findByRole('tab', { name: /Lịch sử \(25\)/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(currentUrl).toBe('/moderator/returns?view=history');
    });
    expect(await screen.findByText('Trang 1/2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })).toHaveLength(20);

    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    await waitFor(() => {
      expect(currentUrl).toBe('/moderator/returns?view=history&historyPage=1');
    });
    expect(await screen.findByText('Trang 2/2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })).toHaveLength(5);
    expect(screen.getByText('YC-PAGE25')).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Tải lại lịch sử' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Công việc' }));
    await waitFor(() => {
      expect(currentUrl).toBe('/moderator/returns');
    });
    view.unmount();

    // Direct URL load on page 2 works out of the box
    render(
      <MemoryRouter initialEntries={['/moderator/returns?view=history&historyPage=1']}>
        <Phase2Provider>
          <Routes>
            <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
          </Routes>
        </Phase2Provider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Trang 2/2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })).toHaveLength(5);
  });
});
