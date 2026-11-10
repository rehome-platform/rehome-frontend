import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ViolationReportsPage from '../../src/features/moderator/pages/ViolationReportsPage.jsx';
import { violationReportService } from '../../src/features/moderator/services/violationReportApi.js';

vi.mock('../../src/features/moderator/services/violationReportApi.js', () => ({
  violationReportService: {
    list: vi.fn(),
    getDetail: vi.fn(),
    resolveViolation: vi.fn(),
    dismissViolation: vi.fn(),
  },
}));

// Mock ModeratorLayout to render children directly
vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({
  default: ({ children }) => <div data-testid="moderator-layout">{children}</div>,
}));

describe('ViolationReportsPage UI & Design Tokens', () => {
  const mockReports = [
    {
      id: 'REP-01',
      targetType: 'POST',
      targetId: 'POST-98765432-ABCD',
      reportCount: 5, // isHighPriority >= 3
      sampleReason: 'Spam / Lừa đảo quảng cáo đánh bạc',
      oldestReportedAt: '2026-11-01T08:00:00Z',
      latestReportedAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'REP-02',
      targetType: 'CAMPAIGN',
      targetId: 'CAMP-12345678-EFGH',
      reportCount: 1, // normal priority
      sampleReason: 'Nghi ngờ thông tin chiến dịch không minh bạch',
      oldestReportedAt: '2026-11-02T09:00:00Z',
      latestReportedAt: '2026-11-02T09:00:00Z',
    },
  ];

  const mockDetail = {
    id: 'REP-01',
    targetType: 'POST',
    targetId: 'POST-98765432-ABCD',
    status: 'PENDING',
    reason: 'Quảng cáo cờ bạc trá hình',
    createdAt: '2026-11-01T08:00:00Z',
    targetSnapshot: {
      targetType: 'POST',
      targetId: 'POST-98765432-ABCD',
      organizationId: 'ORG-001',
      organizationDisplayName: 'Mái ấm Tình Thương Q7',
      postContent: 'Bài viết quảng cáo đánh bạc trái phép',
      postPhotoUrls: ['https://example.com/photo1.jpg'],
      postStatus: 'VISIBLE',
    },
    otherReports: [
      {
        id: 'REP-01-B',
        reporterId: 'MB-101-UUID',
        reason: 'Nội dung gây hiểu nhầm cho cộng đồng',
        status: 'PENDING',
        createdAt: '2026-11-01T10:00:00Z',
      },
    ],
    organizationViolationHistory: {
      organizationId: 'ORG-001',
      totalViolationCount: 1,
      actions: [
        {
          targetType: 'POST',
          targetId: 'POST-OLD-01',
          action: 'REMOVE_POST',
          reason: 'Vi phạm quy chuẩn cộng đồng',
          date: '2026-10-15T09:00:00Z',
        },
      ],
    },
  };

  it('renders table with Design Tokens styling and high priority badge', async () => {
    vi.mocked(violationReportService.list).mockResolvedValueOnce({
      data: mockReports,
      total: 2,
    });

    render(
      <MemoryRouter>
        <ViolationReportsPage />
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('2 nhóm')).toBeInTheDocument();
    });

    // Check table elements
    expect(screen.getByText(/Spam \/ Lừa đảo quảng cáo đánh bạc/i)).toBeInTheDocument();
    expect(screen.getByText(/Nghi ngờ thông tin chiến dịch không minh bạch/i)).toBeInTheDocument();

    // High priority badge (reportCount = 5) has bg-error, rounded-full
    const highPriorityBadge = screen.getByText('5 báo cáo');
    expect(highPriorityBadge.className).toContain('bg-error');
    expect(highPriorityBadge.className).toContain('rounded-full');

    // Normal priority badge (reportCount = 1) has neutral styling
    const normalPriorityBadge = screen.getByText('1 báo cáo');
    expect(normalPriorityBadge.className).toContain('rounded-full');
    expect(normalPriorityBadge.className).toContain('border-neutral');

    // Filter buttons rendered
    expect(screen.getByRole('button', { name: 'Chờ xử lý' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đã xử lý' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bác bỏ' })).toBeInTheDocument();

    // Note callout has rounded-xl and border-neutral
    const callout = screen.getByText(/Hệ thống tự động gom các báo cáo trùng/i).closest('div');
    expect(callout.className).toContain('rounded-xl');
    expect(callout.className).toContain('border-neutral');
  });

  it('navigates to detail view with standardized Design Tokens on click', async () => {
    vi.mocked(violationReportService.list).mockResolvedValue({
      data: mockReports,
      total: 2,
    });
    vi.mocked(violationReportService.getDetail).mockResolvedValueOnce(mockDetail);

    render(
      <MemoryRouter>
        <ViolationReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Spam \/ Lừa đảo quảng cáo đánh bạc/i)).toBeInTheDocument();
    });

    // Click on row to open detail
    fireEvent.click(screen.getByText(/Spam \/ Lừa đảo quảng cáo đánh bạc/i));

    // Detail view elements
    await waitFor(() => {
      expect(screen.getByText(/Chi tiết báo cáo & quyết định \(VP-02\)/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/CHỜ XỬ LÝ \(PENDING\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Nội dung bị báo cáo \(Bài viết\)/i)).toBeInTheDocument();
    expect(screen.getByText('Bài viết quảng cáo đánh bạc trái phép')).toBeInTheDocument();
    expect(screen.getByText(/Danh sách các lượt báo cáo từ Member \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 lần vi phạm trước đây/i)).toBeInTheDocument();

    // Confirm button has bg-primary, rounded-xl
    const submitBtn = screen.getByRole('button', { name: /Xác nhận quyết định xử lý/i });
    expect(submitBtn.className).toContain('bg-primary');
    expect(submitBtn.className).toContain('rounded-xl');

    // Back button returns to queue
    const backBtn = screen.getByTitle('Quay lại danh sách hàng đợi');
    fireEvent.click(backBtn);
    await waitFor(() => {
      expect(screen.getByText('2 nhóm')).toBeInTheDocument();
    });
  });

  it('enriches VP-01 queue rows with targetSnapshot organization name and content preview from getDetail', async () => {
    vi.mocked(violationReportService.list).mockResolvedValueOnce({
      data: [mockReports[0]],
      total: 1,
    });
    vi.mocked(violationReportService.getDetail).mockResolvedValueOnce(mockDetail);

    render(
      <MemoryRouter>
        <ViolationReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Mái ấm Tình Thương Q7')).toBeInTheDocument();
    });
    expect(screen.getByText(/Bài viết quảng cáo đánh bạc trái phép/i)).toBeInTheDocument();
  });
});

