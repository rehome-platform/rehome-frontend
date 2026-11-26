import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSessionQueryCache,
  DEFAULT_STALE_TIME_MS,
} from '../../src/utils/sessionQueryCache.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import ReturnProcessingPage from '../../src/features/moderator/pages/ReturnProcessingPage.jsx';
import OrgVerificationPage from '../../src/features/moderator/pages/OrgVerificationPage.jsx';
import ViolationReportsPage from '../../src/features/moderator/pages/ViolationReportsPage.jsx';
import WarehouseInboxPage from '../../src/features/moderator/pages/WarehouseInboxPage.jsx';
import {
  queueService,
  inventoryService,
} from '../../src/features/moderator/services/warehouseApi.js';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { orgVerificationService } from '../../src/features/moderator/services/orgVerificationApi.js';
import { violationReportService } from '../../src/features/moderator/services/violationReportApi.js';
import { warehouseInboxService } from '../../src/features/moderator/services/warehouseInboxApi.js';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    logout: vi.fn(),
    loggingOut: false,
    user: {
      id: 'mod-cache-1',
      accountId: 'mod-cache-1',
      role: 'moderator',
      warehouseId: 'wh-cache-1',
      warehouseName: 'Điểm kí gửi Cache Test',
      fullName: 'Nhân viên Kiểm thử',
    },
  }),
}));

vi.mock('../../src/components/notification/index.js', () => ({
  NotificationBell: () => null,
}));

vi.mock('../../src/hooks/useWebSocket.js', () => ({
  useConversationTopic: vi.fn(),
  useNotificationQueue: vi.fn(),
  useWebSocket: () => ({ isConnected: false }),
}));

let fakeNow = 1_700_000_000_000;

beforeEach(() => {
  fakeNow = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderModeratorApp(initialEntry = '/moderator') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <Phase2Provider>
          <div data-testid="test-nav">
            <Link to="/moderator">Nav Home</Link>
            <Link to="/moderator/queue">Nav Queue</Link>
            <Link to="/moderator/inventory">Nav Inventory</Link>
            <Link to="/moderator/returns">Nav Returns</Link>
            <Link to="/moderator/verifications">Nav Verifications</Link>
            <Link to="/moderator/reports">Nav Reports</Link>
            <Link to="/moderator/inbox">Nav Inbox</Link>
          </div>
          <Routes>
            <Route path="/moderator" element={<WarehouseHomePage />} />
            <Route path="/moderator/queue" element={<ConsignmentQueuePage />} />
            <Route path="/moderator/inventory" element={<WarehouseInventoryPage />} />
            <Route path="/moderator/returns" element={<ReturnProcessingPage />} />
            <Route path="/moderator/verifications" element={<OrgVerificationPage />} />
            <Route path="/moderator/reports" element={<ViolationReportsPage />} />
            <Route path="/moderator/inbox" element={<WarehouseInboxPage />} />
          </Routes>
        </Phase2Provider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('sessionQueryCache unit behavior', () => {
  it('supports write/read, staleTime freshness, prefix invalidation without losing data, eviction, and clear', () => {
    const cache = createSessionQueryCache();
    cache.write('queue:home:FORM_REVIEW', [{ id: 'q1' }]);
    cache.write('inventory:list:ALL::0', { content: [{ sku: 'SKU-1' }] });

    const queueEntry = cache.read('queue:home:FORM_REVIEW');
    expect(cache.isFresh(queueEntry, 30_000)).toBe(true);

    fakeNow += 30_000;
    expect(cache.isFresh(cache.read('queue:home:FORM_REVIEW'), 30_000)).toBe(false);

    fakeNow -= 20_000;
    expect(cache.isFresh(cache.read('queue:home:FORM_REVIEW'), 30_000)).toBe(true);

    // Invalidate by prefix: marks stale while preserving cached data
    cache.invalidate('queue:');
    const invalidated = cache.read('queue:home:FORM_REVIEW');
    expect(invalidated.stale).toBe(true);
    expect(invalidated.data).toEqual([{ id: 'q1' }]);
    expect(cache.isFresh(invalidated, 30_000)).toBe(false);
    expect(cache.isFresh(cache.read('inventory:list:ALL::0'), 30_000)).toBe(true);

    // Evict by prefix: removes matching entries completely
    cache.evict('queue:');
    expect(cache.read('queue:home:FORM_REVIEW')).toBeNull();
    expect(cache.read('inventory:list:ALL::0')).not.toBeNull();

    cache.clear();
    expect(cache.read('inventory:list:ALL::0')).toBeNull();
  });
});

describe('Moderator sidebar tab caching & stale-while-revalidate', () => {
  it('displays cached data immediately without loading flash or refetching when switching tabs within staleTime', async () => {
    const queueSpy = vi.spyOn(queueService, 'list').mockImplementation(async ({ type }) => {
      if (!type || type === 'ALL') {
        return [
          {
            queueId: 'q-all-1',
            type: 'FORM_REVIEW',
            formId: 'form-101',
            targetName: 'Áo khoác dạ',
            subjectSubtitle: 'Nguyễn Văn A',
            createdAt: '2026-11-20T09:00:00Z',
          },
        ];
      }
      if (type === 'FORM_REVIEW') {
        return [
          {
            queueId: 'q-home-1',
            type: 'FORM_REVIEW',
            formId: 'form-101',
            targetName: 'Áo khoác dạ',
            subjectSubtitle: 'Nguyễn Văn A',
            createdAt: '2026-11-20T09:00:00Z',
          },
        ];
      }
      return [];
    });

    const inventorySpy = vi.spyOn(inventoryService, 'list').mockImplementation(async ({ status }) => {
      if (status === 'ON_SALE') {
        const items = [{ id: 'p-1', sku: 'RH-ON-01', name: 'Váy linen trắng', status: 'ON_SALE', currentPrice: 250000 }];
        return {
          items,
          content: items,
          totalElements: 1,
          totalPages: 1,
        };
      }
      const items = [{ id: 'p-2', sku: 'RH-ALL-02', name: 'Quần tây xám', status: 'ON_SALE', currentPrice: 300000 }];
      return {
        items,
        content: items,
        totalElements: 1,
        totalPages: 1,
      };
    });

    renderModeratorApp('/moderator');

    // 1. Home loads initially
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    const homeCallsAfterInit = queueSpy.mock.calls.length;
    const invCallsAfterInit = inventorySpy.mock.calls.length;
    expect(homeCallsAfterInit).toBe(4);
    expect(invCallsAfterInit).toBe(1);

    // 2. Switch to Hàng đợi công việc
    fireEvent.click(screen.getByRole('link', { name: 'Nav Queue' }));
    expect(await screen.findByRole('heading', { name: 'Hàng đợi công việc' })).toBeInTheDocument();
    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(queueSpy).toHaveBeenCalledTimes(homeCallsAfterInit + 1);

    // 3. Switch to Quản lý sản phẩm
    fireEvent.click(screen.getByRole('link', { name: 'Nav Inventory' }));
    expect(await screen.findByText('Quần tây xám')).toBeInTheDocument();
    expect(inventorySpy).toHaveBeenCalledTimes(invCallsAfterInit + 1);

    // 4. Switch back to Home within staleTime -> immediate render, ZERO loading, ZERO extra API calls
    fireEvent.click(screen.getByRole('link', { name: 'Nav Home' }));
    expect(screen.getByRole('heading', { name: 'Tổng quan hôm nay' })).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument();
    expect(queueSpy).toHaveBeenCalledTimes(homeCallsAfterInit + 1);
    expect(inventorySpy).toHaveBeenCalledTimes(invCallsAfterInit + 1);

    // 5. Switch back to Queue within staleTime -> immediate render, ZERO loading, ZERO extra API calls
    fireEvent.click(screen.getByRole('link', { name: 'Nav Queue' }));
    expect(screen.getByRole('heading', { name: 'Hàng đợi công việc' })).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument();
    expect(queueSpy).toHaveBeenCalledTimes(homeCallsAfterInit + 1);

    // 6. Switch back to Inventory within staleTime -> immediate render, ZERO loading, ZERO extra API calls
    fireEvent.click(screen.getByRole('link', { name: 'Nav Inventory' }));
    expect(screen.getByText('Quần tây xám')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument();
    expect(inventorySpy).toHaveBeenCalledTimes(invCallsAfterInit + 1);
  });

  it('performs stale-while-revalidate background refetch after staleTime expires, handles transient vs 403 errors', async () => {
    let version = 1;
    let resolveStaleInv;
    vi.spyOn(queueService, 'list').mockResolvedValue([]);
    const inventorySpy = vi.spyOn(inventoryService, 'list').mockImplementation(async () => {
      if (version === 1) {
        const items = [{ id: 'p-1', sku: 'RH-V1', name: 'Sản phẩm phiên bản 1', status: 'ON_SALE', currentPrice: 100000 }];
        return {
          items,
          content: items,
          totalElements: 1,
          totalPages: 1,
        };
      }
      if (version === 2) {
        return new Promise((resolve) => {
          resolveStaleInv = resolve;
        });
      }
      if (version === 3) {
        throw new Phase2Error('Temporary network error', 500);
      }
      throw new Phase2Error('Forbidden', 403);
    });

    renderModeratorApp('/moderator/inventory');
    expect(await screen.findByText('Sản phẩm phiên bản 1')).toBeInTheDocument();

    // Switch away to Home
    fireEvent.click(screen.getByRole('link', { name: 'Nav Home' }));
    expect(await screen.findByRole('heading', { name: 'Tổng quan hôm nay' })).toBeInTheDocument();

    // Advance clock past staleTime and switch back to Inventory
    fakeNow += DEFAULT_STALE_TIME_MS + 1000;
    version = 2;
    fireEvent.click(screen.getByRole('link', { name: 'Nav Inventory' }));

    // Cached v1 data is shown immediately with NO loading indicator while v2 loads in background
    expect(screen.getByText('Sản phẩm phiên bản 1')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument();
    expect(inventorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, status: '' }),
      expect.any(Object),
    );

    // Background refetch resolves with v2 data
    const v2Items = [{ id: 'p-1', sku: 'RH-V2', name: 'Sản phẩm phiên bản 2', status: 'ON_SALE', currentPrice: 200000 }];
    resolveStaleInv({
      items: v2Items,
      content: v2Items,
      totalElements: 1,
      totalPages: 1,
    });
    expect(await screen.findByText('Sản phẩm phiên bản 2')).toBeInTheDocument();

    // Transient 500 during background refetch keeps v2 cached data visible without error alert
    fireEvent.click(screen.getByRole('link', { name: 'Nav Home' }));
    await screen.findByRole('heading', { name: 'Tổng quan hôm nay' });
    fakeNow += DEFAULT_STALE_TIME_MS + 1000;
    version = 3;
    const listCallsBefore500 = inventorySpy.mock.calls.filter(([p]) => p?.status === '').length;
    fireEvent.click(screen.getByRole('link', { name: 'Nav Inventory' }));
    await waitFor(() =>
      expect(inventorySpy.mock.calls.filter(([p]) => p?.status === '').length).toBe(listCallsBefore500 + 1),
    );
    expect(screen.getByText('Sản phẩm phiên bản 2')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // 403 evicts cache and clears data
    fireEvent.click(screen.getByRole('link', { name: 'Nav Home' }));
    await screen.findByRole('heading', { name: 'Tổng quan hôm nay' });
    fakeNow += DEFAULT_STALE_TIME_MS + 1000;
    version = 4;
    fireEvent.click(screen.getByRole('link', { name: 'Nav Inventory' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Sản phẩm phiên bản 2')).not.toBeInTheDocument();
  });

  it('invalidates cross-tab cache after mutation, supports manual refresh, and caches per filter', async () => {
    let claimed = false;
    const queueSpy = vi.spyOn(queueService, 'list').mockImplementation(async ({ type }) => {
      if (!type || type === 'ALL' || type === 'FORM_REVIEW') {
        return [
          {
            queueId: 'q-1',
            type: 'FORM_REVIEW',
            formId: 'form-1',
            targetName: 'Áo sơ mi lụa',
            subjectSubtitle: 'Trần Minh',
            claimedBy: claimed ? 'mod-cache-1' : null,
            createdAt: '2026-11-20T09:00:00Z',
          },
        ];
      }
      return [];
    });
    const claimSpy = vi.spyOn(queueService, 'claim').mockImplementation(async () => {
      claimed = true;
      return { queueId: 'q-1', claimedBy: 'mod-cache-1' };
    });
    const inventorySpy = vi.spyOn(inventoryService, 'list').mockImplementation(async ({ status }) => {
      const items = [
        {
          id: `item-${status || 'ALL'}`,
          sku: `SKU-${status || 'ALL'}`,
          name: status === 'ON_SALE' ? 'Sản phẩm đang bán A' : 'Sản phẩm tất cả B',
          status: status || 'ON_SALE',
          currentPrice: 150000,
        },
      ];
      return {
        items,
        content: items,
        totalElements: 1,
        totalPages: 1,
      };
    });

    renderModeratorApp('/moderator');
    expect(await screen.findByText('chưa ai nhận')).toBeInTheDocument();

    // Go to Queue and claim task q-1
    fireEvent.click(screen.getByRole('link', { name: 'Nav Queue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nhận việc' }));
    const confirmDialog = screen.getByRole('dialog');
    fireEvent.click(within(confirmDialog).getByRole('button', { name: 'Nhận việc' }));
    await waitFor(() => expect(claimSpy).toHaveBeenCalledWith('q-1', expect.any(Object)));
    expect(await screen.findByText('Bạn đang nhận việc này')).toBeInTheDocument();

    // Return to Home even BEFORE staleTime expires -> cached data shows immediately, then silently refetches updated claim status
    fireEvent.click(screen.getByRole('link', { name: 'Nav Home' }));
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument();
    expect(await screen.findByText('bạn đang giữ')).toBeInTheDocument();

    // Manual "Tải lại" forces refetch even when fresh
    const countBeforeManual = queueSpy.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    await waitFor(() => expect(queueSpy.mock.calls.length).toBeGreaterThan(countBeforeManual));

    // Per-filter caching on Inventory page
    fireEvent.click(screen.getByRole('link', { name: 'Nav Inventory' }));
    expect(await screen.findByText('Sản phẩm tất cả B')).toBeInTheDocument();
    const invCountAll = inventorySpy.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Đang bán' }));
    expect(await screen.findByText('Sản phẩm đang bán A')).toBeInTheDocument();
    expect(inventorySpy).toHaveBeenCalledTimes(invCountAll + 1);

    // Switching back to "Tất cả" uses cache immediately with no new API call
    fireEvent.click(screen.getByRole('button', { name: 'Tất cả' }));
    expect(screen.getByText('Sản phẩm tất cả B')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument();
    expect(inventorySpy).toHaveBeenCalledTimes(invCountAll + 1);
  });

  it('caches custom-fetch sidebar tabs (Returns, Verifications, Reports, Inbox) and clears all cache on logout', async () => {
    const returnsSpy = vi.spyOn(returnService, 'listForWorkspace').mockResolvedValue({
      data: [
        {
          id: 'ret-1',
          code: 'RET-001',
          orderId: 'ORD-1',
          sku: 'SKU-RET-1',
          buyerName: 'Phạm Lan',
          status: 'PENDING_APPROVAL',
          createdAt: '2026-11-20T09:00:00Z',
        },
      ],
    });
    const orgQueueSpy = vi.spyOn(orgVerificationService, 'getQueue').mockResolvedValue({
      data: [{ id: 'org-q-1', refId: 'org-1', name: 'Quỹ Mặt Trời', status: 'PENDING' }],
    });
    vi.spyOn(orgVerificationService, 'getLegalChanges').mockResolvedValue({ data: [] });
    vi.spyOn(orgVerificationService, 'getOrgDetail').mockResolvedValue({
      legalName: 'Quỹ Mặt Trời',
      orgType: 'Quỹ từ thiện',
      taxCode: '0101010101',
      verificationStatus: 'PENDING',
    });
    vi.spyOn(orgVerificationService, 'getExistingOrganizations').mockResolvedValue({ data: [] });
    const reportsSpy = vi.spyOn(violationReportService, 'list').mockResolvedValue({
      data: [
        {
          id: 'rep-1',
          targetType: 'POST',
          targetName: 'Tổ chức Vi Phạm Test',
          reportCount: 2,
          latestReportedAt: '2026-11-20T09:00:00Z',
        },
      ],
    });
    vi.spyOn(violationReportService, 'getDetail').mockResolvedValue(null);
    const convsSpy = vi.spyOn(warehouseInboxService, 'getConversations').mockResolvedValue({
      data: [
        {
          id: 'conv-1',
          memberName: 'Lê Hoàng',
          status: 'UNANSWERED',
          lastMessage: { content: 'Xin chào kho', createdAt: '2026-11-20T09:00:00Z' },
        },
      ],
    });
    const msgsSpy = vi.spyOn(warehouseInboxService, 'getMessages').mockResolvedValue({
      data: [{ id: 'm-1', sender: 'member', content: 'Tin nhắn cached inbox', createdAt: '2026-11-20T09:00:00Z' }],
      total: 1,
    });
    vi.spyOn(queueService, 'list').mockResolvedValue([]);
    vi.spyOn(inventoryService, 'list').mockResolvedValue({ content: [], totalElements: 0, totalPages: 1 });

    renderModeratorApp('/moderator/returns');
    expect(await screen.findByText('Phạm Lan')).toBeInTheDocument();
    expect(returnsSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Nav Verifications' }));
    expect(await screen.findByText('Quỹ Mặt Trời')).toBeInTheDocument();
    expect(orgQueueSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Nav Reports' }));
    expect(await screen.findByText('Tổ chức Vi Phạm Test')).toBeInTheDocument();
    expect(reportsSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Nav Inbox' }));
    expect(await screen.findByText('Tin nhắn cached inbox')).toBeInTheDocument();
    expect(convsSpy).toHaveBeenCalledTimes(1);
    expect(msgsSpy).toHaveBeenCalledTimes(1);

    // Revisit all 4 tabs within staleTime -> immediate render, zero loading messages, zero duplicate fetches
    fireEvent.click(screen.getByRole('link', { name: 'Nav Returns' }));
    expect(screen.getByText('Phạm Lan')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải danh sách yêu cầu trả hàng...')).not.toBeInTheDocument();
    expect(returnsSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Nav Verifications' }));
    expect(screen.getByText('Quỹ Mặt Trời')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải danh sách hồ sơ tổ chức...')).not.toBeInTheDocument();
    expect(orgQueueSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Nav Reports' }));
    expect(screen.getByText('Tổ chức Vi Phạm Test')).toBeInTheDocument();
    expect(screen.queryByText('Đang nạp dữ liệu báo cáo vi phạm từ máy chủ…')).not.toBeInTheDocument();
    expect(reportsSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('link', { name: 'Nav Inbox' }));
    expect(screen.getByText('Tin nhắn cached inbox')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải danh sách hộp thư…')).not.toBeInTheDocument();
    expect(convsSpy).toHaveBeenCalledTimes(1);
    expect(msgsSpy).toHaveBeenCalledTimes(1);

    // Logout clears session cache and prevents leaking cached data on next mount
    fireEvent(window, new CustomEvent('auth:logout'));
    fireEvent.click(screen.getByRole('link', { name: 'Nav Returns' }));
    // Because session signal is aborted on logout, returns page cannot show stale cached data after remount
    await waitFor(() => expect(returnsSpy).toHaveBeenCalledTimes(2));
  });
});
