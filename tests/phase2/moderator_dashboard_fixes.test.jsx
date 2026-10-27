import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { isMemberRole, authService } from '../../src/features/auth/services/auth.service.js';
import { inventoryService } from '../../src/features/moderator/services/warehouseApi.js';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import WarehouseInventoryPage, { SUPPORTED_INVENTORY_STATUSES } from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import { API_BASE_URL, API_ENDPOINTS, getSockJsUrl } from '../../src/configs/api.config.js';
import { NotificationProvider, useNotification } from '../../src/context/NotificationContext.jsx';
import AuthContext from '../../src/context/AuthContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

// This suite tests HTTP notification failures; keep the realtime transport offline.
vi.mock('@stomp/stompjs', () => ({
  Client: class {
    activate() {}
    deactivate() {}
  },
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  server.resetHandlers();
  server.use(
    http.get(`${API_BASE_URL}/ws/info`, () => {
      return HttpResponse.json({ websocket: false, origins: ['*:*'], cookie_needed: false });
    }),
  );
  localStorage.clear();
});
afterAll(() => server.close());

// Mock auth context for moderator pages
const mockModeratorAuth = {
  user: { id: 'mod-1', email: 'mod@rehome.vn', role: 'staff', warehouseId: 'wh-1', warehouseName: 'Kho 1' },
  isAuthenticated: true,
  logout: vi.fn(),
};

function ModeratorWrapper({ children }) {
  return (
    <AuthContext.Provider value={mockModeratorAuth}>
      <MemoryRouter>
        <Phase2Provider>{children}</Phase2Provider>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('TASK-02: Role Verification & Member Profile Guarding', () => {
  it('isMemberRole identifies MEMBER correctly and rejects MODERATOR, ADMIN, and unknown roles', () => {
    // Valid MEMBER cases
    expect(isMemberRole('ROLE_MEMBER')).toBe(true);
    expect(isMemberRole('[ROLE_MEMBER]')).toBe(true);
    expect(isMemberRole(['ROLE_MEMBER'])).toBe(true);
    expect(isMemberRole([{ authority: 'ROLE_MEMBER' }])).toBe(true);

    // MODERATOR / STAFF cases
    expect(isMemberRole('ROLE_MODERATOR')).toBe(false);
    expect(isMemberRole('[ROLE_MODERATOR]')).toBe(false);
    expect(isMemberRole(['ROLE_MODERATOR'])).toBe(false);
    expect(isMemberRole('ROLE_STAFF')).toBe(false);

    // ADMIN cases
    expect(isMemberRole('ROLE_ADMIN')).toBe(false);
    expect(isMemberRole('[ROLE_ADMIN]')).toBe(false);
    expect(isMemberRole(['ROLE_ADMIN'])).toBe(false);
    expect(isMemberRole(['ROLE_MODERATOR', 'ROLE_ADMIN'])).toBe(false);

    // OTHER / UNKNOWN / EMPTY cases
    expect(isMemberRole('ROLE_ORGANIZATION')).toBe(false);
    expect(isMemberRole('ROLE_UNKNOWN')).toBe(false);
    expect(isMemberRole('')).toBe(false);
    expect(isMemberRole(null)).toBe(false);
    expect(isMemberRole(undefined)).toBe(false);
    expect(isMemberRole([])).toBe(false);
  });

  it('Moderator login does NOT trigger GET /members/me', async () => {
    let memberMeCalled = false;

    server.use(
      http.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, () => {
        return HttpResponse.json({
          accessToken: 'test-moderator-token',
          refreshToken: 'test-refresh-token',
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, () => {
        return HttpResponse.json({
          email: 'moderator@rehome.vn',
          authorities: '[ROLE_MODERATOR]',
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MEMBER.ME}`, () => {
        memberMeCalled = true;
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      }),
    );

    const result = await authService.login({
      email: 'moderator@rehome.vn',
      password: 'password123',
    });

    expect(memberMeCalled).toBe(false);
    expect(result.user.role).toBe('staff');
    expect(result.user.email).toBe('moderator@rehome.vn');
  });

  it('Admin login does NOT trigger GET /members/me', async () => {
    let memberMeCalled = false;

    server.use(
      http.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, () => {
        return HttpResponse.json({
          accessToken: 'test-admin-token',
          refreshToken: 'test-refresh-token',
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, () => {
        return HttpResponse.json({
          email: 'admin@rehome.vn',
          authorities: '[ROLE_ADMIN]',
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MEMBER.ME}`, () => {
        memberMeCalled = true;
        return HttpResponse.json({ message: 'Forbidden' }, { status: 403 });
      }),
    );

    const result = await authService.login({
      email: 'admin@rehome.vn',
      password: 'password123',
    });

    expect(memberMeCalled).toBe(false);
    expect(result.user.role).toBe('admin');
  });

  it('Member login DOES trigger GET /members/me and loads profile', async () => {
    let memberMeCalled = false;

    server.use(
      http.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, () => {
        return HttpResponse.json({
          accessToken: 'test-member-token',
          refreshToken: 'test-refresh-token',
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.AUTH.ME}`, () => {
        return HttpResponse.json({
          email: 'member@rehome.vn',
          authorities: '[ROLE_MEMBER]',
        });
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MEMBER.ME}`, () => {
        memberMeCalled = true;
        return HttpResponse.json({
          data: {
            accountId: 88,
            fullName: 'Nguyễn Thành Viên',
            phone: '0901234567',
            memberCode: 'MEM-88',
          },
        });
      }),
    );

    const result = await authService.login({
      email: 'member@rehome.vn',
      password: 'password123',
    });

    expect(memberMeCalled).toBe(true);
    expect(result.user.role).toBe('member');
    expect(result.user.fullName).toBe('Nguyễn Thành Viên');
    expect(result.user.memberCode).toBe('MEM-88');
  });
});

describe('TASK-01: Stop Sending Unsupported WAITING_END_OF_TERM Status', () => {
  it('inventoryService.list does NOT send status=WAITING_END_OF_TERM to /inventory', async () => {
    let capturedStatus = null;

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, ({ request }) => {
        const url = new URL(request.url);
        capturedStatus = url.searchParams.get('status');
        return HttpResponse.json({ content: [], totalElements: 0, totalPages: 0 });
      }),
    );

    await inventoryService.list({ status: 'WAITING_END_OF_TERM' });
    expect(capturedStatus).toBeNull();

    // Valid status is passed through correctly
    await inventoryService.list({ status: 'ON_SALE' });
    expect(capturedStatus).toBe('ON_SALE');
  });

  it('SUPPORTED_INVENTORY_STATUSES contains only supported backend enum values', () => {
    expect(SUPPORTED_INVENTORY_STATUSES).toEqual([
      'ON_SALE',
      'RESERVED',
      'SOLD',
      'WITHDRAWN',
      'UNCLAIMED',
      'DONATED',
      'DESTROYED',
    ]);
    expect(SUPPORTED_INVENTORY_STATUSES).not.toContain('WAITING_END_OF_TERM');
    expect(SUPPORTED_INVENTORY_STATUSES).not.toContain('PAID');
  });

  it('WarehouseHomePage renders stock rows and displays "—" for WAITING_END_OF_TERM without querying it', async () => {
    const queriedStatuses = [];

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, () => {
        return HttpResponse.json([]);
      }),
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        queriedStatuses.push(status);
        return HttpResponse.json({
          content: status === 'ON_SALE' ? [{ id: 1 }] : [],
          totalElements: status === 'ON_SALE' ? 1 : 0,
        });
      }),
    );

    render(
      <ModeratorWrapper>
        <WarehouseHomePage />
      </ModeratorWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText('Chờ xử lý cuối kỳ')).toBeInTheDocument();
    });

    // WAITING_END_OF_TERM metric shows "—"
    expect(screen.getByText('—')).toBeInTheDocument();

    // Verify WAITING_END_OF_TERM was never requested
    expect(queriedStatuses).not.toContain('WAITING_END_OF_TERM');
    expect(queriedStatuses).toContain('ON_SALE');
    expect(queriedStatuses).toContain('UNCLAIMED');
  });

  it('WarehouseInventoryPage dropdown options contain only supported statuses', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, () => {
        return HttpResponse.json({ content: [], totalElements: 0, totalPages: 0 });
      }),
    );

    render(
      <ModeratorWrapper>
        <WarehouseInventoryPage />
      </ModeratorWrapper>,
    );

    const options = screen.getAllByRole('option').map((opt) => opt.value);
    expect(options).toContain(''); // "Tất cả trạng thái"
    expect(options).toContain('ON_SALE');
    expect(options).toContain('RESERVED');
    expect(options).toContain('SOLD');
    expect(options).toContain('WITHDRAWN');
    expect(options).toContain('UNCLAIMED');
    expect(options).toContain('DONATED');
    expect(options).toContain('DESTROYED');

    // Never includes unsupported values
    expect(options).not.toContain('WAITING_END_OF_TERM');
    expect(options).not.toContain('PAID');
  });
});

describe('TASK-03 & TASK-04: SockJS URL Construction & Notifications Endpoint Handling', () => {
  it('getSockJsUrl constructs HTTP(S) URL and never returns ws: or wss:', () => {
    expect(getSockJsUrl('https://re-backend-9a98.onrender.com')).toBe(
      'https://re-backend-9a98.onrender.com/ws',
    );
    expect(getSockJsUrl('http://localhost:8080')).toBe('http://localhost:8080/ws');
    expect(getSockJsUrl('wss://re-backend-9a98.onrender.com')).toBe(
      'https://re-backend-9a98.onrender.com/ws',
    );
    expect(getSockJsUrl('ws://localhost:8080')).toBe('http://localhost:8080/ws');
    expect(getSockJsUrl('https://re-backend-9a98.onrender.com/')).toBe(
      'https://re-backend-9a98.onrender.com/ws',
    );

    const result = getSockJsUrl('https://api.test.com');
    expect(result.startsWith('ws:')).toBe(false);
    expect(result.startsWith('wss:')).toBe(false);
    expect(result.startsWith('https:') || result.startsWith('http:')).toBe(true);
  });

  it('API_ENDPOINTS.NOTIFICATIONS uses documented /notifications path without duplicate prefix', () => {
    expect(API_ENDPOINTS.NOTIFICATIONS.LIST).toBe('/notifications');
    expect(API_ENDPOINTS.NOTIFICATIONS.MARK_READ('42')).toBe('/notifications/42/read');
    expect(API_ENDPOINTS.NOTIFICATIONS.LIST.startsWith('/api/api')).toBe(false);
  });

  it('NotificationContext handles 404 gracefully without crashing or fabricating notifications', async () => {
    let notificationsRequested = false;

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.NOTIFICATIONS.LIST}`, () => {
        notificationsRequested = true;
        return HttpResponse.json({ message: 'Not Found' }, { status: 404 });
      }),
    );

    function TestConsumer() {
      const { notifications, unreadCount, error, loading } = useNotification();
      return (
        <div>
          <span data-testid="count">{unreadCount}</span>
          <span data-testid="len">{notifications.length}</span>
          <span data-testid="error">{error ? error.message : 'no-error'}</span>
          <span data-testid="loading">{loading ? 'loading' : 'idle'}</span>
        </div>
      );
    }

    const mockAuth = {
      isAuthenticated: true,
      user: { id: 'test-user-1' },
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuth}>
        <NotificationProvider>
          <TestConsumer />
        </NotificationProvider>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('idle');
    });

    expect(notificationsRequested).toBe(true);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('len')).toHaveTextContent('0');
    // Error state is captured, distinguishing failure from successful empty state
    expect(screen.getByTestId('error')).toHaveTextContent(
      'Dịch vụ thông báo chưa được hỗ trợ trên hệ thống máy chủ',
    );
  });
});
