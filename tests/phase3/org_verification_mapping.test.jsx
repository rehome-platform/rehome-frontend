import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import {
  VerificationQueueTabs,
  VerificationQueueTable,
  VerificationDocuments,
  VerificationChecklist,
} from '../../src/features/moderator/components/verification/VerificationSections.jsx';
import { useOrgVerification } from '../../src/features/moderator/hooks/useOrgVerification.jsx';
import orgVerificationService from '../../src/features/moderator/services/orgVerificationApi.js';

describe('Organization Verification Data Mapping & Design Tokens', () => {
  const mockQueue = [
    {
      id: 'q-1',
      refId: 'org-uuid-1',
      legalName: 'Quỹ Hy Vọng Tương Lai',
      name: 'Quỹ Hy Vọng Tương Lai',
      orgType: 'Quỹ từ thiện',
      type: 'Quỹ từ thiện',
      taxCode: '0102030405',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      waitTime: 'Vừa nộp',
      submissionCount: 'Nộp lần đầu',
    },
    {
      id: 'q-2',
      refId: 'org-uuid-2',
      legalName: 'Doanh Nghiệp Xã Hội Xanh',
      name: 'Doanh Nghiệp Xã Hội Xanh',
      orgType: 'Doanh nghiệp xã hội',
      type: 'Doanh nghiệp xã hội',
      taxCode: 'không có',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      waitTime: '1 ngày',
      submissionCount: 'Nộp lần đầu',
    },
    {
      id: 'q-3',
      refId: 'org-uuid-3',
      legalName: 'Tổ Chức Đã Duyệt',
      status: 'VERIFIED',
    },
  ];

  it('VerificationQueueTabs computes dynamic counts without hardcoded numbers', () => {
    const setActiveQueueTab = vi.fn();
    render(
      <VerificationQueueTabs
        setActiveQueueTab={setActiveQueueTab}
        activeQueueTab="PENDING"
        orgsQueue={mockQueue}
      />
    );

    // Dynamic count for PENDING: 2 items
    expect(screen.getByText('Chờ xác minh · 2')).toBeInTheDocument();
    // Dynamic count for WAITING_DOCS: 0
    expect(screen.getByText('Đang chờ bổ sung · 0')).toBeInTheDocument();
    // Dynamic count for VERIFIED: 1
    expect(screen.getByText('Đã xác thực · 1')).toBeInTheDocument();
    // Dynamic count for REJECTED: 0
    expect(screen.getByText('Đã từ chối · 0')).toBeInTheDocument();

    // Active tab has bg-primary
    const activeTab = screen.getByText('Chờ xác minh · 2');
    expect(activeTab.className).toContain('bg-primary');
    expect(activeTab.className).toContain('rounded-xl');

    // Click tab triggers callback
    fireEvent.click(screen.getByText('Đã xác thực · 1'));
    expect(setActiveQueueTab).toHaveBeenCalledWith('APPROVED');
  });

  it('VerificationQueueTable renders real names, types, and tax codes instead of raw UUIDs', () => {
    const handleOpenDetail = vi.fn();
    render(
      <VerificationQueueTable
        loading={false}
        orgsQueue={mockQueue}
        handleOpenDetail={handleOpenDetail}
        activeQueueTab="PENDING"
      />
    );

    // Displays legal names
    expect(screen.getByText('Quỹ Hy Vọng Tương Lai')).toBeInTheDocument();
    expect(screen.getByText('Doanh Nghiệp Xã Hội Xanh')).toBeInTheDocument();

    // Displays organization types instead of 'ORG_VERIFICATION'
    expect(screen.getByText('Quỹ từ thiện')).toBeInTheDocument();
    expect(screen.getByText('Doanh nghiệp xã hội')).toBeInTheDocument();

    // Displays tax code
    expect(screen.getByText('0102030405')).toBeInTheDocument();

    // Action button
    const actionButtons = screen.getAllByRole('button', { name: /Xác minh/i });
    expect(actionButtons).toHaveLength(2);
    expect(actionButtons[0].className).toContain('bg-primary');
    expect(actionButtons[0].className).toContain('rounded-xl');
  });

  it('VerificationQueueTable renders empty state when filtered tab has no items', () => {
    render(
      <VerificationQueueTable
        loading={false}
        orgsQueue={mockQueue}
        handleOpenDetail={vi.fn()}
        activeQueueTab="REJECTED"
      />
    );

    expect(screen.getByText('Chưa có hồ sơ nào trong mục này.')).toBeInTheDocument();
  });

  it('VerificationDocuments formats representative object DTO without crashing', () => {
    const selectedOrg = {
      legalName: 'Tổ Chức Bảo Tồn',
      displayName: 'Bảo Tồn Thiên Nhiên',
      taxCode: '0304050607',
      scope: 'Toàn quốc',
      address: '123 Nguyễn Huệ, Q1, TP.HCM',
      phone: '0901234567',
      email: 'contact@nature.org',
      representative: {
        fullName: 'Nguyễn Văn Đại Diện',
        position: 'Tổng Thư Ký',
        cccdNumber: '079123456789',
      },
      documents: [
        {
          docType: 'QUYET_DINH_THANH_LAP',
          docNumber: '456/QĐ-BNV',
          issueDate: '2022-05-10',
          issuingAuthority: 'Bộ Nội vụ',
          fileUrl: '/api/organizations/1/legal-files/documents/456',
        },
      ],
    };

    render(
      <VerificationDocuments selectedOrg={selectedOrg} setViewingDoc={vi.fn()} />
    );

    expect(screen.getByText('Tổ Chức Bảo Tồn')).toBeInTheDocument();
    expect(screen.getByText('Nguyễn Văn Đại Diện · Tổng Thư Ký')).toBeInTheDocument();
    expect(screen.getByText('QUYET_DINH_THANH_LAP')).toBeInTheDocument();
    expect(screen.getByText('456/QĐ-BNV · 2022-05-10 · Bộ Nội vụ')).toBeInTheDocument();
  });

  it('VerificationDocuments renders CCCD attachments with "Xem ảnh" when URLs are present', () => {
    const setViewingDoc = vi.fn();
    const selectedOrg = {
      legalName: 'Quỹ Trợ Giúp Cộng Đồng',
      representative: {
        fullName: 'Trần Văn A',
        position: 'Chủ tịch',
        cccdNumber: '079123456789',
        cccdFrontUrl: '/api/organizations/org-1/legal-files/cccd-front',
        cccdBackUrl: '/api/organizations/org-1/legal-files/cccd-back',
      },
      documents: [
        {
          docType: 'GIAY_PHEP_THANH_LAP',
          fileUrl: 'https://example.com/license.pdf',
        },
      ],
    };

    render(<VerificationDocuments selectedOrg={selectedOrg} setViewingDoc={setViewingDoc} />);

    expect(screen.getByText('CCCD mặt trước (Người đại diện)')).toBeInTheDocument();
    expect(screen.getByText('CCCD mặt sau (Người đại diện)')).toBeInTheDocument();

    const viewButtons = screen.getAllByRole('button', { name: /Xem ảnh/i });
    expect(viewButtons).toHaveLength(3); // 1 legal doc + 2 CCCD

    fireEvent.click(viewButtons[1]); // Click CCCD mặt trước
    expect(setViewingDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'CCCD mặt trước (Người đại diện)',
        url: '/api/organizations/org-1/legal-files/cccd-front',
      })
    );
  });

  it('VerificationDocuments displays warning badges when representative CCCD is missing', () => {
    const selectedOrg = {
      legalName: 'Mái ấm 123',
      representative: {
        fullName: 'Trần Thị Mỹ Hạnh',
        position: 'Trưởng ban',
      },
      documents: [
        {
          docType: 'DIEU_LE_QUY',
          title: 'Điều lệ quỹ đã được công nhận',
          fileUrl: 'https://example.com/rules.pdf',
        },
      ],
    };

    render(<VerificationDocuments selectedOrg={selectedOrg} setViewingDoc={vi.fn()} />);

    expect(screen.getByText('Thiếu ảnh CCCD')).toBeInTheDocument();
    expect(screen.getByText('Chưa nộp ảnh CCCD mặt trước (bắt buộc)')).toBeInTheDocument();
    expect(screen.getByText('Chưa nộp ảnh CCCD mặt sau (bắt buộc)')).toBeInTheDocument();
    expect(screen.getAllByText('Thiếu tệp')).toHaveLength(2);
  });

  it('VerificationChecklist displays warning when CCCD images are missing', () => {
    const selectedOrg = {
      representative: { fullName: 'Trần Thị Mỹ Hạnh' },
      documents: [{ title: 'Giấy phép' }],
    };

    render(
      <VerificationChecklist
        checklist={{ cccdMatched: false }}
        setChecklist={vi.fn()}
        isEnterprise={false}
        selectedOrg={selectedOrg}
      />
    );

    expect(screen.getByText(/Hồ sơ thiếu ảnh CCCD/i)).toBeInTheDocument();
  });

  it('calls approveOrg with refId instead of queueItemId', async () => {
    vi.spyOn(orgVerificationService, 'getQueue').mockResolvedValue({
      data: [{ id: 'queue-uuid-e607', refId: 'org-uuid-b291', status: 'PENDING' }],
      total: 1,
    });
    vi.spyOn(orgVerificationService, 'getLegalChanges').mockResolvedValue({ data: [] });
    vi.spyOn(orgVerificationService, 'getOrgDetail').mockResolvedValue({
      legalName: 'Tổ Chức Từ Thiện B',
      orgType: 'Tổ chức từ thiện',
      taxCode: 'không có',
      verificationStatus: 'PENDING',
    });
    const approveSpy = vi.spyOn(orgVerificationService, 'approveOrg').mockResolvedValue({ success: true });
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => {});

    expect(result.current.orgsQueue.length).toBe(1);
    expect(result.current.orgsQueue[0].refId).toBe('org-uuid-b291');

    act(() => {
      result.current.handleOpenDetail(result.current.orgsQueue[0]);
    });
    await act(async () => {});

    act(() => {
      result.current.setChecklist({
        taxChecked: true,
        businessChecked: true,
        docsValid: true,
        cccdMatched: true,
        phoneConfirmed: true,
        authorityChecked: true,
        reputationChecked: true,
      });
    });

    await act(async () => {
      await result.current.handleApproveOrg();
    });

    expect(approveSpy).toHaveBeenCalledWith('org-uuid-b291', expect.anything());
    expect(approveSpy).not.toHaveBeenCalledWith('queue-uuid-e607', expect.anything());
  });

  it('handleApproveOrg alerts detailed server message on failure instead of generic error', async () => {
    vi.spyOn(orgVerificationService, 'getQueue').mockResolvedValue({
      data: [{ id: 'queue-uuid-e607', refId: 'org-uuid-b291', status: 'PENDING' }],
      total: 1,
    });
    vi.spyOn(orgVerificationService, 'getLegalChanges').mockResolvedValue({ data: [] });
    vi.spyOn(orgVerificationService, 'getOrgDetail').mockResolvedValue({
      legalName: 'Tổ Chức Thiếu Hồ Sơ',
      taxCode: 'không có',
      verificationStatus: 'PENDING',
    });
    vi.spyOn(orgVerificationService, 'approveOrg').mockRejectedValue(
      new Error('CHECKLIST_INCOMPLETE: chưa hoàn tất checklist xác minh.')
    );
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => {});

    act(() => {
      result.current.handleOpenDetail(result.current.orgsQueue[0]);
    });
    await act(async () => {});

    act(() => {
      result.current.setChecklist({
        taxChecked: true,
        businessChecked: true,
        docsValid: true,
        cccdMatched: true,
        phoneConfirmed: true,
        authorityChecked: true,
        reputationChecked: true,
      });
    });

    await act(async () => {
      await result.current.handleApproveOrg();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('CHECKLIST_INCOMPLETE: chưa hoàn tất checklist xác minh.')
    );
  });

  it('calls rejectOrg with refId instead of queueItemId and sends reason', async () => {
    vi.spyOn(orgVerificationService, 'getQueue').mockResolvedValue({
      data: [{ id: 'queue-uuid-e607', refId: 'org-uuid-b291', status: 'PENDING' }],
      total: 1,
    });
    vi.spyOn(orgVerificationService, 'getLegalChanges').mockResolvedValue({ data: [] });
    vi.spyOn(orgVerificationService, 'getOrgDetail').mockResolvedValue({
      legalName: 'Tổ Chức Từ Thiện B',
      orgType: 'Tổ chức từ thiện',
      taxCode: 'không có',
      verificationStatus: 'PENDING',
    });
    const rejectSpy = vi.spyOn(orgVerificationService, 'rejectOrg').mockResolvedValue({ success: true });
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => {});

    act(() => {
      result.current.handleOpenDetail(result.current.orgsQueue[0]);
      result.current.setRejectReason('Giấy tờ không hợp lệ');
    });

    await act(async () => {
      await result.current.handleConfirmReject();
    });

    expect(rejectSpy).toHaveBeenCalledWith('org-uuid-b291', 'Giấy tờ không hợp lệ');
    expect(rejectSpy).not.toHaveBeenCalledWith('queue-uuid-e607', expect.anything());
  });
});
