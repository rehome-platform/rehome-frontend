import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, beforeEach, afterAll } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { PackingDetail } from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { packingService } from '../../src/features/moderator/services/packingApi.js';
import { orderFixture } from './fixtures.js';
import { phase4Contract } from '../../src/features/moderator/config/packingContract.js';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';
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
it('hides payment deadline while retaining delivery and return deadlines', async () => {
  const order = orderFixture();
  order.paymentDeadline = new Date(Date.now() + 25 * 60 * 1000).toISOString();
  order.autoCompleteDeadline = new Date(Date.now() + 5 * 24 * 3600000).toISOString();
  order.returnDeadline = new Date(Date.now() + 3 * 24 * 3600000).toISOString();
  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  mount();
  await screen.findByText('Đã quét 0/2 SKU');
  expect(screen.queryByText('Hạn thanh toán:')).not.toBeInTheDocument();
  expect(screen.getByText('Hạn tự động hoàn tất:')).toBeInTheDocument();
  expect(screen.getByText('Hạn yêu cầu trả hàng:')).toBeInTheDocument();
});

it('does not increment scannedCount on wrong SKU (or rejected scan), shows wrong-item feedback, and keeps waybill button disabled', async () => {
  const order = orderFixture();
  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  const scan = vi.spyOn(packingService, 'scan')
    .mockResolvedValueOnce({ matched: false, wrongItem: { sku: 'WRONG-SKU', name: 'Món khác', brandName: 'Zara' } })
    .mockRejectedValueOnce(new Phase2Error('Không tìm thấy sản phẩm với mã SKU-404.', 422));

  mount();
  await screen.findByText('Đã quét 0/2 SKU');
  expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeDisabled();

  // 1. Quét sai SKU (matched: false) -> không tăng tiến độ, mở modal sai món + giữ nút tạo vận đơn disabled
  fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'WRONG-SKU' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đối chiếu' }));

  await waitFor(() => expect(scan).toHaveBeenCalledTimes(1));
  await screen.findByText('SKU không thuộc đơn.');
  expect(screen.getByText('Đã quét 0/2 SKU')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeDisabled();

  // Đóng modal sai món nếu có
  const closeModalBtn = screen.queryByRole('button', { name: /^(Đóng|Quay lại)$/i });
  if (closeModalBtn) fireEvent.click(closeModalBtn);

  // 2. Quét SKU không tồn tại (reject 404) -> onError hoạt động, không tăng tiến độ, hiển thị lỗi
  fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'SKU-404' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đối chiếu' }));

  await waitFor(() => expect(scan).toHaveBeenCalledTimes(2));
  const errorMessages = await screen.findAllByText('Không tìm thấy sản phẩm với mã SKU-404.');
  expect(errorMessages.length).toBeGreaterThan(0);
  expect(screen.getByText('Đã quét 0/2 SKU')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeDisabled();
});

it('never auto-retries createWaybill on ECONNABORTED timeout and keeps shipment locked', async () => {
  const order = orderFixture();
  order.scannedProductIds = ['sku-a', 'SKU-B'];
  order.scannedCount = 2;
  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  const shipment = vi.spyOn(packingService, 'shipment').mockImplementation(async () => {
    order.shipmentOutcome = 'UNKNOWN';
    const err = new Error('timeout of 30000ms exceeded');
    err.code = 'ECONNABORTED';
    throw err;
  });

  mount();
  const button = await screen.findByRole('button', { name: 'Tạo vận đơn GHN' });
  await waitFor(() => expect(button).toBeEnabled());

  fireEvent.click(button);
  await screen.findByText('Đang kiểm tra kết quả tạo vận đơn. Chưa thể tạo mới.');
  expect(shipment).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeDisabled());
});

it('shows PACKED label and allows confirming handover to GHN, transitioning to SHIPPING with handedOverAt', async () => {
  const handedOverAt = '2026-11-19T06:30:00.000Z';
  const order = orderFixture();
  order.status = 'PACKED';
  order.ghnTrackingCode = 'GHN-PACKED-01';
  order.shipmentOutcome = 'CREATED';
  order.scannedProductIds = ['sku-a', 'SKU-B'];
  order.scannedCount = 2;

  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  const handover = vi.spyOn(packingService, 'handoverOrder').mockImplementation(async () => {
    order.status = 'SHIPPING';
    order.handedOverAt = handedOverAt;
    return { id: order.orderId, status: 'SHIPPING', handedOverAt };
  });

  mount();
  await screen.findByText('GHN-PACKED-01');
  expect(screen.getByText('Đã đóng gói')).toBeInTheDocument();

  const handoverBtn = screen.getByRole('button', { name: 'Xác nhận bàn giao GHN' });
  expect(handoverBtn).toBeEnabled();
  fireEvent.click(handoverBtn);

  await waitFor(() => expect(handover).toHaveBeenCalledTimes(1));
  await screen.findByText('Đã bàn giao cho GHN');
  expect(screen.getByText('Đang vận chuyển')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Xác nhận bàn giao GHN' })).not.toBeInTheDocument();
});

it('shows already-handed-over badge for SHIPPING orders and hides handover button', async () => {
  const order = orderFixture();
  order.status = 'SHIPPING';
  order.ghnTrackingCode = 'GHN-SHIP-02';
  order.shipmentOutcome = 'CREATED';
  order.handedOverAt = '2026-11-19T06:00:00.000Z';

  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));

  mount();
  await screen.findByText('GHN-SHIP-02');
  expect(screen.getByText('Đã bàn giao cho GHN')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Xác nhận bàn giao GHN' })).not.toBeInTheDocument();
});

it('does not show handover button when order is not PACKED', async () => {
  const order = orderFixture();
  order.status = 'PACKING';
  order.ghnTrackingCode = 'GHN-PACKING-03';
  order.shipmentOutcome = 'CREATED';

  vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));

  mount();
  await screen.findByText('GHN-PACKING-03');
  expect(screen.queryByRole('button', { name: 'Xác nhận bàn giao GHN' })).not.toBeInTheDocument();
});

it('uses canonical resolved order.id UUID for packing mutations when mounted with non-UUID orderNo', async () => {
  const realUuid = '550e8400-e29b-41d4-a716-446655440019';
  const order = {
    ...orderFixture(),
    id: realUuid,
    orderId: realUuid,
    orderNo: 'OD-2026-000019',
  };
  const readSpy = vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
  const scanSpy = vi.spyOn(packingService, 'scan').mockImplementation(async () => {
    order.scannedProductIds = ['sku-a', 'SKU-B'];
    order.scannedCount = 2;
    return { matched: true, scannedCount: 2, totalCount: 2, scannedProductId: 'sku-a' };
  });
  const shipmentSpy = vi.spyOn(packingService, 'shipment').mockResolvedValue({
    id: realUuid,
    status: 'PACKED',
    ghnTrackingCode: 'GHN-19',
  });

  mount('OD-2026-000019');
  await screen.findByText('Đã quét 0/2 SKU');
  expect(readSpy).toHaveBeenCalledWith('OD-2026-000019', expect.any(Object));

  fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'sku-a' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đối chiếu' }));

  await waitFor(() => expect(scanSpy).toHaveBeenCalledWith(realUuid, 'sku-a', expect.any(Object)));
  await screen.findByText('Đã quét 2/2 SKU');

  const shipBtn = screen.getByRole('button', { name: 'Tạo vận đơn GHN' });
  await waitFor(() => expect(shipBtn).toBeEnabled());
  fireEvent.click(shipBtn);

  await waitFor(() => expect(shipmentSpy).toHaveBeenCalledWith(realUuid, expect.any(Object)));
  readSpy.mockRestore();
  scanSpy.mockRestore();
  shipmentSpy.mockRestore();
});
