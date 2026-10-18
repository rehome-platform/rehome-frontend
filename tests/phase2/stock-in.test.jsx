import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/phase2/hooks.jsx';
import { catalogService, inventoryService } from '../../src/features/moderator/phase2/api.js';
import { Phase2Error } from '../../src/features/moderator/phase2/model.js';
import StockInForm from '../../src/features/moderator/phase2/StockInForm.jsx';

const identity = { id: 'mod-a', warehouseId: 'warehouse-a' };
vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: identity, isAuthenticated: true }),
}));
function Wrapper({ children }) {
  return <MemoryRouter><Phase2Provider>{children}</Phase2Provider></MemoryRouter>;
}
const receipt = { receiptId: 'receipt-1', confirmedAt: '2026-10-18' };
const submit = () => screen.getByRole('button', { name: 'Nhập kho · tạo SKU' });
const photo = () => new File(['photo'], 'item.png', { type: 'image/png' });
beforeEach(() => {
  vi.spyOn(catalogService, 'list').mockResolvedValue({
    categories: [{ id: 'cat', name: 'Áo', hidden: false }, { id: 'old-cat', name: 'Hidden category', hidden: true }],
    brands: [{ id: 'brand', name: 'Brand' }, { id: 'old-brand', name: 'Hidden brand', hidden: true }],
  });
  vi.spyOn(inventoryService, 'byReceipt').mockResolvedValue(null);
  vi.spyOn(inventoryService, 'upload').mockResolvedValue({ url: 'https://example.test/photo.png' });
});
async function fillFields(user) {
  await user.type(await screen.findByLabelText('Tên sản phẩm'), '  Áo mới  ');
  await user.type(screen.getByLabelText('Size'), ' M ');
  await user.type(screen.getByLabelText('Vị trí kệ'), ' A1 ');
  await user.selectOptions(screen.getByLabelText('Danh mục'), 'cat');
  await user.selectOptions(screen.getByLabelText('Thương hiệu'), 'brand');
}
describe('stock-in form contracts (mocked services)', () => {
  it('keeps required controls, excludes hidden choices and blocks incomplete submissions', async () => {
    const create = vi.spyOn(inventoryService, 'create');
    render(<StockInForm receipt={receipt} />, { wrapper: Wrapper });
    await screen.findByRole('option', { name: 'Áo' });
    for (const label of ['Tên sản phẩm', 'Size', 'Vị trí kệ', 'Danh mục', 'Thương hiệu'])
      expect(screen.getByLabelText(label)).toBeRequired();
    expect(screen.queryByRole('option', { name: /Hidden/ })).not.toBeInTheDocument();
    expect(submit()).toBeDisabled();
    fireEvent.submit(submit().closest('form'));
    expect(create).not.toHaveBeenCalled();
  });
  it('preserves trimmed payload, pending state and immediate duplicate protection', async () => {
    let finish;
    const create = vi.spyOn(inventoryService, 'create').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<StockInForm receipt={receipt} onSuccess={onSuccess} />, { wrapper: Wrapper });
    await fillFields(user);
    expect(submit()).toBeDisabled();
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), photo());
    await waitFor(() => expect(submit()).toBeEnabled());
    const form = submit().closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0]).toEqual({ receiptId: 'receipt-1', name: 'Áo mới', size: 'M',
      shelfLocation: 'A1', categoryId: 'cat', brandId: 'brand', photoUrls: ['https://example.test/photo.png'] });
    expect(submit()).toBeDisabled();
    expect(screen.getByLabelText('Ảnh sản phẩm')).toBeDisabled();
    await act(async () => finish({ sku: 'NEW-SKU' }));
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith({ sku: 'NEW-SKU' });
  });
  it('retains edits and shows field errors after a rejected submission', async () => {
    vi.spyOn(inventoryService, 'create').mockRejectedValue(new Phase2Error('Invalid', 422, '', { name: 'Tên không hợp lệ' }));
    const user = userEvent.setup();
    render(<StockInForm receipt={receipt} />, { wrapper: Wrapper });
    await fillFields(user);
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), photo());
    await user.click(submit());
    await screen.findByText('Tên không hợp lệ');
    expect(screen.getByLabelText('Tên sản phẩm')).toHaveValue('  Áo mới  ');
    expect(screen.getByLabelText('Tên sản phẩm')).toHaveAttribute('aria-invalid', 'true');
    expect(submit()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Tải lại trạng thái' }));
    await waitFor(() => expect(submit()).toBeEnabled());
  });
  it('blocks submission while photos are pending and for whitespace-only fields', async () => {
    let finish;
    inventoryService.upload.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    render(<StockInForm receipt={receipt} />, { wrapper: Wrapper });
    await fillFields(user);
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), photo());
    expect(submit()).toBeDisabled();
    await act(async () => finish({ url: 'https://example.test/photo.png' }));
    await waitFor(() => expect(submit()).toBeEnabled());
    await user.clear(screen.getByLabelText('Tên sản phẩm'));
    await user.type(screen.getByLabelText('Tên sản phẩm'), ' ');
    expect(submit()).toBeDisabled();
  });
  it('requires a successful recovery check and server receipt confirmation', async () => {
    inventoryService.byReceipt.mockRejectedValue(new Phase2Error('Lookup failed', 500));
    const user = userEvent.setup();
    render(<StockInForm receipt={{ ...receipt, confirmedAt: null }} />, { wrapper: Wrapper });
    await fillFields(user);
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), photo());
    await screen.findByText('Lookup failed');
    expect(submit()).toBeDisabled();
  });
});
