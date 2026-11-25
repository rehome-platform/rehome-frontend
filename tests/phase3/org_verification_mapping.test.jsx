import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act, within } from '@testing-library/react';
import {
  VerificationQueueTabs,
  VerificationQueueTable,
  VerificationDocuments,
  VerificationChecklist,
  VerificationLegalChanges,
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

    // Tax code is hidden from queue table row (FE-09) and shown inside Chi tiết modal
    expect(screen.queryByText('0102030405')).not.toBeInTheDocument();
    const firstRow = screen.getByText('Quỹ Hy Vọng Tương Lai').closest('tr');
    fireEvent.click(within(firstRow).getByRole('button', { name: 'Xem chi tiết' }));
    expect(within(screen.getByRole('dialog')).getByText('0102030405')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Đóng' })[0]);

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
    expect(screen.queryByText('456/QĐ-BNV · 2022-05-10 · Bộ Nội vụ')).not.toBeInTheDocument();
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
    expect(screen.getByText('CCCD mặt trước (Người đại diện)')).toBeInTheDocument();
    expect(screen.getByText('CCCD mặt sau (Người đại diện)')).toBeInTheDocument();
    expect(screen.queryByText('Chưa nộp ảnh CCCD mặt trước (bắt buộc)')).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa nộp ảnh CCCD mặt sau (bắt buộc)')).not.toBeInTheDocument();
    expect(screen.getAllByText('Thiếu tệp')).toHaveLength(2);
  });

  it('VerificationChecklist renders checklist steps cleanly without redundant CCCD warning banner', () => {
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

    expect(
      screen.getByText(/Đối chiếu tên trên CCCD với tên người đại diện ghi trên giấy phép/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Hồ sơ thiếu ảnh CCCD/i)).not.toBeInTheDocument();
  });

  it('VerificationChecklist disables non-applicable tax/enterprise steps while keeping optional authority check interactive', () => {
    const emptyChecklist = {
      taxChecked: false,
      businessChecked: false,
      docsValid: false,
      cccdMatched: false,
      phoneConfirmed: false,
      authorityChecked: false,
      reputationChecked: false,
    };

    const { rerender } = render(
      <VerificationChecklist
        checklist={emptyChecklist}
        setChecklist={vi.fn()}
        isEnterprise={false}
        selectedOrg={{ taxCode: 'không có' }}
      />
    );

    const noTaxCheckboxes = screen.getAllByRole('checkbox');
    expect(noTaxCheckboxes).toHaveLength(7);
    expect(noTaxCheckboxes[0]).toBeDisabled();
    expect(noTaxCheckboxes[1]).toBeDisabled();
    expect(noTaxCheckboxes[5]).not.toBeDisabled();
    expect(screen.getAllByText('không bắt buộc')).toHaveLength(3);
    expect(screen.getByText('Tổ chức không có mã số thuế — hồ sơ này không bắt buộc')).toBeInTheDocument();

    rerender(
      <VerificationChecklist
        checklist={emptyChecklist}
        setChecklist={vi.fn()}
        isEnterprise={false}
        selectedOrg={{ taxCode: '0102030405' }}
      />
    );

    const withTaxCheckboxes = screen.getAllByRole('checkbox');
    expect(withTaxCheckboxes[0]).not.toBeDisabled();
    expect(withTaxCheckboxes[1]).toBeDisabled();
    expect(screen.getAllByText('không bắt buộc')).toHaveLength(2);
    expect(screen.getByText('tracuunnt.gdt.gov.vn · bắt buộc vì tổ chức có MST')).toBeInTheDocument();
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
    vi.spyOn(window, 'alert').mockImplementation(() => { });

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => { });

    expect(result.current.orgsQueue.length).toBe(1);
    expect(result.current.orgsQueue[0].refId).toBe('org-uuid-b291');

    act(() => {
      result.current.handleOpenDetail(result.current.orgsQueue[0]);
    });
    await act(async () => { });

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
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => { });

    act(() => {
      result.current.handleOpenDetail(result.current.orgsQueue[0]);
    });
    await act(async () => { });

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
    vi.spyOn(window, 'alert').mockImplementation(() => { });

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => { });

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
  it('useOrgVerification enriches legalChanges from queue items and defaults status to PENDING', async () => {
    vi.spyOn(orgVerificationService, 'getQueue').mockResolvedValue({ data: [], total: 0 });
    vi.spyOn(orgVerificationService, 'getLegalChanges').mockResolvedValue({
      data: [
        {
          id: 'q-item-88',
          type: 'LEGAL_CHANGE',
          refId: 'req-uuid-99',
          requestId: 'req-uuid-99',
          orgName: 'Mái ấm Ánh Sáng',
          fieldChanged: 'Người đại diện',
          oldValue: 'Trần Văn A',
          newValue: 'Nguyễn Ngọc Kim Ngân · Trưởng phòng',
          createdAt: '2026-11-04T08:00:00Z',
          status: 'PENDING',
        },
      ],
      total: 1,
    });

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => { });

    expect(result.current.legalChanges).toHaveLength(1);
    const item = result.current.legalChanges[0];
    expect(item.id).toBe('req-uuid-99');
    expect(item.refId).toBe('req-uuid-99');
    expect(item.queueItemId).toBe('q-item-88');
    expect(item.orgName).toBe('Mái ấm Ánh Sáng');
    expect(item.fieldChanged).toBe('Người đại diện');
    expect(item.oldValue).toBe('Trần Văn A');
    expect(item.newValue).toBe('Nguyễn Ngọc Kim Ngân · Trưởng phòng');
    expect(item.status).toBe('PENDING');
    expect(item.submittedAt).not.toBe('—');
  });

  it('VerificationLegalChanges displays table with correct columns and action buttons for PENDING', () => {
    const handleApprove = vi.fn();
    const handleReject = vi.fn();

    const mockChanges = [
      {
        id: 'req-uuid-1',
        queueItemId: 'q-1',
        orgName: 'Mái ấm 123',
        fieldChanged: 'Người đại diện',
        oldValue: 'Trần Thị Mỹ Hạnh · Trưởng ban',
        newValue: 'Nguyễn Ngọc Kim Ngân · Trưởng phòng',
        submittedAt: '04/11/2026',
        status: 'PENDING',
      },
    ];

    render(
      <VerificationLegalChanges
        legalChanges={mockChanges}
        handleApproveLegalChange={handleApprove}
        handleRejectLegalChange={handleReject}
      />
    );

    expect(screen.getByText('Mái ấm 123')).toBeInTheDocument();
    expect(screen.getByText('Người đại diện')).toBeInTheDocument();
    expect(screen.getByText('Trần Thị Mỹ Hạnh · Trưởng ban')).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Ngọc Kim Ngân · Trưởng phòng/)).toBeInTheDocument();
    expect(screen.getByText('Chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText('Duyệt đổi pháp lý')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();

    // Thông tin chi tiết (như ngày gửi, MST...) hiển thị khi mở modal chi tiết theo yêu cầu mới
    fireEvent.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    expect(screen.getByText(/04\/11\/2026/)).toBeInTheDocument();
  });

  it('VerificationLegalChanges buttons open custom modals (no window.prompt/confirm) and invoke approve and reject with requestId', async () => {
    const handleApprove = vi.fn().mockResolvedValue(undefined);
    const handleReject = vi.fn().mockResolvedValue(undefined);

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Lý do kiểm thử');

    const mockChanges = [
      {
        id: 'req-uuid-abc',
        refId: 'req-uuid-abc',
        queueItemId: 'q-999',
        orgName: 'Quỹ Nụ Cười',
        fieldChanged: 'Tên tổ chức',
        oldValue: 'Quỹ Cũ',
        newValue: 'Quỹ Nụ Cười',
        submittedAt: '04/11/2026',
        status: 'PENDING',
      },
    ];

    render(
      <VerificationLegalChanges
        legalChanges={mockChanges}
        handleApproveLegalChange={handleApprove}
        handleRejectLegalChange={handleReject}
      />
    );

    // Approve via custom confirmation modal (no window.confirm)
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt đổi pháp lý' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Xác nhận duyệt yêu cầu đổi pháp lý/i)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận duyệt' }));
    });
    expect(handleApprove).toHaveBeenCalledWith('req-uuid-abc');

    // Reject via custom popup modal (no window.prompt)
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    expect(promptSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/Từ chối yêu cầu đổi pháp lý/i)).toBeInTheDocument();
    const reasonInput = screen.getByPlaceholderText(/Nhập lý do từ chối/i);
    fireEvent.change(reasonInput, { target: { value: 'Lý do kiểm thử' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }));
    });
    expect(handleReject).toHaveBeenCalledWith('req-uuid-abc', 'Lý do kiểm thử');
  });

  it('handleConfirmReject updates status to REJECTED and stays on LIST view even when opened via ?id= deep link', async () => {
    window.history.pushState({}, '', '/moderator/verifications?id=org-uuid-b291');
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
    vi.spyOn(orgVerificationService, 'rejectOrg').mockResolvedValue({ verificationStatus: 'REJECTED' });
    vi.spyOn(window, 'alert').mockImplementation(() => { });

    const { result } = renderHook(() => useOrgVerification());
    await act(async () => { });

    expect(result.current.viewMode).toBe('DETAIL');

    act(() => {
      result.current.setRejectReason('Thiếu giấy phép công chứng');
    });

    await act(async () => {
      await result.current.handleConfirmReject();
    });

    expect(result.current.viewMode).toBe('LIST');
    expect(result.current.selectedOrg).toBeNull();
    expect(result.current.orgsQueue[0].status).toBe('REJECTED');

    window.history.pushState({}, '', '/moderator/verifications');
  });

  it('VerificationLegalChanges renders correct badges for REJECTED and APPROVED statuses', () => {
    const mockChanges = [
      {
        id: 'req-1',
        orgName: 'Tổ chức A',
        status: 'REJECTED',
      },
      {
        id: 'req-2',
        orgName: 'Tổ chức B',
        status: 'APPROVED',
      },
    ];

    render(<VerificationLegalChanges legalChanges={mockChanges} />);

    expect(screen.getByText('Bị từ chối')).toBeInTheDocument();
    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    expect(screen.queryByText('Duyệt đổi pháp lý')).not.toBeInTheDocument();
  });
});
