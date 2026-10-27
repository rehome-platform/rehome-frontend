import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReturnProcessing } from '../../src/features/moderator/hooks/useReturnProcessing.jsx';
import { useOrgVerification } from '../../src/features/moderator/hooks/useOrgVerification.jsx';
import { VerificationChecklist } from '../../src/features/moderator/components/verification/VerificationSections.jsx';
import { returnService, orgVerificationService } from '../../src/features/moderator/services/moderatorMockData.js';

vi.mock('../../src/features/moderator/services/moderatorMockData.js', () => ({
  returnService: {
    list: vi.fn(), approveReturnAndCreateWaybill: vi.fn(), rejectReturn: vi.fn(),
    resolveInvalid: vi.fn(), resolveValid: vi.fn(),
  },
  orgVerificationService: {
    getQueue: vi.fn(), getLegalChanges: vi.fn(), approveOrg: vi.fn(), rejectOrg: vi.fn(),
    approveLegalChange: vi.fn(),
  },
}));

const request = { id: 'r1', code: 'RET-01', status: 'PENDING_APPROVAL', sku: 'Sku-A', amount: 100000, shippingFee: 20000 };
const org = { id: 'org1', name: 'Quỹ A', type: 'Quỹ xã hội', taxCode: '123', phone: '0900000001' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  returnService.list.mockResolvedValue({ data: [request] });
  orgVerificationService.getQueue.mockResolvedValue({ data: [org] });
  orgVerificationService.getLegalChanges.mockResolvedValue({ data: [] });
});

describe('return workflow regression', () => {
  it('approves the selected request and refreshes the queue once after success', async () => {
    const { result } = renderHook(useReturnProcessing);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleOpenReview(request));
    await act(() => result.current.handleApproveAndCreateWaybill());
    expect(returnService.approveReturnAndCreateWaybill).toHaveBeenCalledExactlyOnceWith('r1');
    expect(returnService.list).toHaveBeenCalledTimes(2);
    expect(result.current.viewMode).toBe('QUEUE');
    expect(result.current.selectedItem).toBeNull();
  });

  it('requires a rejection reason, preserves its payload and closes the modal after success', async () => {
    const { result } = renderHook(useReturnProcessing);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.handleOpenReview(request); result.current.setIsRejectModalOpen(true); });
    await act(() => result.current.handleConfirmRejectRequest());
    expect(returnService.rejectReturn).not.toHaveBeenCalled();
    act(() => result.current.setRejectReason('  Sai thông tin  '));
    await act(() => result.current.handleConfirmRejectRequest());
    expect(returnService.rejectReturn).toHaveBeenCalledExactlyOnceWith('r1', '  Sai thông tin  ');
    expect(result.current.isRejectModalOpen).toBe(false);
    expect(result.current.rejectReason).toBe('');
  });

  it('requires an invalid-inspection reason and resets inspection when switching items', async () => {
    const { result } = renderHook(useReturnProcessing);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.handleOpenInspect(request); result.current.setInspectionVerdict('INVALID'); });
    await act(() => result.current.handleSaveInspection());
    expect(returnService.resolveInvalid).not.toHaveBeenCalled();
    act(() => result.current.setInvalidReason('Hư hỏng mới'));
    await act(() => result.current.handleSaveInspection());
    expect(returnService.resolveInvalid).toHaveBeenCalledExactlyOnceWith('r1', 'Hư hỏng mới');
    act(() => result.current.handleOpenInspect({ ...request, id: 'r2', sku: 'Sku-B' }));
    expect(result.current.scannedSku).toBe('Sku-B');
    expect(result.current.inspectionVerdict).toBe('');
    expect(result.current.invalidReason).toBe('');
    expect(result.current.checklist.noNewDamage).toBe(false);
  });

  it.each(['RELIST', 'RETURN_SELLER'])('waits for the %s decision before resolving a valid return', async outcome => {
    const { result } = renderHook(useReturnProcessing);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { result.current.handleOpenInspect(request); result.current.setInspectionVerdict('VALID'); });
    await act(() => result.current.handleSaveInspection());
    expect(result.current.isOutcomeModalOpen).toBe(true);
    expect(returnService.resolveValid).not.toHaveBeenCalled();
    await act(() => result.current.handleConfirmOutcome(outcome));
    expect(returnService.resolveValid).toHaveBeenCalledExactlyOnceWith('r1', outcome);
    expect(result.current.isOutcomeModalOpen).toBe(false);
  });

  it('retains the review and selected request when the service rejects', async () => {
    returnService.approveReturnAndCreateWaybill.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(useReturnProcessing);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleOpenReview(request));
    await act(() => result.current.handleApproveAndCreateWaybill());
    expect(result.current.viewMode).toBe('REVIEW');
    expect(result.current.selectedItem.id).toBe('r1');
    expect(returnService.list).toHaveBeenCalledTimes(1);
  });
});

describe('organization verification regression', () => {
  it('blocks approval until required checks pass and resets checks for the next organization', async () => {
    const { result } = renderHook(useOrgVerification);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleOpenDetail(org));
    await act(() => result.current.handleApproveOrg());
    expect(orgVerificationService.approveOrg).not.toHaveBeenCalled();
    act(() => result.current.setChecklist({ taxChecked: true, docsValid: true, cccdMatched: true, phoneConfirmed: true, reputationChecked: true }));
    expect(result.current.isChecklistComplete).toBe(true);
    await act(() => result.current.handleApproveOrg());
    expect(orgVerificationService.approveOrg).toHaveBeenCalledWith('org1', expect.any(String));
    act(() => result.current.handleOpenDetail({ ...org, id: 'org2', type: 'Doanh nghiệp xã hội' }));
    expect(result.current.isChecklistComplete).toBe(false);
    expect(result.current.checklist.docsValid).toBe(false);
    expect(result.current.checklist.businessChecked).toBe(false);
  });

  it('requires the enterprise check while leaving optional authority verification optional', async () => {
    const { result } = renderHook(useOrgVerification);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleOpenDetail({ ...org, type: 'Doanh nghiệp xã hội' }));
    act(() => result.current.setChecklist({ taxChecked: true, docsValid: true, cccdMatched: true, phoneConfirmed: true, reputationChecked: true }));
    expect(result.current.mandatoryItemsLeft).toBe(1);
    act(() => result.current.setChecklist({ ...result.current.checklist, businessChecked: true }));
    expect(result.current.isChecklistComplete).toBe(true);
  });

  it('requires a reason for rejection and refreshes legal changes after approval', async () => {
    const { result } = renderHook(useOrgVerification);
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.handleOpenDetail(org));
    await act(() => result.current.handleConfirmReject());
    expect(orgVerificationService.rejectOrg).not.toHaveBeenCalled();
    act(() => result.current.setRejectReason('Thiếu giấy phép'));
    await act(() => result.current.handleConfirmReject());
    expect(orgVerificationService.rejectOrg).toHaveBeenCalledExactlyOnceWith('org1', 'Thiếu giấy phép');
    await act(() => result.current.handleApproveLegalChange('change1'));
    expect(orgVerificationService.approveLegalChange).toHaveBeenCalledExactlyOnceWith('change1');
    expect(orgVerificationService.getLegalChanges).toHaveBeenCalledTimes(3);
  });

  it('keeps checklist inputs connected to the controller state', () => {
    function Checklist() {
      const [checklist, setChecklist] = React.useState({
        taxChecked: false, businessChecked: false, docsValid: false, cccdMatched: false,
        phoneConfirmed: false, authorityChecked: false, reputationChecked: false,
      });
      return <VerificationChecklist checklist={checklist} setChecklist={setChecklist} isEnterprise />;
    }
    render(<Checklist />);
    const input = screen.getAllByRole('checkbox')[0];
    fireEvent.click(input);
    expect(input).toBeChecked();
    fireEvent.click(input);
    expect(input).not.toBeChecked();
  });
});
