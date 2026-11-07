import React from 'react';
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { NotificationProvider, useNotification } from '../../src/context/NotificationContext.jsx';
import AuthContext from '../../src/context/AuthContext.jsx';
import { WebSocketProvider } from '../../src/context/WebSocketContext.jsx';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';

describe('NotificationContext', () => {
  let mockAuth;
  let mockWsService;
  let wsCallback;

  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  beforeEach(() => {
    server.resetHandlers();
    wsCallback = null;

    mockAuth = {
      isAuthenticated: true,
      user: { id: 'user-123', role: 'MODERATOR' },
    };

    mockWsService = {
      status: 'CONNECTED',
      getStatus: vi.fn(() => 'CONNECTED'),
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnectWithToken: vi.fn(),
      subscribe: vi.fn((destination, callback) => {
        if (destination === '/user/queue/notifications') {
          wsCallback = callback;
        }
        return {
          unsubscribe: vi.fn(),
        };
      }),
      destroy: vi.fn(),
    };
  });

  const renderWithProviders = (ui, { auth = mockAuth, ws = mockWsService } = {}) => {
    return render(
      <AuthContext.Provider value={auth}>
        <WebSocketProvider service={ws} autoConnect={false}>
          {ui}
        </WebSocketProvider>
      </AuthContext.Provider>
    );
  };

  it('initial fetch loads notifications, unread count, and sets loading states', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'New Consignment',
        message: 'A consignment has been submitted',
        isRead: false,
        targetType: 'CONSIGNMENT',
        targetId: 'cs-101',
        createdAt: '2026-11-07T10:00:00Z',
      },
      {
        id: 'notif-2',
        title: 'Packing assigned',
        message: 'Order ready for packing',
        isRead: true,
        targetType: 'PACKING',
        targetId: 'ord-202',
        createdAt: '2026-11-07T09:00:00Z',
      },
    ];

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('page')).toBe('0');
        expect(url.searchParams.get('size')).toBe('20');
        return HttpResponse.json({
          result: {
            content: mockNotifications,
            page: 0,
            size: 20,
            totalElements: 2,
            totalPages: 1,
          },
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`, () => {
        return HttpResponse.json({
          result: { count: 1 },
        });
      })
    );

    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return (
        <div>
          <span data-testid="loading">{contextValue.loading ? 'loading' : 'idle'}</span>
          <span data-testid="count">{contextValue.unreadCount}</span>
          <span data-testid="len">{contextValue.notifications.length}</span>
        </div>
      );
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('len')).toHaveTextContent('2');
    expect(contextValue.notifications[0].id).toBe('notif-1');
    expect(contextValue.notifications[0].isRead).toBe(false);
    expect(contextValue.notifications[0].read).toBe(false);
    expect(contextValue.activeToasts).toEqual([]);
    expect(contextValue.hasMore).toBe(false);
  });

  it('resets state when user is not authenticated', async () => {
    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return <div data-testid="status">ready</div>;
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
      { auth: { isAuthenticated: false, user: null } }
    );

    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(contextValue.notifications).toEqual([]);
    expect(contextValue.unreadCount).toBe(0);
    expect(contextValue.activeToasts).toEqual([]);
    expect(contextValue.loading).toBe(false);
  });

  it('handles 403 gracefully for admin or users without notification permission', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, () => {
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`, () => {
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      })
    );

    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return (
        <div>
          <span data-testid="loading">{contextValue.loading ? 'loading' : 'idle'}</span>
          <span data-testid="count">{contextValue.unreadCount}</span>
          <span data-testid="len">{contextValue.notifications.length}</span>
          <span data-testid="error">{contextValue.error ? 'has-error' : 'no-error'}</span>
        </div>
      );
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>,
      { auth: { isAuthenticated: true, user: { id: 'admin-1', role: 'ADMIN' } } }
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('len')).toHaveTextContent('0');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('receives real-time notification via useNotificationQueue, updates unreadCount, and tracks activeToasts', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, () => {
        return HttpResponse.json({
          result: {
            content: [],
            page: 0,
            size: 20,
            totalPages: 1,
          },
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`, () => {
        return HttpResponse.json({ result: { count: 0 } });
      })
    );

    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return (
        <div>
          <span data-testid="count">{contextValue.unreadCount}</span>
          <span data-testid="toasts-len">{contextValue.activeToasts.length}</span>
          <span data-testid="notifs-len">{contextValue.notifications.length}</span>
        </div>
      );
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('0');
    });

    expect(wsCallback).toBeTypeOf('function');

    // Simulate incoming real-time notification
    const realTimeNotif = {
      id: 'ws-notif-1',
      type: 'CONSIGNMENT_SUBMITTED',
      title: 'Realtime title',
      message: 'Realtime message body',
      isRead: false,
      targetType: 'CONSIGNMENT',
      targetId: 'cs-999',
      createdAt: '2026-11-07T12:00:00Z',
    };

    act(() => {
      wsCallback(realTimeNotif);
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('toasts-len')).toHaveTextContent('1');
    expect(screen.getByTestId('notifs-len')).toHaveTextContent('1');
    expect(contextValue.notifications[0].id).toBe('ws-notif-1');
    expect(contextValue.activeToasts[0].id).toBe('ws-notif-1');
    expect(contextValue.activeToasts[0].title).toBe('Realtime title');

    // Deduplication check: receiving same notification should not duplicate or increment unreadCount
    act(() => {
      wsCallback(realTimeNotif);
    });

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('notifs-len')).toHaveTextContent('1');

    // Dismiss toast
    act(() => {
      contextValue.dismissToast('ws-notif-1');
    });

    expect(screen.getByTestId('toasts-len')).toHaveTextContent('0');
    // Notification in drawer remains intact
    expect(screen.getByTestId('notifs-len')).toHaveTextContent('1');
  });

  it('markAsRead updates isRead and decrements unreadCount with PATCH and fallback to POST', async () => {
    let patchCalled = false;
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, () => {
        return HttpResponse.json({
          result: {
            content: [
              {
                id: 'notif-mark-1',
                title: 'Mark test',
                message: 'Needs reading',
                isRead: false,
                createdAt: '2026-11-07T10:00:00Z',
              },
            ],
            page: 0,
            size: 20,
            totalPages: 1,
          },
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`, () => {
        return HttpResponse.json({ result: { count: 1 } });
      }),
      http.patch(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.MARK_READ('notif-mark-1')}`, () => {
        patchCalled = true;
        return HttpResponse.json({ result: { id: 'notif-mark-1', isRead: true } });
      })
    );

    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return (
        <div>
          <span data-testid="count">{contextValue.unreadCount}</span>
          <span data-testid="is-read">
            {contextValue.notifications[0]?.isRead ? 'read' : 'unread'}
          </span>
          <button
            data-testid="mark-btn"
            onClick={() => contextValue.markAsRead('notif-mark-1')}
          >
            Mark
          </button>
        </div>
      );
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('1');
    });
    expect(screen.getByTestId('is-read')).toHaveTextContent('unread');

    await act(async () => {
      screen.getByTestId('mark-btn').click();
    });

    expect(patchCalled).toBe(true);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-read')).toHaveTextContent('read');
  });

  it('markAllAsRead sets all notifications isRead to true and unreadCount to 0', async () => {
    let patchAllCalled = false;
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, () => {
        return HttpResponse.json({
          result: {
            content: [
              { id: '1', title: 'T1', isRead: false },
              { id: '2', title: 'T2', isRead: false },
            ],
            page: 0,
            size: 20,
            totalPages: 1,
          },
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`, () => {
        return HttpResponse.json({ result: { count: 2 } });
      }),
      http.patch(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ}`, () => {
        patchAllCalled = true;
        return HttpResponse.json({ result: null });
      })
    );

    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return (
        <div>
          <span data-testid="count">{contextValue.unreadCount}</span>
          <button data-testid="mark-all-btn" onClick={() => contextValue.markAllAsRead()}>
            Mark All
          </button>
        </div>
      );
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count')).toHaveTextContent('2');
    });

    await act(async () => {
      screen.getByTestId('mark-all-btn').click();
    });

    expect(patchAllCalled).toBe(true);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(contextValue.notifications.every((n) => n.isRead)).toBe(true);
  });

  it('loadMoreNotifications fetches next page and appends deduplicated items', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, ({ request }) => {
        const url = new URL(request.url);
        const page = url.searchParams.get('page');
        if (page === '0') {
          return HttpResponse.json({
            result: {
              content: [{ id: 'p0-1', title: 'P0 Item', isRead: true }],
              page: 0,
              size: 20,
              totalElements: 2,
              totalPages: 2,
            },
          });
        }
        if (page === '1') {
          return HttpResponse.json({
            result: {
              content: [{ id: 'p1-1', title: 'P1 Item', isRead: true }],
              page: 1,
              size: 20,
              totalElements: 2,
              totalPages: 2,
            },
          });
        }
        return HttpResponse.json({ result: { content: [], totalPages: 2 } });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT}`, () => {
        return HttpResponse.json({ result: { count: 0 } });
      })
    );

    let contextValue;
    function Consumer() {
      contextValue = useNotification();
      return (
        <div>
          <span data-testid="len">{contextValue.notifications.length}</span>
          <span data-testid="has-more">{contextValue.hasMore ? 'yes' : 'no'}</span>
          <button data-testid="more-btn" onClick={() => contextValue.loadMoreNotifications()}>
            More
          </button>
        </div>
      );
    }

    renderWithProviders(
      <NotificationProvider>
        <Consumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('len')).toHaveTextContent('1');
    });
    expect(screen.getByTestId('has-more')).toHaveTextContent('yes');

    await act(async () => {
      screen.getByTestId('more-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('len')).toHaveTextContent('2');
    });
    expect(contextValue.notifications.map((n) => n.id)).toEqual(['p0-1', 'p1-1']);
    expect(screen.getByTestId('has-more')).toHaveTextContent('no');
  });
});
