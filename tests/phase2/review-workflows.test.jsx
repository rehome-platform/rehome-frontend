import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReturnProcessing } from '../../src/features/moderator/hooks/useReturnProcessing.jsx';
import { useOrgVerification } from '../../src/features/moderator/hooks/useOrgVerification.jsx';
import { VerificationChecklist } from '../../src/features/moderator/components/verification/VerificationSections.jsx';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { orgVerificationService } from '../../src/features/moderator/services/orgVerificationApi.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';

vi.mock('../../src/features/moderator/services/returnApi.js', () => ({
  returnService: {
    list: vi.fn(), approveReturnAndCreateWaybill: vi.fn(), rejectReturn: vi.fn(),
    resolveInvalid: vi.fn(), resolveValid: vi.fn(), inspect: vi.fn().mockResolvedValue({}),
    detail: vi.fn(),
  },
}));

vi.mock('../../src/features/moderator/services/inventoryApi.js', () => ({
  inventoryService: {
    upload: vi.fn().mockResolvedValue({ url: 'https://photos.test/ev.jpg' }),
  },
}));

vi.mock('../../src/features/moderator/services/orgVerificationApi.js', () => ({
  orgVerificationService: {
    getQueue: vi.fn(), getLegalChanges: vi.fn(), approveOrg: vi.fn(), rejectOrg: vi.fn(),
    approveLegalChange: vi.fn(), getOrgDetail: vi.fn(), getExistingOrganizations: vi.fn(),
  },
}));

const request = { id: 'r1', code: 'RET-01', status: 'PENDING_APPROVAL', sku: 'Sku-A', amount: 100000, shippingFee: 20000 };
const org = { id: 'org1', name: 'Quỹ A', type: 'Quỹ xã hội', taxCode: '123', phone: '0900000001' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  returnService.list.mockResolvedValue({ data: [request] });
  returnService.detail.mockImplementation(async (id) => ({ ...request, id }));
  inventoryService.upload.mockResolvedValue({ url: 'https://photos.test/ev.jpg' });
  orgVerificationService.getQueue.mockResolvedValue({ data: [org] });
  orgVerificationService.getLegalChanges.mockResolvedValue({ data: [] });
  orgVerificationService.getOrgDetail.mockImplementation(async (id) => ({ ...org, id }));
  orgVerificationService.getExistingOrganizations.mockResolvedValue({ data: [] });
});

describe('return workflow regression', () => {
  it('approves the selected request and refreshes the queue once after success', async () => {
    const { result } = renderHook(useReturnProcessing, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleOpenReview(request); });
    await act(async () => { await result.current.handleApproveAndCreateWaybill(); });
    expect(returnService.approveReturnAndCreateWaybill).toHaveBeenCalledExactlyOnceWith('r1');
    expect(returnService.list).toHaveBeenCalledTimes(2);
    expect(result.current.viewMode).toBe('QUEUE');
    expect(result.current.selectedItem).toBeNull();
  });

  it('requires a rejection reason, preserves its payload and closes the modal after success', async () => {
    const { result } = renderHook(useReturnProcessing, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.handleOpenReview(request);
      result.current.setIsRejectModalOpen(true);
    });
    await act(async () => { await result.current.handleConfirmRejectRequest(); });
    expect(returnService.rejectReturn).not.toHaveBeenCalled();
    act(() => result.current.setRejectReason('  Sai thông tin  '));
    await act(async () => { await result.current.handleConfirmRejectRequest(); });
    expect(returnService.rejectReturn).toHaveBeenCalledExactlyOnceWith('r1', '  Sai thông tin  ');
    expect(result.current.isRejectModalOpen).toBe(false);
    expect(result.current.rejectReason).toBe('');
  });

  it('requires an invalid-inspection reason and resets inspection when switching items', async () => {
    const { result } = renderHook(useReturnProcessing, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.handleOpenInspect(request);
      await result.current.uploadEvidence([new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]);
      result.current.setChecklist({ labelIntact: true, noNewDamage: true, noUsageSign: true, accessoriesComplete: true });
      result.current.setInspectionVerdict('INVALID');
    });
    await act(async () => { await result.current.handleSaveInspection(); });
    expect(returnService.resolveInvalid).not.toHaveBeenCalled();
    act(() => result.current.setInvalidReason('Hư hỏng mới'));
    await act(async () => { await result.current.handleSaveInspection(); });
    expect(returnService.resolveInvalid).toHaveBeenCalledExactlyOnceWith('r1', 'Hư hỏng mới');
    await act(async () => { await result.current.handleOpenInspect({ ...request, id: 'r2', sku: 'Sku-B' }); });
    expect(result.current.inspectionVerdict).toBe('');
    expect(result.current.invalidReason).toBe('');
    expect(result.current.checklist.noNewDamage).toBe(false);
  });

  it.each(['RELIST', 'RETURN_SELLER'])('waits for the %s decision before resolving a valid return', async outcome => {
    const { result } = renderHook(useReturnProcessing, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.handleOpenInspect(request);
      await result.current.uploadEvidence([new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]);
      result.current.setChecklist({ labelIntact: true, noNewDamage: true, noUsageSign: true, accessoriesComplete: true });
      result.current.setInspectionVerdict('VALID');
    });
    await act(async () => { await result.current.handleSaveInspection(); });
    expect(result.current.isOutcomeModalOpen).toBe(true);
    expect(returnService.resolveValid).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleConfirmOutcome(outcome); });
    expect(returnService.resolveValid).toHaveBeenCalledExactlyOnceWith('r1', outcome);
    expect(result.current.isOutcomeModalOpen).toBe(false);
  });

  it('retains the review and selected request when the service rejects', async () => {
    returnService.approveReturnAndCreateWaybill.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(useReturnProcessing, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleOpenReview(request); });
    await act(async () => { await result.current.handleApproveAndCreateWaybill(); });
    expect(result.current.viewMode).toBe('REVIEW');
    expect(result.current.selectedItem.id).toBe('r1');
    expect(returnService.list).toHaveBeenCalledTimes(1);
  });
});

describe('organization verification regression', () => {
  it('blocks approval until required checks pass and resets checks for the next organization', async () => {
    const { result } = renderHook(useOrgVerification);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleOpenDetail(org); });
    await act(async () => { await result.current.handleApproveOrg(); });
    expect(orgVerificationService.approveOrg).not.toHaveBeenCalled();
    act(() => result.current.setChecklist({ taxChecked: true, docsValid: true, cccdMatched: true, phoneConfirmed: true, reputationChecked: true }));
    expect(result.current.isChecklistComplete).toBe(true);
    await act(async () => { await result.current.handleApproveOrg(); });
    expect(orgVerificationService.approveOrg).toHaveBeenCalledWith('org1', expect.any(String));
    await act(async () => { await result.current.handleOpenDetail({ ...org, id: 'org2', type: 'Doanh nghiệp xã hội' }); });
    expect(result.current.isChecklistComplete).toBe(false);
    expect(result.current.checklist.docsValid).toBe(false);
    expect(result.current.checklist.businessChecked).toBe(false);
  });

  it('requires the enterprise check while leaving optional authority verification optional', async () => {
    const { result } = renderHook(useOrgVerification);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleOpenDetail({ ...org, type: 'Doanh nghiệp xã hội' }); });
    act(() => result.current.setChecklist({ taxChecked: true, docsValid: true, cccdMatched: true, phoneConfirmed: true, reputationChecked: true }));
    expect(result.current.mandatoryItemsLeft).toBe(1);
    act(() => result.current.setChecklist({ ...result.current.checklist, businessChecked: true }));
    expect(result.current.isChecklistComplete).toBe(true);
  });

  it('requires a reason for rejection and refreshes legal changes after approval', async () => {
    const { result } = renderHook(useOrgVerification);
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.handleOpenDetail(org); });
    await act(async () => { await result.current.handleConfirmReject(); });
    expect(orgVerificationService.rejectOrg).not.toHaveBeenCalled();
    act(() => result.current.setRejectReason('Thiếu giấy phép'));
    await act(async () => { await result.current.handleConfirmReject(); });
    expect(orgVerificationService.rejectOrg).toHaveBeenCalledExactlyOnceWith('org1', 'Thiếu giấy phép');
    await act(async () => { await result.current.handleApproveLegalChange('change1'); });
    expect(orgVerificationService.approveLegalChange).toHaveBeenCalledExactlyOnceWith('change1');
    expect(orgVerificationService.getLegalChanges).toHaveBeenCalledTimes(3);
  });

  it('keeps checklist inputs connected to the controller state', () => {
    function Checklist() {
      const [checklist, setChecklist] = React.useState({
        taxChecked: false, businessChecked: false, docsValid: false, cccdMatched: false,
        phoneConfirmed: false, authorityChecked: false, reputationChecked: false,
      });
      return <VerificationChecklist checklist={checklist} setChecklist={setChecklist} isEnterprise selectedOrg={{}} />;
    }
    render(<Checklist />);
    const input = screen.getAllByRole('checkbox')[0];
    fireEvent.click(input);
    expect(input).toBeChecked();
    fireEvent.click(input);
    expect(input).not.toBeChecked();
  });
});
