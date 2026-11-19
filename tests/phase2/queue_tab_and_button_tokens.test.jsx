import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { queueService } from '../../src/features/moderator/services/warehouseApi.js';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import Button from '../../src/components/common/Button.jsx';
import Badge from '../../src/components/common/Badge.jsx';

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

function renderQueueApp(entry = '/moderator/queue') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Phase2Provider>
        <Location />
        <Routes>
          <Route path="/moderator/queue" element={<ConsignmentQueuePage />} />
          <Route path="/moderator/returns" element={<p>Màn hình Trả hàng</p>} />
          <Route path="/moderator/verifications" element={<p>Màn hình Xác minh tổ chức</p>} />
          <Route path="/moderator/reports" element={<p>Màn hình Báo cáo vi phạm</p>} />
          <Route path="/moderator/consignments/:id" element={<p>Màn hình Duyệt form</p>} />
          <Route path="/moderator/packing" element={<p>Màn hình Đóng gói</p>} />
        </Routes>
      </Phase2Provider>
    </MemoryRouter>,
  );
}

const mockReturnItem = {
  queueId: 'q-return-1',
  refId: 'ret-101',
  returnId: 'ret-101',
  type: 'RETURN',
  typeLabel: 'Yêu cầu trả hàng',
  name: 'Đơn hàng hoàn RET-101',
  targetName: 'Đơn hàng hoàn RET-101',
  subjectSubtitle: 'Lý do: Hàng lỗi kỹ thuật',
  status: 'PENDING',
  claimedBy: null,
  createdAt: '2026-10-01T00:00:00Z',
};

const mockOrgItem = {
  queueId: 'q-org-1',
  refId: 'org-202',
  type: 'ORG_VERIFICATION',
  typeLabel: 'Xác minh tổ chức',
  name: 'Quỹ Nụ Cười Xanh',
  targetName: 'Quỹ Nụ Cười Xanh',
  subjectSubtitle: 'Tổ chức từ thiện · MST: 0312999888',
  status: 'PENDING',
  claimedBy: null,
  createdAt: '2026-10-01T00:00:00Z',
};

const mockReportItem = {
  queueId: 'q-rep-1',
  refId: 'rep-303',
  type: 'VIOLATION_REPORT',
  typeLabel: 'Báo cáo vi phạm',
  name: 'Bài đăng nghi vấn gian lận',
  targetName: 'Bài đăng nghi vấn gian lận',
  subjectSubtitle: '3 báo cáo vi phạm nội dung',
  status: 'PENDING',
  claimedBy: null,
  createdAt: '2026-10-01T00:00:00Z',
};

describe('HQ-01: Tab selection in place, Claim flow, and "Mở việc" without arrows', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('switches tabs in place inside Hàng đợi công việc for RETURN, ORG_VERIFICATION, VIOLATION_REPORT', async () => {
    const user = userEvent.setup();
    vi.spyOn(queueService, 'list').mockImplementation(async (params) => {
      if (params.type === 'RETURN') return [mockReturnItem];
      if (params.type === 'ORG_VERIFICATION') return [mockOrgItem];
      if (params.type === 'VIOLATION_REPORT') return [mockReportItem];
      return [];
    });

    renderQueueApp();

    // 1. Click tab "Trả hàng" (RETURN)
    const returnTab = screen.getByRole('tab', { name: 'Trả hàng' });
    await user.click(returnTab);
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator/queue?type=RETURN');
    expect(await screen.findByText('Lý do: Hàng lỗi kỹ thuật')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(within(screen.getByRole('dialog')).getByText('Đơn hàng hoàn RET-101')).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Đóng' })[0]);
    expect(screen.getByRole('button', { name: 'Nhận việc' })).toBeInTheDocument();

    // 2. Click tab "Xác minh tổ chức" (ORG_VERIFICATION)
    const orgTab = screen.getByRole('tab', { name: 'Xác minh tổ chức' });
    await user.click(orgTab);
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator/queue?type=ORG_VERIFICATION');
    expect(await screen.findByText('Tổ chức từ thiện')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(within(screen.getByRole('dialog')).getByText('Quỹ Nụ Cười Xanh')).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Đóng' })[0]);
    expect(screen.getByRole('button', { name: 'Nhận việc' })).toBeInTheDocument();

    // 3. Click tab "Vi phạm" (VIOLATION_REPORT)
    const reportTab = screen.getByRole('tab', { name: 'Vi phạm' });
    await user.click(reportTab);
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator/queue?type=VIOLATION_REPORT');
    expect(await screen.findByText('3 báo cáo vi phạm nội dung')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chi tiết' }));
    expect(within(screen.getByRole('dialog')).getByText('Bài đăng nghi vấn gian lận')).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Đóng' })[0]);
    expect(screen.getByRole('button', { name: 'Nhận việc' })).toBeInTheDocument();
  });

  it('shows "Nhận việc" when unclaimed; only shows "Mở việc" (no arrows) after claiming; navigates to refId detail on click', async () => {
    const user = userEvent.setup();
    const claimedReturnItem = {
      ...mockReturnItem,
      claimedBy: 'mod-a',
    };

    vi.spyOn(queueService, 'list')
      .mockResolvedValueOnce([mockReturnItem]) // First load: unclaimed
      .mockResolvedValueOnce([claimedReturnItem]); // After claim mutation: claimed by mod-a

    vi.spyOn(queueService, 'claim').mockResolvedValue(claimedReturnItem);

    renderQueueApp('/moderator/queue?type=RETURN');

    // Unclaimed state
    expect(await screen.findByText('Lý do: Hàng lỗi kỹ thuật')).toBeInTheDocument();
    expect(screen.queryByText('Đơn hàng hoàn RET-101')).not.toBeInTheDocument();
    expect(screen.getByText('chưa ai nhận')).toBeInTheDocument();

    // The unclaimed item title should not be a navigation link
    expect(screen.queryByRole('link', { name: 'Đơn hàng hoàn RET-101' })).not.toBeInTheDocument();

    // Click "Nhận việc" -> open claim confirmation dialog
    const claimBtn = screen.getByRole('button', { name: 'Nhận việc' });
    await user.click(claimBtn);

    // In modal, click "Nhận việc" to confirm
    const dialogConfirmBtn = within(screen.getByRole('dialog')).getByRole('button', { name: 'Nhận việc' });
    await user.click(dialogConfirmBtn);

    // After claim, button displays exactly "Mở việc" without any arrow "→" or "->"
    const openBtn = await screen.findByRole('link', { name: 'Mở việc' });
    expect(openBtn).toBeInTheDocument();
    expect(openBtn.textContent.trim()).toBe('Mở việc');
    expect(openBtn.textContent).not.toContain('→');
    expect(openBtn.textContent).not.toContain('->');

    // Clicking "Mở việc" navigates to the detail screen with refId
    await user.click(openBtn);
    expect(screen.getByTestId('location')).toHaveTextContent('/moderator/returns?id=ret-101');
    expect(screen.getByText('Màn hình Trả hàng')).toBeInTheDocument();
  });

  it('HQ-01: does not render checkboxes in queue table header or rows', async () => {
    vi.spyOn(queueService, 'list').mockResolvedValue([mockReturnItem]);
    renderQueueApp();
    await screen.findByText('Yêu cầu trả hàng');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('HQ-01: aligns Work Queue action buttons uniformly without arrows or awkward wrapping', async () => {
    const claimedPacking = {
      queueId: 'q-pack-1',
      refId: 'ord-1',
      orderId: 'ord-1',
      type: 'PACKING',
      typeLabel: 'Đóng gói đơn hàng',
      name: 'Đơn #OD-01',
      targetName: 'Đơn #OD-01',
      subjectSubtitle: 'Nguyễn Văn B',
      status: 'PAID',
      claimedBy: 'mod-a',
      createdAt: '2026-10-01T00:00:00Z',
    };
    const claimedWithdrawal = {
      queueId: 'q-with-1',
      refId: 'w-1',
      type: 'WITHDRAWAL',
      typeLabel: 'Rút hàng',
      name: 'Áo thun',
      targetName: 'Áo thun',
      subjectSubtitle: 'Trần Thị C',
      productImageUrl: 'https://cdn.rehome.test/ao-thun.jpg',
      status: 'PENDING_APPROVAL',
      claimedBy: 'mod-a',
      createdAt: '2026-10-01T00:00:00Z',
    };

    vi.spyOn(queueService, 'list').mockImplementation(async () => [claimedPacking, claimedWithdrawal]);
    renderQueueApp();

    const packRow = (await screen.findByText('Nguyễn Văn B')).closest('tr');
    // 7 columns in exact order: Loại việc, Đối tượng, Tạo lúc, Đã chờ, Người nhận, Chi tiết, Hành động
    const headers = screen.getAllByRole('columnheader').map((th) => th.textContent.trim());
    expect(headers).toEqual(['Loại việc', 'Đối tượng', 'Tạo lúc', 'Đã chờ', 'Người nhận', 'Chi tiết', 'Hành động']);
    const packDetailBtn = within(packRow).getByRole('button', { name: 'Chi tiết' });
    const packActionsWrap = within(packRow).getByRole('button', { name: 'Nhả việc' }).parentElement;
    // Chi tiết is in its own dedicated cell, separate from Hành động
    expect(packDetailBtn.closest('td')).not.toBe(packActionsWrap.closest('td'));
    expect(packActionsWrap.className).toContain('flex-nowrap');
    expect(packActionsWrap.className).toContain('justify-end');
    expect(packActionsWrap.className).toContain('gap-2');

    const packButtons = Array.from(packActionsWrap.children);
    expect(packButtons.map((el) => el.textContent.trim())).toEqual(['Nhả việc', 'Đóng gói']);
    packButtons.forEach((el) => {
      expect(el.className).toContain('h-8');
      expect(el.className).toContain('px-3');
      expect(el.className).toContain('text-xs');
      expect(el.className).toContain('font-semibold');
      expect(el.className).toContain('whitespace-nowrap');
      expect(el.className).toContain('shrink-0');
      expect(el.textContent).not.toContain('→');
      expect(el.textContent).not.toContain('->');
    });

    const withdrawRow = screen.getByText('Trần Thị C').closest('tr');
    // Check đơn button is removed; withdrawal thumbnail is rendered in Loại việc column
    expect(within(withdrawRow).queryByRole('button', { name: 'Check đơn' })).not.toBeInTheDocument();
    const thumbImg = within(withdrawRow).getByAltText('Áo thun');
    expect(thumbImg).toHaveAttribute('src', 'https://cdn.rehome.test/ao-thun.jpg');
    expect(within(packRow).queryByRole('img')).not.toBeInTheDocument();

    const withdrawDetailBtn = within(withdrawRow).getByRole('button', { name: 'Chi tiết' });
    const withdrawActionsWrap = within(withdrawRow).getByRole('button', { name: 'Nhả việc' }).parentElement;
    expect(withdrawDetailBtn.closest('td')).not.toBe(withdrawActionsWrap.closest('td'));
    expect(withdrawActionsWrap.className).toContain('flex-nowrap');
    const withdrawButtons = Array.from(withdrawActionsWrap.children);
    expect(withdrawButtons.map((el) => el.textContent.trim())).toEqual([
      'Nhả việc',
      'Duyệt yêu cầu',
    ]);
    withdrawButtons.forEach((el) => {
      expect(el.className).toContain('h-8');
      expect(el.className).toContain('px-3');
      expect(el.className).toContain('text-xs');
      expect(el.className).toContain('font-semibold');
      expect(el.className).toContain('whitespace-nowrap');
      expect(el.className).toContain('shrink-0');
    });
  });
});

describe('Design Tokens: Button & Badge components', () => {
  it('Button adheres to 12px border-radius (rounded-xl) and correct color hierarchy', () => {
    const { rerender } = render(<Button variant="primary" size="sm">Primary SM</Button>);
    let btn = screen.getByRole('button', { name: 'Primary SM' });
    expect(btn.className).toContain('rounded-xl');
    expect(btn.className).toContain('bg-[#006B2C]');
    expect(btn.className).toContain('text-white');
    expect(btn.className).toContain('hover:bg-[#005523]');

    rerender(<Button variant="outline" size="md">Outline MD</Button>);
    btn = screen.getByRole('button', { name: 'Outline MD' });
    expect(btn.className).toContain('rounded-xl');
    expect(btn.className).toContain('border-[#DDE5D9]');
    expect(btn.className).toContain('bg-white');
    expect(btn.className).toContain('text-[#1F2A37]');
    expect(btn.className).toContain('hover:bg-[#F6F9F4]');
    expect(btn.className).toContain('hover:border-[#006B2C]');

    rerender(<Button variant="danger">Danger</Button>);
    btn = screen.getByRole('button', { name: 'Danger' });
    expect(btn.className).toContain('rounded-xl');
    expect(btn.className).toContain('bg-[#D92D20]');
    expect(btn.className).toContain('text-white');
    expect(btn.className).toContain('hover:bg-[#B42318]');
  });

  it('Badge adheres to fully rounded chip (rounded-full) and soft pastel warning tokens', () => {
    const { rerender } = render(<Badge variant="warning">Cần xử lý</Badge>);
    let badge = screen.getByText('Cần xử lý');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('bg-[#FFFAEB]');
    expect(badge.className).toContain('text-[#B54708]');

    rerender(<Badge variant="secondary">Điểm nhấn</Badge>);
    badge = screen.getByText('Điểm nhấn');
    expect(badge.className).toContain('rounded-full');
    expect(badge.className).toContain('bg-[#FFFAEB]');
    expect(badge.className).toContain('text-[#B54708]');
  });
});

