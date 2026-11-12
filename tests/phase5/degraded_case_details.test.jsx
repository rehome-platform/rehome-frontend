import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import DegradedCaseDetails from '../../src/features/moderator/components/DegradedCaseDetails.jsx';
import { latestDegradedCase, degradedCaseLabel } from '../../src/features/moderator/models/degradedCaseModel.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { id: 'mod-1', warehouseId: 'wh-1' }, isAuthenticated: true }) }));
const pending = { id: 'case-1', productId: 'product-1', productName: 'Actual product', photos: ['https://photos.test/a'], moderatorNote: 'Actual note', compensationAmount: 0, degradedCompensationRate: 0.4, receivedAt: '2026-11-11T10:00:00Z', decisionDeadline: '2026-12-11T10:00:00Z', status: 'PENDING_DECISION', decision: null, paidAmount: null };
const wrapper = ({ children }) => <Phase2Provider>{children}</Phase2Provider>;
beforeEach(() => {
  vi.spyOn(returnService, 'getDegradedCase').mockResolvedValue(pending);
  vi.spyOn(inventoryService, 'degradedCases').mockResolvedValue([pending]);
});

it('looks up by product identity and resolution time, never by case id or SKU', () => {
  const cases = [pending, { ...pending, id: 'old', receivedAt: '2026-10-01T00:00:00Z' }, { ...pending, id: 'other', productId: 'product-2' }];
  expect(latestDegradedCase(cases, 'product-1', '2026-11-11T10:00:00Z').id).toBe('case-1');
  expect(latestDegradedCase(cases, 'product-1', '2026-11-12T10:00:00Z')).toBeNull();
  expect(latestDegradedCase(cases, 'case-1')).toBeNull();
  expect(degradedCaseLabel({ status: 'DECIDED', decision: null })).not.toMatch(/100%/);
});

it('reads authorized case detail and displays evidence, deadline and zero snapshot', async () => {
  render(<DegradedCaseDetails caseId="case-1" />, { wrapper });
  await screen.findByText('Actual note');
  expect(returnService.getDegradedCase).toHaveBeenCalledWith('case-1', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(screen.getByRole('img').getAttribute('src')).toBe('https://photos.test/a');
  expect(screen.getByText(/Nhắc mỗi 7 ngày/)).toBeInTheDocument();
  expect(screen.getByText(/11\/12\/2026/)).toBeInTheDocument();
  expect(screen.getAllByText(/0.*₫/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/đã chọn/i)).not.toBeInTheDocument();
});

it.each([403, 404, 409])('shows detail error %s and retries only the read', async status => {
  returnService.getDegradedCase.mockRejectedValueOnce(Object.assign(new Error(`Read error ${status}`), { status }));
  render(<DegradedCaseDetails caseId="case-1" />, { wrapper });
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: /Tải lại/ }));
  await screen.findByText('Actual note');
  expect(returnService.getDegradedCase).toHaveBeenCalledTimes(2);
});

it('does not confuse automatic unclaimed with a compensated member decision', async () => {
  returnService.getDegradedCase.mockResolvedValue({ ...pending, status: 'DECIDED', decision: 'UNCLAIMED', autoDecided: true, decidedAt: '2026-12-12T10:00:00Z' });
  render(<DegradedCaseDetails caseId="case-1" />, { wrapper });
  await screen.findByText('Vô thừa nhận');
  expect(screen.getByText(/không phát sinh bồi thường/i)).toBeInTheDocument();
  expect(screen.queryByText(/Member đã chọn/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Quầy/ })).not.toBeInTheDocument();
});

it('uses actual partial rate and paid zero, without inventing a pickup deadline', async () => {
  returnService.getDegradedCase.mockResolvedValue({ ...pending, compensationAmount: 100000, decision: 'PARTIAL_WITH_ITEM_BACK', paidAmount: 0, status: 'DECIDED', pickupDeadline: null, pickedUpAt: null });
  render(<DegradedCaseDetails caseId="case-1" onNavigateToCounter={() => {}} />, { wrapper });
  await screen.findByText('Actual note');
  expect(screen.getByText(/40%/)).toBeInTheDocument();
  expect(screen.getByText(/Đã cộng vào ví: 0/)).toBeInTheDocument();
  expect(screen.queryByText(/Hạn nhận hàng/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Quầy/ })).toBeInTheDocument();
});

it('shows pickedUpAt status and hides counter navigation button when item has been picked up', async () => {
  returnService.getDegradedCase.mockResolvedValue({
    ...pending,
    compensationAmount: 100000,
    decision: 'PARTIAL_WITH_ITEM_BACK',
    paidAmount: 40000,
    status: 'DECIDED',
    pickedUpAt: '2026-11-12T11:30:00Z',
  });
  render(<DegradedCaseDetails caseId="case-1" onNavigateToCounter={() => {}} />, { wrapper });
  await screen.findByText(/Đã bàn giao tại quầy lúc/);
  expect(screen.getByText(/12\/11\/2026/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Quầy/ })).not.toBeInTheDocument();
});

it('retries a missing case after return resolution without performing any mutation', async () => {
  inventoryService.degradedCases.mockResolvedValueOnce([]);
  render(<DegradedCaseDetails productId="product-1" resolvedAt="2026-11-11T10:00:00Z" />, { wrapper });
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: /Tải lại/ }));
  await screen.findByText('Actual note');
  expect(inventoryService.degradedCases).toHaveBeenCalledTimes(2);
  expect(returnService.getDegradedCase).toHaveBeenCalledTimes(1);
});
