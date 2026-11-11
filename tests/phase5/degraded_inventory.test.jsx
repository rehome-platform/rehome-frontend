import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import InventoryDetailPage from '../../src/features/moderator/pages/InventoryDetailPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { returnService } from '../../src/features/moderator/services/returnApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { id: 'mod-1', warehouseId: 'wh-1' }, isAuthenticated: true }) }));
const product = { id: 'product-id', sku: 'display-sku', name: 'Actual item', status: 'ON_SALE', photos: [], allowedActions: [] };
const pending = { id: 'case-id', productId: product.id, productName: product.name, photos: ['https://photos.test/damage'], moderatorNote: 'Actual damage', decision: null, status: 'PENDING_DECISION', decisionDeadline: '2026-12-11T10:00:00Z', compensationAmount: 0, degradedCompensationRate: 0.5 };
beforeEach(() => {
  vi.spyOn(inventoryService, 'read').mockResolvedValue(product);
  vi.spyOn(inventoryService, 'movements').mockResolvedValue([]);
  vi.spyOn(inventoryService, 'degradedCases').mockResolvedValue([pending]);
  vi.spyOn(inventoryService, 'upload').mockResolvedValue({ url: 'https://photos.test/damage' });
  vi.spyOn(returnService, 'createDegradedCase').mockResolvedValue(pending);
  vi.spyOn(returnService, 'getDegradedCase').mockResolvedValue(pending);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});
function openPage() {
  return render(<MemoryRouter initialEntries={['/moderator/inventory/display-sku']}><Phase2Provider><Routes><Route path="/moderator/inventory/:sku" element={<InventoryDetailPage />} /></Routes></Phase2Provider></MemoryRouter>);
}
async function fillProposal() {
  fireEvent.click(await screen.findByRole('button', { name: /^Hàng xuống cấp$/ }));
  fireEvent.change(screen.getByPlaceholderText(/VD: Sản phẩm/), { target: { value: '  Actual damage  ' } });
  const fileInput = document.querySelector('input[type=file][accept="image/*"]');
  fireEvent.change(fileInput, { target: { files: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })] } });
  await waitFor(() => expect(screen.getByRole('button', { name: /Gửi đề xuất cho/ })).toBeEnabled());
}
it('creates with product ID, uploaded evidence and notes, then refreshes WAREHOUSE status', async () => {
  openPage();
  await fillProposal();
  inventoryService.read.mockResolvedValue({ ...product, status: 'WAREHOUSE' });
  fireEvent.click(screen.getByRole('button', { name: /Gửi đề xuất cho/ }));
  await waitFor(() => expect(returnService.createDegradedCase).toHaveBeenCalledWith({ productId: product.id, notes: 'Actual damage', photos: ['https://photos.test/damage'] }));
  await waitFor(() => expect(screen.getAllByText(/tạm ngừng bán/i).length).toBeGreaterThan(0));
  expect(screen.queryByRole('button', { name: /^Hàng xuống cấp$/ })).not.toBeInTheDocument();
});
it.each(['WAREHOUSE', 'SOLD', 'UNCLAIMED', 'PLATFORM_OWNED'])('does not open another case for %s products', async status => {
  inventoryService.read.mockResolvedValue({ ...product, status });
  openPage();
  await screen.findByText('Actual item');
  expect(screen.queryByRole('button', { name: /^Hàng xuống cấp$/ })).not.toBeInTheDocument();
});
it.each([403, 404, 409])('keeps the proposal open on create error %s', async status => {
  returnService.createDegradedCase.mockRejectedValueOnce(Object.assign(new Error(`Create error ${status}`), { status }));
  openPage();
  await fillProposal();
  fireEvent.click(screen.getByRole('button', { name: /Gửi đề xuất cho/ }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining(`Create error ${status}`)));
  expect(screen.getByRole('button', { name: /Gửi đề xuất cho/ })).toBeInTheDocument();
});
