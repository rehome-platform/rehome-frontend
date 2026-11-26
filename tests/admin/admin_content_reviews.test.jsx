import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import ToastContainer from '../../src/components/common/ToastContainer.jsx';
import AdminContentReviewsPage from '../../src/features/admin/pages/AdminContentReviewsPage.jsx';
import ViolationWordModal from '../../src/features/admin/pages/ViolationWordModal.jsx';
import AdminSidebar from '../../src/features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../../src/features/admin/components/AdminHeader.jsx';
import contentReviewAdminApi from '../../src/features/admin/services/contentReviewAdminApi.js';
import violationWordAdminApi from '../../src/features/admin/services/violationWordAdminApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { fullName: 'Quản trị viên', email: 'admin@rehome.vn', role: 'admin' },
    logout: vi.fn(),
    loggingOut: false,
  }),
}));

vi.mock('../../src/features/admin/services/contentReviewAdminApi.js', () => ({
  default: {
    listPending: vi.fn(),
    resolve: vi.fn(),
  },
  contentReviewAdminApi: {
    listPending: vi.fn(),
    resolve: vi.fn(),
  },
}));

vi.mock('../../src/features/admin/services/violationWordAdminApi.js', () => ({
  default: {
    create: vi.fn(),
    update: vi.fn(),
  },
  violationWordAdminApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

function wrap(ui, initialEntries = ['/admin/content-reviews']) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        {ui}
        <ToastContainer />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('Admin Content Reviews & Dual Moderation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists pending posts/comments, approves with version, rejects requiring reason, and handles 409', async () => {
    vi.mocked(contentReviewAdminApi.listPending).mockImplementation(async (kind) => {
      if (kind === 'POST') {
        return {
          content: [
            {
              id: 'post-1',
              postId: 'post-1',
              content: 'Bài viết chứa từ nhạy cảm cần duyệt',
              createdAt: '2026-11-25T10:00:00Z',
              version: 3,
            },
          ],
          totalPages: 1,
          totalElements: 1,
        };
      }
      return {
        content: [
          {
            id: 'comment-1',
            postId: 'post-99',
            content: 'Bình luận vi phạm đang bị ẩn',
            createdAt: '2026-11-25T10:05:00Z',
            version: 1,
          },
        ],
        totalPages: 1,
        totalElements: 1,
      };
    });
    vi.mocked(contentReviewAdminApi.resolve).mockResolvedValue('APPROVED');

    render(wrap(<AdminContentReviewsPage />));

    await waitFor(() => {
      expect(screen.getByText('Bài viết chứa từ nhạy cảm cần duyệt')).toBeInTheDocument();
    });
    expect(screen.getByText(/Quy tắc tách luồng kiểm duyệt/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Duyệt hiển thị' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));

    await waitFor(() => {
      expect(contentReviewAdminApi.resolve).toHaveBeenCalledWith('POST', 'post-1', {
        approved: true,
        version: 3,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Bình luận chờ duyệt' }));
    await waitFor(() => {
      expect(screen.getByText('Bình luận vi phạm đang bị ẩn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gỡ vi phạm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gỡ' }));
    expect(screen.getByText('Vui lòng nhập lý do từ chối.')).toBeInTheDocument();
    expect(contentReviewAdminApi.resolve).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText(/Lý do gỡ bỏ/i), {
      target: { value: 'Ngôn từ xúc phạm' },
    });

    vi.mocked(contentReviewAdminApi.resolve).mockRejectedValueOnce({
      response: { status: 409, data: { code: 'CONTENT_NOT_PENDING_REVIEW' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gỡ' }));

    await waitFor(() => {
      expect(contentReviewAdminApi.resolve).toHaveBeenLastCalledWith('COMMENT', 'comment-1', {
        approved: false,
        version: 1,
        reason: 'Ngôn từ xúc phạm',
      });
    });
    expect(screen.getByText(/Nội dung này đã được xử lý trước đó/i)).toBeInTheDocument();
  });

  it('ViolationWordModal defaults to AUTO_FLAG, preserves word.action on edit, and supports selecting action', async () => {
    vi.mocked(violationWordAdminApi.create).mockResolvedValue({ id: 'vw-1' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      wrap(<ViolationWordModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />)
    );

    const actionSelect = screen.getByLabelText(/Hành động hệ thống/i);
    expect(actionSelect).toHaveValue('AUTO_FLAG');
    expect(screen.getByText(/ẩn và chuyển sang chờ Admin xử lý/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ví dụ: lừa đảo'), { target: { value: 'từ cấm' } });
    fireEvent.change(actionSelect, { target: { value: 'NOTIFY_ADMIN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu từ khóa' }));

    await waitFor(() => {
      expect(violationWordAdminApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'từ cấm',
          action: 'NOTIFY_ADMIN',
        })
      );
    });

    rerender(
      wrap(
        <ViolationWordModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
          word={{
            id: 'vw-2',
            word: 'lừa đảo',
            category: 'FRAUD',
            severity: 'BLOCKED',
            action: 'AUTO_REJECT',
            isActive: true,
          }}
        />
      )
    );

    expect(screen.getByLabelText(/Hành động hệ thống/i)).toHaveValue('AUTO_REJECT');
  });

  it('AdminSidebar and AdminHeader expose Kiểm duyệt nội dung at /admin/content-reviews', () => {
    render(
      wrap(
        <>
          <AdminSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
          <AdminHeader />
        </>,
        ['/admin/content-reviews']
      )
    );

    const link = screen.getByRole('link', { name: /Kiểm duyệt nội dung/i });
    expect(link).toHaveAttribute('href', '/admin/content-reviews');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kiểm duyệt nội dung');
  });
});
