import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { WaybillPrintModal } from '../../src/features/moderator/components/packing/WaybillPrintModal.jsx';
import { packingService } from '../../src/features/moderator/services/packingApi.js';
import baseApi from '../../src/services/baseApi.js';

vi.mock('../../src/features/moderator/hooks/warehouseHooks.jsx', () => ({
  usePhase2: () => ({ scope: { userId: 'mod', warehouseId: 'warehouse' } }),
}));
const order = { id: 'o1', ghnTrackingCode: 'GHN-REAL', items: [] };
beforeEach(() => {
  vi.spyOn(packingService, 'read').mockImplementation(async id => ({ ...order, id }));
});

it('gets a fresh A5 label per print and opens the GHN document instead of printing the app', async () => {
  const label = vi.spyOn(packingService, 'label').mockResolvedValue({
    size: 'A5', printUrl: 'https://dev-online-gateway.ghn.vn/a5/public-api/printA5?token=fresh',
  });
  const popup = { opener: {}, location: { href: '' }, close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(popup);
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(<WaybillPrintModal isOpen order={order} onClose={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'In vận đơn A5' }));
  await waitFor(() => expect(popup.location.href).toContain('printA5?token=fresh'));
  expect(label).toHaveBeenCalledWith('o1', expect.objectContaining({ scope: expect.any(Object) }));
  expect(popup.opener).toBeNull();
  expect(print).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'In vận đơn A5' }));
  await waitFor(() => expect(label).toHaveBeenCalledTimes(2));
});

it('provides a safe manual link if popups are blocked and supports retry after errors', async () => {
  const label = vi.spyOn(packingService, 'label').mockRejectedValueOnce(new Error('GHN tạm lỗi'))
    .mockResolvedValue({ printUrl: 'https://online-gateway.ghn.vn/a5/public-api/printA5?token=retry' });
  vi.spyOn(window, 'open').mockReturnValue(null);
  render(<WaybillPrintModal isOpen order={order} onClose={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'In vận đơn A5' }));
  await screen.findByText('GHN tạm lỗi');
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại in A5' }));
  const link = await screen.findByRole('link', { name: 'Mở phiếu A5' });
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(label).toHaveBeenCalledTimes(2);
});

it('ignores stale label responses after changing orders', async () => {
  let finish;
  vi.spyOn(packingService, 'label').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const popup = { opener: null, location: { href: '' }, close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(popup);
  const view = render(<WaybillPrintModal isOpen order={order} onClose={() => {}} />);
  fireEvent.click(await screen.findByRole('button', { name: 'In vận đơn A5' }));
  view.rerender(<WaybillPrintModal isOpen order={{ ...order, id: 'o2', ghnTrackingCode: 'GHN-SECOND' }} onClose={() => {}} />);
  finish({ printUrl: 'https://online-gateway.ghn.vn/a5/public-api/printA5?token=old' });
  await waitFor(() => expect(popup.close).toHaveBeenCalled());
  expect(popup.location.href).toBe('');
});

it('locks repeated clicks while fetching and rejects a non-GHN document', async () => {
  let finish;
  const label = vi.spyOn(packingService, 'label').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const popup = { opener: null, location: { href: '' }, close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(popup);
  render(<WaybillPrintModal isOpen order={order} onClose={() => {}} />);
  const button = await screen.findByRole('button', { name: 'In vận đơn A5' });
  fireEvent.click(button); fireEvent.click(button);
  expect(label).toHaveBeenCalledOnce();
  finish({ printUrl: 'https://example.com/printA5?token=bad' });
  await screen.findByRole('alert');
  expect(popup.location.href).toBe('');
  expect(popup.close).toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'Mở phiếu A5' })).not.toBeInTheDocument();
});

it('requests the authenticated backend label endpoint with A5 on every call', async () => {
  const request = vi.spyOn(baseApi, 'request').mockResolvedValue({ data: { data: { size: 'A5', printUrl: 'label' } } });
  await packingService.label('order 1', { scope: { userId: 'mod', warehouseId: 'warehouse' } });
  expect(request).toHaveBeenCalledWith(expect.objectContaining({
    method: 'get', url: '/orders/order%201/shipment/label?size=A5',
  }));
});
