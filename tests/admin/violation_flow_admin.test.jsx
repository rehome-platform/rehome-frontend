import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminAuditLogsView from '../../src/features/admin/components/AdminAuditLogsView.jsx';
import AdminAccountsPage from '../../src/features/admin/pages/AdminAccountsPage.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getAuditLogFilterOptions: vi.fn(),
    getAuditLogs: vi.fn(),
    getAccounts: vi.fn(),
    banAccount: vi.fn(),
    unbanAccount: vi.fn(),
  },
  adminApi: {
    getAuditLogFilterOptions: vi.fn(),
    getAuditLogs: vi.fn(),
    getAccounts: vi.fn(),
    banAccount: vi.fn(),
    unbanAccount: vi.fn(),
  },
}));

describe('Admin Violation Report Flow (Audit Logs & Moderator PROPOSE_BAN)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders Vietnamese labels and closedReportCount for violation resolution audit logs in AdminAuditLogsView', async () => {
    vi.mocked(adminApi.getAuditLogFilterOptions).mockResolvedValueOnce({
      actionTypes: [
        'VIOLATION_RESOLVE_REMOVE_POST',
        'VIOLATION_RESOLVE_HIDE_CAMPAIGN',
        'VIOLATION_RESOLVE_WARN_ORG',
        'VIOLATION_RESOLVE_PROPOSE_BAN',
        'VIOLATION_DISMISS',
      ],
    });

    vi.mocked(adminApi.getAuditLogs).mockResolvedValueOnce({
      content: [
        {
          id: 'AUD-VP-01',
          actorName: 'Moderator Trần Hà',
          actorRole: 'MODERATOR',
          actionType: 'VIOLATION_RESOLVE_PROPOSE_BAN',
          targetType: 'ORGANIZATION_ACCOUNT',
          targetId: 'ORG-ACC-001',
          detail: {
            reason: 'Tổ chức tái phạm đăng chiến dịch giả mạo lần thứ 3',
            closedReportCount: 4,
            primaryReportId: 'REP-999',
          },
          createdAt: '2026-11-10T09:30:00Z',
        },
      ],
    });

    render(<AdminAuditLogsView />);

    await waitFor(() => {
      expect(screen.getAllByText(/Đề xuất khóa tổ chức/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Tổ chức tái phạm đăng chiến dịch giả mạo lần thứ 3/i)).toBeInTheDocument();
    expect(screen.getByText(/RESOLVED \(4 báo cáo\)/i)).toBeInTheDocument();
  });

  it('displays Moderator PROPOSE_BAN proposals in AdminAccountsPage and allows Admin to ban the organization or dismiss', async () => {
    vi.mocked(adminApi.getAccounts).mockResolvedValue({
      content: [
        {
          accountId: 'ORG-ACC-001',
          fullName: 'Quỹ Từ Thiện Ánh Sáng',
          email: 'contact@anhsang.org.vn',
          phone: '0901234567',
          role: 'ORGANIZATION',
          status: 'ACTIVE',
          createdAt: '2026-05-01T00:00:00Z',
        },
      ],
    });

    vi.mocked(adminApi.getAuditLogs).mockResolvedValue({
      content: [
        {
          id: 'AUD-BAN-PROP-1',
          actorName: 'Phạm Thu Hà',
          actorRole: 'MODERATOR',
          actionType: 'VIOLATION_RESOLVE_PROPOSE_BAN',
          targetType: 'ORGANIZATION_ACCOUNT',
          targetId: 'ORG-ACC-001',
          detail: {
            reason: 'Tái phạm nhiều lần quy chế chiến dịch quyên góp',
            closedReportCount: 5,
            primaryReportId: 'REP-101',
          },
          createdAt: '2026-11-10T10:00:00Z',
        },
        {
          id: 'AUD-WARN-1',
          actorName: 'Phạm Thu Hà',
          actorRole: 'MODERATOR',
          actionType: 'VIOLATION_RESOLVE_WARN_ORG',
          targetType: 'ORGANIZATION_ACCOUNT',
          targetId: 'ORG-ACC-001',
          detail: {
            reason: 'Cảnh cáo lần 1 về sao kê chậm trễ',
            closedReportCount: 2,
            primaryReportId: 'REP-050',
          },
          createdAt: '2026-10-20T08:00:00Z',
        },
      ],
    });

    vi.mocked(adminApi.banAccount).mockResolvedValue({ status: 'BANNED' });

    render(
      <MemoryRouter>
        <AdminAccountsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Đề xuất khóa tài khoản từ Moderator/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText('Quỹ Từ Thiện Ánh Sáng').length).toBeGreaterThan(0);
    expect(screen.getByText(/Tái phạm nhiều lần quy chế chiến dịch quyên góp/i)).toBeInTheDocument();

    // Click button to ban directly from the proposal card
    const banBtn = screen.getByRole('button', { name: /Khóa theo đề xuất/i });
    fireEvent.click(banBtn);

    await waitFor(() => {
      expect(adminApi.banAccount).toHaveBeenCalledWith(
        'ORG-ACC-001',
        expect.stringContaining('Tái phạm nhiều lần quy chế chiến dịch quyên góp')
      );
    });
  });
});

