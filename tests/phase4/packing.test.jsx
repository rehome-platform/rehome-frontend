import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, beforeEach, afterAll } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { PackingDetail } from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { packingService } from '../../src/features/moderator/services/packingApi.js';
import { orderFixture } from './fixtures.js';
import { phase4Contract } from '../../src/features/moderator/config/packingContract.js';
const original = structuredClone(phase4Contract);
beforeEach(() => {
  phase4Contract.revision = 'test-only'; phase4Contract.gates.scan = true; phase4Contract.gates.shipment = true;
});
afterAll(() => Object.assign(phase4Contract, original));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({
  user: { id: 'mod-a', warehouseId: 'warehouse-a' }, isAuthenticated: true,
}) }));
function mount(orderId = 'o1') {
  return render(<MemoryRouter><Phase2Provider><PackingDetail orderId={orderId} onChanged={() => {}} /></Phase2Provider></MemoryRouter>);
}
it('scans multi-SKU using server state, preserves case, rejects duplicates and resumes', async () => {
  const order = orderFixture();
  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  const scan = vi.spyOn(packingService, 'scan').mockImplementation(async (_, productId) => {
    const matched = order.items.some(item => item.productId === productId);
    if (matched && !order.scannedProductIds.includes(productId)) order.scannedProductIds.push(productId);
    order.scannedCount = order.scannedProductIds.length;
    return { matched };
  });
  const first = mount();
  await screen.findByText('Đã quét 0/2 SKU');
  async function submit(code, count) {
    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: 'Đối chiếu' }));
    await waitFor(() => expect(scan).toHaveBeenCalledTimes(count));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đối chiếu' })).toBeEnabled());
  }
  await submit('sku-a', 1);
  await screen.findByText('Đã quét 1/2 SKU');
  await submit('sku-a', 2);
  expect(screen.getByText('Đã quét 1/2 SKU')).toBeInTheDocument();
  await submit('wrong', 3);
  await screen.findByText('SKU không thuộc đơn.');
  await submit('SKU-B', 4);
  await screen.findByText('Đã quét 2/2 SKU');
  expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeEnabled();
  first.unmount(); mount();
  await screen.findByText('Đã quét 2/2 SKU');
});
it('locks unknown shipment outcomes, reconciles and never retries automatically', async () => {
  const order = orderFixture(); order.scannedProductIds = ['sku-a', 'SKU-B']; order.scannedCount = 2;
  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  const shipment = vi.spyOn(packingService, 'shipment').mockImplementation(async () => {
    order.shipmentOutcome = 'UNKNOWN'; throw new Error('timeout');
  });
  mount();
  const button = await screen.findByRole('button', { name: 'Tạo vận đơn GHN' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button); fireEvent.click(button);
  await screen.findByText('Đang kiểm tra kết quả tạo vận đơn. Chưa thể tạo mới.');
  expect(shipment).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeDisabled());
  order.ghnTrackingCode = 'GHN-existing'; order.shipmentOutcome = 'CREATED';
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
  await screen.findByText('GHN-existing'); expect(shipment).toHaveBeenCalledOnce();
});
it('blocks actions after owner changes on refresh', async () => {
  const order = orderFixture();
  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  mount(); await screen.findByText('Đã quét 0/2 SKU');
  order.claimedBy = 'another';
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra trạng thái' }));
  await screen.findByText('Đã quét 0/2 SKU');
  expect(screen.getByRole('button', { name: 'Đối chiếu' })).toBeDisabled();
});
