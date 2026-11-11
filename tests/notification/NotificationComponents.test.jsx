import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gsap from 'gsap';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';

import NotificationContext from '../../src/context/NotificationContext.jsx';
import AuthContext from '../../src/context/AuthContext.jsx';
import {
  NotificationBell,
  NotificationDropdown,
  NotificationToastItem,
  NotificationToastContainer,
} from '../../src/components/notification/index.js';

// Mock useNavigate from react-router-dom to verify deep-link navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Notification UI Components', () => {
  let mockContextValue;
  let mockAuthValue;

  const sampleNotifications = [
    {
      id: 'notif-1',
      title: 'Đơn kí gửi mới',
      message: 'Có đơn kí gửi ĐKG-101 cần kiểm định',
      targetType: 'CONSIGNMENT',
      targetId: '101',
      isRead: false,
      read: false,
      createdAt: '2026-11-07T10:00:00Z',
    },
    {
      id: 'notif-2',
      title: 'Đóng gói đơn hàng',
      message: 'Đơn hàng #502 đã được xác nhận',
      targetType: 'ORDER',
      targetId: '502',
      isRead: true,
      read: true,
      createdAt: '2026-11-07T09:30:00Z',
    },
    {
      id: 'notif-3',
      title: 'Yêu cầu trả hàng',
      message: 'Khách hàng yêu cầu đổi trả cho sản phẩm SP-88',
      targetType: 'RETURN',
      targetId: '88',
      isRead: false,
      read: false,
      createdAt: '2026-11-07T08:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockContextValue = {
      notifications: sampleNotifications,
      unreadCount: 2,
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

    mockAuthValue = {
      isAuthenticated: true,
      user: { id: 'user-mod', role: 'moderator', fullName: 'Kiểm duyệt viên' },
    };
  });

  const renderWithProviders = (
    ui,
    { context = mockContextValue, auth = mockAuthValue } = {}
  ) => {
    return render(
      <MemoryRouter>
        <AuthContext.Provider value={auth}>
          <NotificationContext.Provider value={context}>
            {ui}
          </NotificationContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  describe('NotificationBell', () => {
    it('renders the bell button with notifications icon and accessible label', () => {
      renderWithProviders(<NotificationBell />);
      const button = screen.getByRole('button', { name: /thông báo/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('notifications');
    });

    it('does not render the badge when unreadCount is 0', () => {
      renderWithProviders(<NotificationBell />, {
        context: { ...mockContextValue, unreadCount: 0 },
      });
      const badge = screen.queryByTestId('notification-badge');
      expect(badge).not.toBeInTheDocument();
    });

    it('renders badge with count and design tokens (#FEA619, #1F2A37, rounded-full, font-sans) when unreadCount > 0', () => {
      renderWithProviders(<NotificationBell />, {
        context: { ...mockContextValue, unreadCount: 5 },
      });
      const badge = screen.getByTestId('notification-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');

      // Design token checks
      expect(badge.className).toMatch(/bg-\[#FEA619\]/);
      expect(badge.className).toMatch(/text-\[#1F2A37\]/);
      expect(badge.className).toMatch(/rounded-full/);
      expect(badge.className).toMatch(/font-sans/);
    });

    it('displays "9+" when unreadCount is greater than 9', () => {
      renderWithProviders(<NotificationBell />, {
        context: { ...mockContextValue, unreadCount: 15 },
      });
      const badge = screen.getByTestId('notification-badge');
      expect(badge).toHaveTextContent('9+');
    });

    it('toggles dropdown open and closed on bell click', async () => {
      renderWithProviders(<NotificationBell />);
      const bellButton = screen.getByRole('button', { name: /thông báo/i });

      // Initially closed
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();

      // Click to open
      await userEvent.click(bellButton);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Click again to close
      await userEvent.click(bellButton);
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      renderWithProviders(
        <div>
          <NotificationBell />
          <div data-testid="outside-element">Outside</div>
        </div>
      );
      const bellButton = screen.getByRole('button', { name: /thông báo/i });
      await userEvent.click(bellButton);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      // Click outside
      await userEvent.click(screen.getByTestId('outside-element'));
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });

    it('closes dropdown when pressing Escape key', async () => {
      renderWithProviders(<NotificationBell />);
      const bellButton = screen.getByRole('button', { name: /thông báo/i });
      await userEvent.click(bellButton);
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });

  describe('NotificationDropdown', () => {
    it('applies design tokens: #FFFFFF surface, #DDE5D9 border, rounded-2xl, shadow-xl, font-sans', () => {
      renderWithProviders(<NotificationDropdown onClose={vi.fn()} />);
      const dropdown = screen.getByTestId('notification-dropdown');
      expect(dropdown.className).toMatch(/bg-white|bg-\[#FFFFFF\]/i);
      expect(dropdown.className).toMatch(/border-\[#DDE5D9\]/);
      expect(dropdown.className).toMatch(/rounded-2xl/);
      expect(dropdown.className).toMatch(/shadow-xl/);
      expect(dropdown.className).toMatch(/font-sans/);
    });

    it('renders header with title "Thông báo", unread count, and "Đánh dấu tất cả đã đọc" button', async () => {
      const markAllAsRead = vi.fn();
      renderWithProviders(<NotificationDropdown onClose={vi.fn()} />, {
        context: { ...mockContextValue, markAllAsRead, unreadCount: 2 },
      });

      expect(screen.getByText('Thông báo')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();

      const markAllBtn = screen.getByRole('button', { name: /đánh dấu tất cả đã đọc/i });
      expect(markAllBtn).toBeInTheDocument();

      await userEvent.click(markAllBtn);
      expect(markAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('switches between "Tất cả" and "Chưa đọc" tabs', async () => {
      renderWithProviders(<NotificationDropdown onClose={vi.fn()} />);

      // Default "Tất cả" tab shows all 3 notifications
      expect(screen.getByText('Đơn kí gửi mới')).toBeInTheDocument();
      expect(screen.getByText('Đóng gói đơn hàng')).toBeInTheDocument();
      expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();

      // Click "Chưa đọc" tab
      const unreadTab = screen.getByRole('tab', { name: /chưa đọc/i });
      await userEvent.click(unreadTab);

      // Only unread notifications are shown (notif-1 and notif-3)
      expect(screen.getByText('Đơn kí gửi mới')).toBeInTheDocument();
      expect(screen.queryByText('Đóng gói đơn hàng')).not.toBeInTheDocument();
      expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();

      // Switch back to "Tất cả"
      const allTab = screen.getByRole('tab', { name: /tất cả/i });
      await userEvent.click(allTab);
      expect(screen.getByText('Đóng gói đơn hàng')).toBeInTheDocument();
    });

    it('renders notification items with title, message, formatted time and unread indicator', () => {
      renderWithProviders(<NotificationDropdown onClose={vi.fn()} />);

      // Unread item indicator (has dot or highlight background #F6F9F4)
      const item1 = screen.getByTestId('notification-item-notif-1');
      expect(item1.className).toMatch(/bg-\[#F6F9F4\]/);
      expect(within(item1).getByText('Đơn kí gửi mới')).toBeInTheDocument();
      expect(within(item1).getByText('Có đơn kí gửi ĐKG-101 cần kiểm định')).toBeInTheDocument();

      // Read item should not have unread background
      const item2 = screen.getByTestId('notification-item-notif-2');
      expect(item2.className).not.toMatch(/bg-\[#F6F9F4\]/);
    });

    it('clicking an item calls markAsRead, navigates via resolveNotificationUrl, and calls onClose', async () => {
      const markAsRead = vi.fn();
      const onClose = vi.fn();

      renderWithProviders(<NotificationDropdown onClose={onClose} />, {
        context: { ...mockContextValue, markAsRead },
      });

      const item1 = screen.getByTestId('notification-item-notif-1');
      await userEvent.click(item1);

      expect(markAsRead).toHaveBeenCalledWith('notif-1');
      expect(mockNavigate).toHaveBeenCalledWith('/moderator/consignments/101');
      expect(onClose).toHaveBeenCalled();
    });

    it('displays empty state when there are no notifications', () => {
      renderWithProviders(<NotificationDropdown onClose={vi.fn()} />, {
        context: { ...mockContextValue, notifications: [], unreadCount: 0 },
      });

      expect(screen.getByText(/không có thông báo nào/i)).toBeInTheDocument();
    });

    it('displays empty state when there are no unread notifications on "Chưa đọc" tab', async () => {
      renderWithProviders(<NotificationDropdown onClose={vi.fn()} />, {
        context: {
          ...mockContextValue,
          notifications: [sampleNotifications[1]], // read item only
          unreadCount: 0,
        },
      });

      const unreadTab = screen.getByRole('tab', { name: /chưa đọc/i });
      await userEvent.click(unreadTab);

      expect(screen.getByText(/không có thông báo chưa đọc/i)).toBeInTheDocument();
    });

    it('shows "Tải thêm" button when hasMore is true, and handles loadingMore state', async () => {
      const loadMoreNotifications = vi.fn();
      const { rerender } = renderWithProviders(
        <NotificationDropdown onClose={vi.fn()} />,
        {
          context: {
            ...mockContextValue,
            hasMore: true,
            loadingMore: false,
            loadMoreNotifications,
          },
        }
      );

      const loadMoreBtn = screen.getByRole('button', { name: /tải thêm/i });
      expect(loadMoreBtn).toBeInTheDocument();
      expect(loadMoreBtn).not.toBeDisabled();

      await userEvent.click(loadMoreBtn);
      expect(loadMoreNotifications).toHaveBeenCalledTimes(1);

      // When loadingMore is true
      rerender(
        <MemoryRouter>
          <AuthContext.Provider value={mockAuthValue}>
            <NotificationContext.Provider
              value={{
                ...mockContextValue,
                hasMore: true,
                loadingMore: true,
                loadMoreNotifications,
              }}
            >
              <NotificationDropdown onClose={vi.fn()} />
            </NotificationContext.Provider>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      const loadingBtn = screen.getByRole('button', { name: /đang tải|tải thêm/i });
      expect(loadingBtn).toBeDisabled();
    });
  });

  describe('NotificationToastItem', () => {
    const sampleToast = {
      id: 'toast-1',
      title: 'Đơn kí gửi mới',
      message: 'Có đơn kí gửi ĐKG-202 vừa gửi',
      targetType: 'CONSIGNMENT',
      targetId: '202',
      createdAt: '2026-11-07T12:00:00Z',
    };

    it('renders with design tokens: #FFFFFF, #DDE5D9, rounded-2xl, shadow-xl, font-sans, title #1F2A37, msg #586776', () => {
      renderWithProviders(
        <NotificationToastItem toast={sampleToast} onDismiss={vi.fn()} />
      );

      const toastEl = screen.getByTestId('notification-toast-item');
      expect(toastEl.className).toMatch(/bg-white|bg-\[#FFFFFF\]/i);
      expect(toastEl.className).toMatch(/border-\[#DDE5D9\]/);
      expect(toastEl.className).toMatch(/rounded-2xl/);
      expect(toastEl.className).toMatch(/shadow-xl/);
      expect(toastEl.className).toMatch(/font-sans/);

      const titleEl = screen.getByText('Đơn kí gửi mới');
      expect(titleEl.className).toMatch(/text-\[#1F2A37\]/);
      expect(titleEl.className).toMatch(/font-bold/);

      const msgEl = screen.getByText('Có đơn kí gửi ĐKG-202 vừa gửi');
      expect(msgEl.className).toMatch(/text-\[#586776\]/);
    });

    it('has a close button that dismisses the toast immediately', async () => {
      const onDismiss = vi.fn();
      renderWithProviders(
        <NotificationToastItem toast={sampleToast} onDismiss={onDismiss} />
      );

      const closeBtn = screen.getByRole('button', { name: /đóng/i });
      await userEvent.click(closeBtn);
      expect(onDismiss).toHaveBeenCalledWith('toast-1');
    });

    it('dismisses via gsap onComplete in production mode without relying on Node process', async () => {
      vi.stubEnv('MODE', 'production');
      const gsapSpy = vi.spyOn(gsap, 'to').mockImplementation((_, vars) => {
        vars?.onComplete?.();
        return {};
      });
      const onDismiss = vi.fn();
      try {
        renderWithProviders(
          <NotificationToastItem toast={sampleToast} onDismiss={onDismiss} />
        );

        const closeBtn = screen.getByRole('button', { name: /đóng/i });
        fireEvent.click(closeBtn);
        expect(gsapSpy).toHaveBeenCalled();
        expect(onDismiss).toHaveBeenCalledWith('toast-1');
      } finally {
        gsapSpy.mockRestore();
        vi.unstubAllEnvs();
      }
    });

    it('clicking toast body marks as read, navigates via resolveNotificationUrl, and dismisses', async () => {
      const markAsRead = vi.fn();
      const onDismiss = vi.fn();

      renderWithProviders(
        <NotificationToastItem toast={sampleToast} onDismiss={onDismiss} />,
        {
          context: { ...mockContextValue, markAsRead },
        }
      );

      const toastBody = screen.getByTestId('notification-toast-content');
      await userEvent.click(toastBody);

      expect(markAsRead).toHaveBeenCalledWith('toast-1');
      expect(mockNavigate).toHaveBeenCalledWith('/moderator/consignments/202');
      expect(onDismiss).toHaveBeenCalledWith('toast-1');
    });

    it('renders progress bar element for duration tracking', () => {
      renderWithProviders(
        <NotificationToastItem toast={sampleToast} onDismiss={vi.fn()} />
      );

      const progressBar = screen.getByTestId('notification-toast-progress');
      expect(progressBar).toBeInTheDocument();
    });

    it('auto-dismisses after 15 seconds (15000ms)', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();

      renderWithProviders(
        <NotificationToastItem toast={sampleToast} onDismiss={onDismiss} />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      // Fast forward 14999ms
      vi.advanceTimersByTime(14999);
      expect(onDismiss).not.toHaveBeenCalled();

      // Fast forward to 15000ms
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith('toast-1');

      vi.useRealTimers();
    });
  });

  describe('NotificationToastContainer', () => {
    it('renders with fixed position: fixed top-20 right-6 z-50', () => {
      renderWithProviders(<NotificationToastContainer />);
      const container = screen.getByTestId('notification-toast-container');
      expect(container.className).toMatch(/fixed/);
      expect(container.className).toMatch(/top-20/);
      expect(container.className).toMatch(/right-6/);
      expect(container.className).toMatch(/z-50/);
    });

    it('renders all active toasts from context', () => {
      const activeToasts = [
        {
          id: 'toast-1',
          title: 'Toast 1',
          message: 'Message 1',
          targetType: 'CONSIGNMENT',
          targetId: '1',
        },
        {
          id: 'toast-2',
          title: 'Toast 2',
          message: 'Message 2',
          targetType: 'ORDER',
          targetId: '2',
        },
      ];

      renderWithProviders(<NotificationToastContainer />, {
        context: { ...mockContextValue, activeToasts },
      });

      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
    });

    it('calls context dismissToast when a toast is closed', async () => {
      const dismissToast = vi.fn();
      const activeToasts = [
        {
          id: 'toast-100',
          title: 'Toast 100',
          message: 'Message 100',
        },
      ];

      renderWithProviders(<NotificationToastContainer />, {
        context: { ...mockContextValue, activeToasts, dismissToast },
      });

      const closeBtn = screen.getByRole('button', { name: /đóng/i });
      await userEvent.click(closeBtn);
      expect(dismissToast).toHaveBeenCalledWith('toast-100');
    });
  });
});
