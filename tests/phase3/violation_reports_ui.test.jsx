import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ViolationReportsPage from '../../src/features/moderator/pages/ViolationReportsPage.jsx';
import { violationReportService } from '../../src/features/moderator/services/violationReportApi.js';

vi.mock('../../src/features/moderator/services/violationReportApi.js', () => ({
  violationReportService: {
    list: vi.fn(),
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
      targetTitle: 'Bài viết quảng cáo đánh bạc trái phép',
      targetType: 'Bài viết',
      authorName: 'Nguyễn Văn Spam',
      postedAt: '01/11/2026',
      reportCount: 5, // isHighPriority >= 3
      topReason: 'Spam / Lừa đảo',
      lastReportAt: '10 phút trước',
      status: 'PENDING',
      reports: [
        {
          reporterCode: 'MB-101',
          reporterName: 'Trần Văn A',
          reason: 'Quảng cáo cờ bạc trá hình',
          time: '10:00 01/11/2026',
        },
      ],
    },
    {
      id: 'REP-02',
      targetTitle: 'Bình luận thô tục xúc phạm thành viên',
      targetType: 'Bình luận',
      authorName: 'Ẩn danh',
      postedAt: '02/11/2026',
      reportCount: 1, // normal priority
      topReason: 'Ngôn từ xúc phạm',
      lastReportAt: '1 giờ trước',
      status: 'RESOLVED',
      actionTaken: 'Gỡ nội dung',
      resolveReason: 'Vi phạm quy chuẩn cộng đồng',
      reports: [],
    },
  ];

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
      expect(screen.getByText('Báo cáo vi phạm · 2')).toBeInTheDocument();
    });

    // Check table elements
    expect(screen.getByText('Bài viết quảng cáo đánh bạc trái phép')).toBeInTheDocument();
    expect(screen.getByText('Bình luận thô tục xúc phạm thành viên')).toBeInTheDocument();

    // High priority badge (reportCount = 5) has bg-error, rounded-full
    const highPriorityBadge = screen.getByText('5');
    expect(highPriorityBadge.className).toContain('bg-error');
    expect(highPriorityBadge.className).toContain('rounded-full');

    // Normal priority badge (reportCount = 1) has neutral styling
    const normalPriorityBadge = screen.getByText('1');
    expect(normalPriorityBadge.className).toContain('rounded-full');
    expect(normalPriorityBadge.className).toContain('bg-neutral-light');

    // Resolved row displays Badge
    expect(screen.getByText('Đã xử lý')).toBeInTheDocument();

    // Note callout has rounded-xl and border-neutral
    const callout = screen.getByText(/Nhiều báo cáo trên/i).closest('div');
    expect(callout.className).toContain('rounded-xl');
    expect(callout.className).toContain('border-neutral');
  });

  it('navigates to detail view with standardized Design Tokens on click', async () => {
    vi.mocked(violationReportService.list).mockResolvedValueOnce({
      data: mockReports,
      total: 2,
    });

    render(
      <MemoryRouter>
        <ViolationReportsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bài viết quảng cáo đánh bạc trái phép')).toBeInTheDocument();
    });

    // Click on row to open detail
    fireEvent.click(screen.getByText('Bài viết quảng cáo đánh bạc trái phép'));

    // Detail view elements
    expect(screen.getByText('Chi tiết báo cáo & xử lý')).toBeInTheDocument();
    expect(screen.getByText('CHỜ XỬ LÝ')).toBeInTheDocument();
    expect(screen.getByText('Nội dung bị báo cáo')).toBeInTheDocument();
    expect(screen.getByText('5 lượt báo cáo')).toBeInTheDocument();
    expect(screen.getByText(/Trần Văn A/)).toBeInTheDocument();

    // Confirm button has bg-primary, rounded-xl
    const submitBtn = screen.getByRole('button', { name: /Xác nhận xử lý/i });
    expect(submitBtn.className).toContain('bg-primary');
    expect(submitBtn.className).toContain('rounded-xl');

    // Back button returns to queue
    const backBtn = screen.getByTitle('Quay lại hàng đợi');
    fireEvent.click(backBtn);
    expect(screen.getByText('Báo cáo vi phạm · 2')).toBeInTheDocument();
  });
});

