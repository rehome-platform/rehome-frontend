import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminModeratorsView from '../../src/features/admin/components/AdminModeratorsView.jsx';
import AdminAuditLogsView from '../../src/features/admin/components/AdminAuditLogsView.jsx';
import GrantMembershipModal from '../../src/features/admin/membership/GrantMembershipModal.jsx';
import MembershipSubscriptionsPage from '../../src/features/admin/membership/MembershipSubscriptionsPage.jsx';
import ViolationWordsPage from '../../src/features/admin/pages/ViolationWordsPage.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';
import membershipAdminApi from '../../src/features/admin/services/membershipAdminApi.js';
import violationWordAdminApi from '../../src/features/admin/services/violationWordAdminApi.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

function wrap(ui) {
  return (
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('Admin server-backed search enforces minimum 2 characters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('AdminModeratorsView skips API call for 1 char and calls API for >= 2 chars', async () => {
    vi.spyOn(adminApi, 'getWarehouses').mockResolvedValue([]);
    const getModerators = vi.spyOn(adminApi, 'getModerators').mockResolvedValue({ content: [] });

    render(wrap(<AdminModeratorsView />));
    await waitFor(() => expect(getModerators).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Tìm theo tên, email hoặc số điện thoại/i);
    await user.type(input, 'a');

    expect(screen.getByText('Nhập ít nhất 2 ký tự để tìm kiếm')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    expect(getModerators).toHaveBeenCalledTimes(1);

    await user.type(input, 'n');
    await waitFor(() => {
      expect(getModerators).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'an' }));
    });
  });

  it('ViolationWordsPage skips API call for 1 char and calls API for >= 2 chars', async () => {
    const searchSpy = vi.spyOn(violationWordAdminApi, 'search').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    render(wrap(<ViolationWordsPage />));
    await waitFor(() => expect(searchSpy).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Tìm theo từ/i);
    await user.type(input, 'x');

    expect(screen.getByText('Nhập ít nhất 2 ký tự để tìm kiếm')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    expect(searchSpy).toHaveBeenCalledTimes(1);

    await user.type(input, 'y');
    await waitFor(() => {
      expect(searchSpy).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: 'xy' }));
    });
  });

  it('GrantMembershipModal skips account lookup for 1 char and calls API for >= 2 chars', async () => {
    const getAccounts = vi.spyOn(adminApi, 'getAccounts').mockResolvedValue({ content: [] });

    render(wrap(<GrantMembershipModal isOpen={true} onClose={() => {}} onSuccess={() => {}} />));

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Tìm theo tên, email hoặc mã thành viên/i);
    await user.type(input, 'a');

    expect(screen.getByText('Nhập ít nhất 2 ký tự để tìm kiếm')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    expect(getAccounts).not.toHaveBeenCalled();

    await user.type(input, 'n');
    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalledWith(expect.objectContaining({ search: 'an' }));
    });
  });

  it('MembershipSubscriptionsPage skips API call for 1 char and calls API for >= 2 chars', async () => {
    const getSubs = vi.spyOn(membershipAdminApi, 'getSubscriptions').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    render(wrap(<MembershipSubscriptionsPage />));
    await waitFor(() => expect(getSubs).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Tên, email hoặc mã thành viên/i);
    await user.type(input, 'm');

    expect(screen.getByText('Nhập ít nhất 2 ký tự để tìm kiếm')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    expect(getSubs).toHaveBeenCalledTimes(1);

    await user.type(input, 'e');
    await waitFor(() => {
      expect(getSubs).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'me' }));
    });
  });

  it('AdminAuditLogsView skips API call for 1 char and calls API for >= 2 chars', async () => {
    vi.spyOn(adminApi, 'getAuditLogFilterOptions').mockResolvedValue({ actionTypes: [] });
    const getAuditLogs = vi.spyOn(adminApi, 'getAuditLogs').mockResolvedValue({ content: [] });

    render(wrap(<AdminAuditLogsView />));
    await waitFor(() => expect(getAuditLogs).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/Người thực hiện \(tên hoặc email\)/i);
    await user.type(input, 'a');

    expect(screen.getByText('Nhập ít nhất 2 ký tự để tìm kiếm')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 450));
    expect(getAuditLogs).toHaveBeenCalledTimes(1);

    await user.type(input, 'd');
    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ad' }));
    });
  });
});
