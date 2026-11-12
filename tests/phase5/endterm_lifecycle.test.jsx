import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Phase2Provider, useResource } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import ReConsignNegotiationPage from '../../src/features/moderator/pages/ReConsignNegotiationPage.jsx';
import InventoryDetailPage from '../../src/features/moderator/pages/InventoryDetailPage.jsx';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { endTermService } from '../../src/features/moderator/services/endTermApi.js';
import { returnService } from '../../src/features/moderator/services/returnApi.js';
import { inventoryDetail } from '../../src/features/moderator/models/inventoryApiModel.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { id: 'mod-1', warehouseId: 'wh-1' }, isAuthenticated: true }) }));
const item = { id: 'SKU-A', name: 'Áo ký gửi', status: 'WAREHOUSE', currentTerm: 3, currentPrice: 200000, photos: [] };
const pricing = { decisionId: 'decision-uuid', productId: 'SKU-A', productName: item.name, currentPrice: 200000, previousAgreedPrice: 400000 };
beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(inventoryService, 'read').mockResolvedValue(item);
  vi.spyOn(inventoryService, 'degradedCases').mockResolvedValue([]);
  vi.spyOn(endTermService, 'pendingPricing').mockResolvedValue([pricing]);
  vi.spyOn(endTermService, 'proposeReConsignPrice').mockResolvedValue({ decisionId: 'decision-uuid', newReceiptId: 'receipt-uuid' });
  vi.spyOn(endTermService, 'confirmReConsignReceipt');
});
afterEach(() => vi.useRealTimers());
function page(Component = ReConsignNegotiationPage) {
  return render(<MemoryRouter initialEntries={['/moderator/inventory/SKU-A']}><Phase2Provider><Routes><Route path="/moderator/inventory/:sku" element={<Component />} /></Routes></Phase2Provider></MemoryRouter>);
}
it('uses the pricing decision UUID and leaves confirmation to the Member', async () => {
  page();
  const send = await screen.findByRole('button', { name: /Gửi đề xuất giá mới/ });
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Giá bán đề xuất/), { target: { value: '350000' } });
  fireEvent.click(send);
  await waitFor(() => expect(endTermService.proposeReConsignPrice).toHaveBeenCalledWith('decision-uuid', expect.objectContaining({ agreedPrice: 350000 }), expect.anything()));
  expect(screen.queryByRole('button', { name: /Mở duyệt giá/ })).not.toBeInTheDocument();
  expect(endTermService.confirmReConsignReceipt).not.toHaveBeenCalled();
});
it('does not submit a product ID when pricing is not eligible even with a decisionId', async () => {
  inventoryService.read.mockResolvedValue({ ...item, decisionId: 'not-yet-decided' });
  endTermService.pendingPricing.mockResolvedValue([]);
  page();
  const send = await screen.findByRole('button', { name: /Gửi đề xuất giá mới/ });
  await waitFor(() => expect(send).toBeDisabled());
  expect(endTermService.proposeReConsignPrice).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /Tải lại/ })).toBeInTheDocument();
});
it('shows backend price and term after Member confirmation arrives on refresh', async () => {
  page();
  const send = await screen.findByRole('button', { name: /Gửi đề xuất giá mới/ });
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Giá bán đề xuất/), { target: { value: '350000' } });
  fireEvent.click(send);
  await waitFor(() => expect(endTermService.proposeReConsignPrice).toHaveBeenCalled());
  inventoryService.read.mockResolvedValue({ ...item, status: 'ON_SALE', currentTerm: 1, currentPrice: 345000, daysIntoTerm: 1, decisionId: null });
  endTermService.pendingPricing.mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: /Tải lại/ }));
  await screen.findByText(/MEMBER ĐÃ XÁC NHẬN/);
  expect(screen.getAllByText(/345[.,]000/).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /Gửi đề xuất giá mới/ })).not.toBeInTheDocument();
});
it('opens the linked degraded case instead of a historical case for the product', async () => {
  inventoryService.read.mockResolvedValue({ ...item, degradedCaseId: 'active-case' });
  vi.spyOn(returnService, 'getDegradedCase').mockResolvedValue({ id: 'active-case', productId: item.id, decision: null, status: 'PENDING_DECISION' });
  page(InventoryDetailPage);
  await waitFor(() => expect(returnService.getDegradedCase).toHaveBeenCalledWith('active-case', expect.anything()));
  expect(inventoryService.degradedCases).not.toHaveBeenCalled();
});
it('clears obsolete end-of-term actions when the backend says ON_SALE or UNCLAIMED', () => {
  expect(inventoryDetail({ ...item, status: 'ON_SALE', decision: 'RE_CONSIGN', allowedActions: ['RE_CONSIGN', 'TRANSFER', 'HANDOVER'] }, item.id).allowedActions).not.toContain('RE_CONSIGN');
  expect(inventoryDetail({ ...item, status: 'UNCLAIMED', decision: 'TAKE_BACK', allowedActions: ['HANDOVER'] }, item.id).allowedActions).toEqual(expect.arrayContaining(['TRANSFER']));
  expect(inventoryDetail({ ...item, status: 'UNCLAIMED', allowedActions: ['HANDOVER'] }, item.id).allowedActions).not.toContain('HANDOVER');
});

it('keeps the entered price and note through background refresh and a temporary network failure', async () => {
  vi.useFakeTimers();
  page();
  await act(async () => {});
  expect(screen.getByRole('button', { name: /Gửi đề xuất giá mới/ })).toBeEnabled();
  fireEvent.change(screen.getByLabelText(/Giá bán đề xuất/), { target: { value: '350000' } });
  fireEvent.change(screen.getByLabelText(/Ghi chú của Moderator/), { target: { value: 'Giá đã trao đổi' } });
  inventoryService.read.mockRejectedValueOnce(new Error('Network interrupted'));
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(inventoryService.read).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText(/Giá bán đề xuất/)).toHaveValue('350000');
  expect(screen.getByLabelText(/Ghi chú của Moderator/)).toHaveValue('Giá đã trao đổi');
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(screen.queryByText('Network interrupted')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/Giá bán đề xuất/)).toHaveValue('350000');
});

it('recovers a submitted proposal after remount without offering another submission', async () => {
  const view = page();
  await waitFor(() => expect(screen.getByRole('button', { name: /Gửi đề xuất giá mới/ })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Giá bán đề xuất/), { target: { value: '350000' } });
  fireEvent.click(screen.getByRole('button', { name: /Gửi đề xuất giá mới/ }));
  await screen.findByText(/ĐÃ GỬI ĐỀ XUẤT/);
  view.unmount();
  endTermService.pendingPricing.mockResolvedValue([]);
  page();
  await screen.findByText(/ĐÃ GỬI ĐỀ XUẤT/);
  expect(screen.getByRole('button', { name: /Xem biên nhận ký gửi lại/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Gửi đề xuất giá mới/ })).not.toBeInTheDocument();
});

it('keeps confirmed state when Member confirmed before the proposal page is reopened', async () => {
  const view = page();
  await waitFor(() => expect(screen.getByRole('button', { name: /Gửi đề xuất giá mới/ })).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Giá bán đề xuất/), { target: { value: '350000' } });
  fireEvent.click(screen.getByRole('button', { name: /Gửi đề xuất giá mới/ }));
  await screen.findByText(/ĐÃ GỬI ĐỀ XUẤT/);
  view.unmount();
  inventoryService.read.mockResolvedValue({ ...item, status: 'ON_SALE', currentTerm: 1, currentPrice: 350000 });
  endTermService.pendingPricing.mockResolvedValue([]);
  const callsBefore = inventoryService.read.mock.calls.length;
  page();
  await waitFor(() => expect(inventoryService.read.mock.calls.length).toBeGreaterThanOrEqual(callsBefore + 2));
  expect(await screen.findByText(/MEMBER ĐÃ XÁC NHẬN/)).toBeInTheDocument();
});

it('renders scheduler term changes and UNCLAIMED using refreshed inventory data', async () => {
  vi.useFakeTimers();
  const list = vi.spyOn(inventoryService, 'list').mockResolvedValue({ items: [{ ...item, sku: item.id, status: 'ON_SALE', currentTerm: 1 }], totalPages: 1 });
  page(WarehouseInventoryPage);
  await act(async () => {});
  expect(screen.getByText(/Kỳ 1/)).toBeInTheDocument();
  list.mockResolvedValue({ items: [{ ...item, sku: item.id, status: 'ON_SALE', currentTerm: 2 }], totalPages: 1 });
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(screen.getByText(/Kỳ 2/)).toBeInTheDocument();
  list.mockResolvedValue({ items: [{ ...item, sku: item.id, status: 'UNCLAIMED', decision: 'TAKE_BACK' }], totalPages: 1 });
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(screen.getAllByText('Vô thừa nhận').length).toBeGreaterThan(1);
  expect(screen.queryByText('Khách yêu cầu nhận lại')).not.toBeInTheDocument();
  expect(screen.queryByText('Đàm phán giá →')).not.toBeInTheDocument();
});

function Probe({ loader }) {
  const resource = useResource(loader, [], { refreshInterval: 30000 });
  return <div>{resource.data?.name}<button onClick={resource.refresh}>Refresh</button></div>;
}
it('refreshes in the background without discarding data, pauses hidden tabs and cancels on unmount', async () => {
  vi.useFakeTimers();
  let resolveNext;
  const loader = vi.fn().mockResolvedValueOnce({ name: 'Kỳ 1' }).mockImplementation(() => new Promise(resolve => { resolveNext = resolve; }));
  const view = render(<Phase2Provider><Probe loader={loader} /></Phase2Provider>);
  await act(async () => {});
  expect(screen.getByText('Kỳ 1')).toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(loader).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Kỳ 1')).toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(loader).toHaveBeenCalledTimes(2);
  await act(async () => { resolveNext({ name: 'Kỳ 2' }); });
  expect(screen.getByText('Kỳ 2')).toBeInTheDocument();
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
  fireEvent(document, new Event('visibilitychange'));
  await act(async () => { vi.advanceTimersByTime(60000); });
  expect(loader).toHaveBeenCalledTimes(2);
  visibility.mockReturnValue('visible');
  fireEvent(document, new Event('visibilitychange'));
  expect(loader).toHaveBeenCalledTimes(3);
  const signal = loader.mock.calls[2][0].signal;
  view.unmount();
  expect(signal.aborted).toBe(true);
});
