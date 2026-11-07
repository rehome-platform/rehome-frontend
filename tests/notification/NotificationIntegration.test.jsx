import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import Header from '../../src/components/header.jsx';
import ModeratorLayout from '../../src/layouts/ModeratorLayout.jsx';
import AdminHeader from '../../src/features/admin/components/AdminHeader.jsx';
import App from '../../src/App.jsx';

import NotificationContext from '../../src/context/NotificationContext.jsx';
import AuthContext from '../../src/context/AuthContext.jsx';

// Mock AppRouter to isolate App root layout testing
vi.mock('../../src/routes/AppRouter.jsx', () => ({
  default: () => <div data-testid="mock-app-router">Mock App Router</div>,
}));

// Mock WebSocket context/client to prevent real WS connections in tests
vi.mock('../../src/services/websocket.js', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    onStateChange: vi.fn(() => vi.fn()),
    isConnected: vi.fn(() => false),
  },
}));

// Mock notification API
vi.mock('../../src/api/notificationApi.js', () => ({
  getNotifications: vi.fn().mockResolvedValue({
    data: {
      data: [],
      meta: { unreadCount: 0, hasMore: false },
    },
  }),
  markAsRead: vi.fn().mockResolvedValue({ success: true }),
  markAllAsRead: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Notification Integration into Layouts', () => {
  let mockNotificationContext;
  let mockAuthContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNotificationContext = {
      notifications: [
        {
          id: 'notif-1',
          title: 'Đơn kí gửi mới',
          message: 'Có đơn kiểm định mới',
          targetType: 'CONSIGNMENT',
          targetId: '101',
          isRead: false,
          read: false,
          createdAt: '2026-11-07T10:00:00Z',
        },
      ],
      unreadCount: 3,
      activeToasts: [],
      loading: false,
      loadingMore: false,
      hasMore: false,
      error: null,
      transportAvailable: true,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      dismissToast: vi.fn(),
      loadMoreNotifications: vi.fn(),
      refreshNotifications: vi.fn(),
    };

    mockAuthContext = {
      isAuthenticated: true,
      user: {
        id: 'user-mod-1',
        role: 'moderator',
        fullName: 'Kiểm duyệt viên ReHome',
        memberCode: 'MOD001',
      },
      logout: vi.fn(),
    };
  });

  const renderWithProviders = (
    ui,
    { auth = mockAuthContext, notification = mockNotificationContext } = {}
  ) => {
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <NotificationContext.Provider value={notification}>
            {ui}
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  describe('Header.jsx Integration', () => {
    it('renders NotificationBell with aria-haspopup and unread badge when authenticated', () => {
      renderWithProviders(<Header />);

      const bell = screen.getByRole('button', { name: 'Thông báo' });
      expect(bell).toBeInTheDocument();
      expect(bell).toHaveAttribute('aria-haspopup', 'true');

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('clicking NotificationBell in Header opens NotificationDropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Header />);

      const bell = screen.getByRole('button', { name: 'Thông báo' });
      expect(screen.queryByText('Đánh dấu tất cả đã đọc')).not.toBeInTheDocument();

      await user.click(bell);

      expect(screen.getByText('Đánh dấu tất cả đã đọc')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Tất cả/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Chưa đọc/i })).toBeInTheDocument();
    });

    it('does not render NotificationBell when user is not authenticated', () => {
      renderWithProviders(<Header />, {
        auth: { isAuthenticated: false, user: null, logout: vi.fn() },
      });

      expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });
  });

  describe('ModeratorLayout.jsx Integration', () => {
    it('renders NotificationBell in ModeratorLayout top bar with badge and aria attributes', () => {
      renderWithProviders(
        <ModeratorLayout>
          <div>Moderator page content</div>
        </ModeratorLayout>
      );

      const bell = screen.getByRole('button', { name: 'Thông báo' });
      expect(bell).toBeInTheDocument();
      expect(bell).toHaveAttribute('aria-haspopup', 'true');

      const badge = screen.getByTestId('notification-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('clicking NotificationBell in ModeratorLayout opens NotificationDropdown', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ModeratorLayout>
          <div>Moderator page content</div>
        </ModeratorLayout>
      );

      const bell = screen.getByRole('button', { name: 'Thông báo' });
      expect(screen.queryByText('Đánh dấu tất cả đã đọc')).not.toBeInTheDocument();

      await user.click(bell);

      expect(screen.getByText('Đánh dấu tất cả đã đọc')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Tất cả/i })).toBeInTheDocument();
    });

    it('places NotificationBell in top bar alongside SKU search and profile', () => {
      renderWithProviders(
        <ModeratorLayout>
          <div>Moderator page content</div>
        </ModeratorLayout>
      );

      const skuInput = screen.getByPlaceholderText(/Tìm SKU tại điểm kí gửi/i);
      const bell = screen.getByRole('button', { name: 'Thông báo' });
      const profileLink = screen.getByRole('link', { name: /Kiểm duyệt viên ReHome/i });

      expect(skuInput).toBeInTheDocument();
      expect(bell).toBeInTheDocument();
      expect(profileLink).toBeInTheDocument();
    });
  });

  describe('App.jsx Integration', () => {
    it('renders NotificationToastContainer at root inside App', () => {
      render(<App />);

      const toastContainer = screen.getByTestId('notification-toast-container');
      expect(toastContainer).toBeInTheDocument();
      expect(screen.getByTestId('mock-app-router')).toBeInTheDocument();
    });
  });

  describe('AdminHeader.jsx Exclusion', () => {
    it('does NOT render NotificationBell in AdminHeader per user requirements', () => {
      renderWithProviders(
        <AdminHeader activeTitle="Tổng quan điều hành" />,
        {
          auth: {
            isAuthenticated: true,
            user: {
              id: 'admin-1',
              role: 'admin',
              fullName: 'Quản trị viên Hệ thống',
              email: 'admin@rehome.vn',
            },
            logout: vi.fn(),
          },
        }
      );

      expect(screen.queryByRole('button', { name: 'Thông báo' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    });
  });
});
