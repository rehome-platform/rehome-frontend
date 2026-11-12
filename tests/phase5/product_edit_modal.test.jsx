import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import ProductEditModal from '../../src/features/moderator/components/ProductEditModal.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'mod-1', warehouseId: 'wh-1' }, isAuthenticated: true }),
}));

const wrapper = ({ children }) => <Phase2Provider>{children}</Phase2Provider>;

const baseItem = {
  id: 'Q7-AK-000845',
  sku: 'Q7-AK-000845',
  name: 'Áo sơ mi Zara trắng',
  size: 'M',
  conditionNote: 'Mới 95%',
  photos: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

it('submits updated product fields and calls onUpdated + onClose', async () => {
  const updated = { ...baseItem, name: 'Áo sơ mi Zara mới', size: 'L', conditionNote: 'Mới 98%' };
  const updateSpy = vi.spyOn(inventoryService, 'update').mockResolvedValue(updated);
  const onUpdated = vi.fn();
  const onClose = vi.fn();

  render(
    <ProductEditModal isOpen item={baseItem} onUpdated={onUpdated} onClose={onClose} />,
    { wrapper },
  );

  fireEvent.change(screen.getByLabelText(/Tên sản phẩm/i), { target: { value: 'Áo sơ mi Zara mới' } });
  fireEvent.change(screen.getByLabelText(/Kích cỡ/i), { target: { value: 'L' } });
  fireEvent.change(screen.getByLabelText(/Ghi chú tình trạng/i), { target: { value: 'Mới 98%' } });
  fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

  await waitFor(() => expect(updateSpy).toHaveBeenCalledWith('Q7-AK-000845', {
    name: 'Áo sơ mi Zara mới',
    size: 'L',
    conditionNote: 'Mới 98%',
    photoUrls: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
  }));
  expect(onUpdated).toHaveBeenCalledWith(updated);
  expect(onClose).toHaveBeenCalled();
});

it('displays backend 409 error when product has an active order', async () => {
  vi.spyOn(inventoryService, 'update').mockRejectedValue(
    new Phase2Error(
      'Sản phẩm đang nằm trong đơn hàng, không thể chỉnh sửa thông tin.',
      409,
      'PRODUCT_CANNOT_BE_UPDATED_HAS_ORDER',
    ),
  );
  const onClose = vi.fn();

  render(
    <ProductEditModal isOpen item={baseItem} onUpdated={vi.fn()} onClose={onClose} />,
    { wrapper },
  );

  fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/đang nằm trong đơn hàng/i);
  expect(onClose).not.toHaveBeenCalled();
});

