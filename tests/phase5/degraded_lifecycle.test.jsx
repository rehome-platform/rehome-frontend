import React from 'react';
import { act, render, renderHook, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { useReturnProcessing } from '../../src/features/moderator/hooks/useReturnProcessing.jsx';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { DegradedCaseModal } from '../../src/features/moderator/components/returns/ReturnSections.jsx';
import { CounterHandoverTask } from '../../src/features/moderator/components/counter/CounterHandoverTask.jsx';

const item = { id: 'return-1', productId: 'product-1', sku: 'display-sku', status: 'RECEIVED_INSPECT', compensationAmount: 0, halfCompensationAmount: 0 };
const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
beforeEach(() => {
  vi.spyOn(returnService, 'list').mockResolvedValue({ data: [item] });
  vi.spyOn(returnService, 'detail').mockResolvedValue(item);
  vi.spyOn(returnService, 'inspect').mockResolvedValue({});
  vi.spyOn(returnService, 'resolveValid').mockResolvedValue({ status: 'VALID', resolvedAt: '2026-11-11T10:00:00Z' });
  vi.spyOn(returnService, 'createDegradedCase').mockResolvedValue({ id: 'case-1' });
  vi.spyOn(inventoryService, 'upload').mockImplementation(async file => ({ url: `https://photos.test/${file.name}` }));
});

async function openInspection() {
  const hook = renderHook(() => useReturnProcessing(), { wrapper });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  await act(async () => { await hook.result.current.handleOpenInspect(item); });
  return hook;
}

it('blocks degraded inspection with missing evidence or notes', async () => {
  const { result } = await openInspection();
  await act(async () => { await result.current.handleCreateDegradedCase({ notes: 'Damage', photos: ['https://photos.test/a'] }); });
  expect(returnService.inspect).not.toHaveBeenCalled();
  expect(returnService.resolveValid).not.toHaveBeenCalled();
});

it('resolves a degraded return once and lets the backend create its case', async () => {
  const { result } = await openInspection();
  await act(async () => { await result.current.uploadEvidence([new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]); });
  await act(async () => { await result.current.handleCreateDegradedCase({ notes: '  Actual damage  ' }); });
  expect(returnService.inspect).toHaveBeenCalledWith(item.id, expect.objectContaining({
    degraded: true, conditionNote: 'Actual damage', evidenceImageUrls: ['https://photos.test/a.jpg', 'https://photos.test/b.jpg'],
  }));
  expect(returnService.resolveValid).toHaveBeenCalledWith(item.id, undefined, expect.objectContaining({ resolutionNote: expect.any(String) }));
  expect(returnService.createDegradedCase).not.toHaveBeenCalled();
  expect(result.current.selectedItem.productId).toBe('product-1');
  expect(result.current.viewMode).toBe('DEGRADED_CASE');
  await act(async () => { await result.current.handleCreateDegradedCase({ notes: 'Retry' }); });
  expect(returnService.resolveValid).toHaveBeenCalledTimes(1);
});

it('blocks modal submission during upload and removes unsupported compensation editing', () => {
  const props = { isOpen: true, onClose() {}, selectedItem: item, degradedNotes: 'Damage', setDegradedNotes() {}, handleCreateDegradedCase: vi.fn(), evidenceImageUrls: ['https://photos.test/a', 'https://photos.test/b'] };
  const { rerender } = render(<DegradedCaseModal {...props} evidenceUploading />);
  expect(screen.getByRole('button', { name: /Lập hồ sơ/ })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /Sửa mức đền/ })).not.toBeInTheDocument();
  rerender(<DegradedCaseModal {...props} />);
  expect(screen.getByRole('button', { name: /Lập hồ sơ/ })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /Lập hồ sơ/ }));
  expect(props.handleCreateDegradedCase).toHaveBeenCalledWith(expect.objectContaining({ notes: 'Damage', photos: props.evidenceImageUrls }));
  expect(screen.getByText(/Hạn chọn 30 ngày/)).toBeInTheDocument();
});

it('does not invent a pickup deadline or substitute a full payout for paid zero at the counter', () => {
  render(<CounterHandoverTask context="DEGRADED_ITEM_PICKUP" item={{ id: 'case-1', productId: 'product-1', paidAmount: 0, compensationAmount: 100000 }} setConfirmHandover={() => {}} />);
  expect(screen.queryByText(/30 ngày/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Thời hạn đến nhận/)).not.toBeInTheDocument();
  expect(screen.getByText(/0.*₫/)).toBeInTheDocument();
});
