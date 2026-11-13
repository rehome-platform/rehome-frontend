import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebar from '../../src/features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../../src/features/admin/components/AdminHeader.jsx';
import AppRouter from '../../src/routes/AppRouter.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { fullName: 'Quản trị viên', email: 'admin@rehome.vn', role: 'admin' },
    logout: vi.fn(),
  }),
}));

const MEMBERSHIP_SIDEBAR_ITEMS = [
  {
    path: '/admin/membership-plans',
    label: 'Cấu hình gói VIP',
    icon: 'workspace_premium',
  },
  {
    path: '/admin/membership-subscriptions',
    label: 'Thành viên VIP',
    icon: 'card_membership',
  },
  {
    path: '/admin/voucher-templates',
    label: 'Mẫu voucher',
    icon: 'confirmation_number',
  },
  {
    path: '/admin/membership-stats',
    label: 'Thống kê VIP & Voucher',
    icon: 'analytics',
  },
  {
    path: '/admin/membership-payments',
    label: 'Lịch sử thanh toán gói',
    icon: 'receipt_long',
  },
];

const HEADER_TITLE_CASES = [
  {
    route: '/admin/membership-plans',
    title: 'Cấu hình gói thành viên VIP',
  },
  {
    route: '/admin/membership-subscriptions',
    title: 'Danh sách thành viên VIP',
  },
  {
    route: '/admin/membership-subscriptions/sub-123',
    title: 'Chi tiết gói thành viên VIP',
  },
  {
    route: '/admin/voucher-templates',
    title: 'Quản lý mẫu voucher',
  },
  {
    route: '/admin/membership-stats',
    title: 'Thống kê gói VIP & Voucher',
  },
  {
    route: '/admin/membership-payments',
    title: 'Lịch sử thanh toán gói VIP',
  },
];

describe('Admin Membership & Voucher Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AdminSidebar', () => {
    it('renders the dedicated Gói VIP & Voucher group with all 5 navigation items and icons', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <AdminSidebar />
        </MemoryRouter>
      );

      expect(screen.getByText('Gói VIP & Voucher')).toBeInTheDocument();

      for (const item of MEMBERSHIP_SIDEBAR_ITEMS) {
        const link = screen.getByRole('link', { name: new RegExp(item.label, 'i') });
        expect(link).toHaveAttribute('href', item.path);
        expect(link.textContent).toContain(item.icon);
      }
    });

    it('highlights Thành viên VIP on both list and detail routes (/admin/membership-subscriptions/:id)', () => {
      const { rerender } = render(
        <MemoryRouter initialEntries={['/admin/membership-subscriptions']}>
          <AdminSidebar />
        </MemoryRouter>
      );

      const listLink = screen.getByRole('link', { name: /Thành viên VIP/i });
      expect(listLink.className).toContain('bg-[#006B2C]');

      rerender(
        <MemoryRouter initialEntries={['/admin/membership-subscriptions/sub-42']}>
          <AdminSidebar />
        </MemoryRouter>
      );

      const detailLink = screen.getByRole('link', { name: /Thành viên VIP/i });
      expect(detailLink.className).toContain('bg-[#006B2C]');
    });

    it.each(MEMBERSHIP_SIDEBAR_ITEMS)(
      'highlights $label when current path is $path',
      ({ path, label }) => {
        render(
          <MemoryRouter initialEntries={[path]}>
            <AdminSidebar />
          </MemoryRouter>
        );

        const link = screen.getByRole('link', { name: new RegExp(label, 'i') });
        expect(link.className).toContain('bg-[#006B2C]');
      }
    );
  });

  describe('AdminHeader', () => {
    it.each(HEADER_TITLE_CASES)(
      'renders "$title" for route $route',
      ({ route, title }) => {
        render(
          <MemoryRouter initialEntries={[route]}>
            <AdminHeader />
          </MemoryRouter>
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      }
    );
  });

  describe('AppRouter admin membership routes', () => {
    it.each(HEADER_TITLE_CASES)(
      'resolves $route inside AdminLayout with header "$title"',
      ({ route, title }) => {
        render(
          <MemoryRouter initialEntries={[route]}>
            <AppRouter />
          </MemoryRouter>
        );

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
        expect(screen.getByText('Gói VIP & Voucher')).toBeInTheDocument();
      }
    );
  });
});

