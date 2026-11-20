import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserAccountDropdown from '../../src/components/common/UserAccountDropdown.jsx';
import ModeratorLayout from '../../src/layouts/ModeratorLayout.jsx';
import AdminLayout from '../../src/layouts/AdminLayout.jsx';
import AdminSidebar from '../../src/features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../../src/features/admin/components/AdminHeader.jsx';

const mockLogout = vi.fn();
let mockAuthUser = {
  fullName: 'Phạm Thị Thu Hà',
  email: 'moderator1@rehome.com',
  memberCode: 'MOD000001',
  role: 'moderator',
  warehouseName: 'Kho ReHome TP.HCM',
};

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isAuthenticated: true,
    logout: mockLogout,
    loggingOut: false,
  }),
}));

vi.mock('../../src/components/notification/index.js', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

describe('UserAccountDropdown & Moderator/Admin Shell Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('UserAccountDropdown toggles on click & keyboard, closes on Escape/outside/profile, and delegates logout', () => {
    render(
      <MemoryRouter>
        <div>
          <button type="button">Outside</button>
          <UserAccountDropdown
            user={mockAuthUser}
            logout={mockLogout}
            roleLabel="Nhân viên điểm kí gửi"
            subtitle="MOD000001"
            dropdownId="test-account-dropdown"
          />
        </div>
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: /Phạm Thị Thu Hà/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'test-account-dropdown');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('test-account-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên điểm kí gửi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hồ sơ cá nhân & Đổi mật khẩu/i })).toHaveAttribute('href', '/profile');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('test-account-dropdown')).not.toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(document.getElementById('test-account-dropdown')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất/i }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(document.getElementById('test-account-dropdown')).not.toBeInTheDocument();
  });

  it('ModeratorLayout renders account dropdown matching Admin design instead of plain Link', () => {
    mockAuthUser = {
      fullName: 'Phạm Thị Thu Hà',
      email: 'moderator1@rehome.com',
      memberCode: 'MOD000001',
      role: 'moderator',
      warehouseName: 'Kho ReHome TP.HCM',
    };

    render(
      <MemoryRouter initialEntries={['/moderator']}>
        <ModeratorLayout>
          <div>Body</div>
        </ModeratorLayout>
      </MemoryRouter>
    );

    const trigger = screen.getByRole('button', { name: /Phạm Thị Thu Hà/i });
    expect(trigger).toHaveAttribute('aria-controls', 'moderator-account-dropdown');

    fireEvent.click(trigger);
    expect(document.getElementById('moderator-account-dropdown')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên điểm kí gửi')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Hồ sơ cá nhân & Đổi mật khẩu/i })).toHaveAttribute('href', '/profile');
  });

  it('AdminSidebar matches Moderator design: ReHome Logo, 3 nav groups, collapse toggle, and Cài đặt · Đăng xuất footer', () => {
    mockAuthUser = {
      fullName: 'Quản trị viên',
      email: 'admin@rehome.com',
      role: 'admin',
    };

    render(
      <MemoryRouter initialEntries={['/admin/audit-logs']}>
        <AdminSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('img', { name: 'ReHome logo icon' })).toBeInTheDocument();
    expect(screen.getByText('Tổng quan & Tài chính')).toBeInTheDocument();
    expect(screen.getByText('Người dùng & Vận hành')).toBeInTheDocument();
    expect(screen.getByText('Gói thành viên & Hệ thống')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nhật ký hệ thống/i })).toHaveAttribute('href', '/admin/audit-logs');
    expect(screen.queryByText(/^Audit log$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thu gọn thanh bên/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cài đặt/i })).toHaveAttribute('href', '/profile');
  });

  it('AdminLayout persists sidebar collapse state and applies Design Token palette class', () => {
    mockAuthUser = {
      fullName: 'Quản trị viên',
      email: 'admin@rehome.com',
      role: 'admin',
    };

    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminLayout>
          <div>Dashboard body</div>
        </AdminLayout>
      </MemoryRouter>
    );

    expect(container.firstChild.className).toContain('moderator-api-colors');
    expect(container.firstChild.className).toContain('bg-background');

    const toggleBtn = screen.getByRole('button', { name: /Thu gọn thanh bên/i });
    fireEvent.click(toggleBtn);
    expect(window.localStorage.getItem('admin_sidebar_collapsed')).toBe('true');
  });

  it('AdminHeader renders Vietnamese role badge and Nhật ký hệ thống title without (Admin)', () => {
    mockAuthUser = {
      fullName: 'Nguyễn Quản Trị',
      email: 'admin@rehome.com',
      role: 'admin',
    };

    render(
      <MemoryRouter initialEntries={['/admin/audit-logs']}>
        <AdminHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nhật ký hệ thống');
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
    expect(screen.queryByText(/\(Admin\)/i)).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /Nguyễn Quản Trị/i });
    expect(trigger).toHaveAttribute('aria-controls', 'admin-account-dropdown');
  });
});
