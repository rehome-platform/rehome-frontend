import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';
import { inventoryService } from '../../src/features/moderator/services/warehouseApi.js';
import baseApi from '../../src/services/baseApi.js';
import ProductEditModal from '../../src/features/moderator/components/ProductEditModal.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { id: 'mod-1', warehouseId: 'wh-1' }, isAuthenticated: true }),
}));

const wrapper = ({ children }) => <Phase2Provider>{children}</Phase2Provider>;

const baseItem = {
  id: 'Q7-AK-000845',
  sku: 'Q7-AK-000845',
  status: 'ON_SALE',
  name: 'Áo sơ mi Zara trắng',
  currentPrice: 250000,
  categoryName: 'Áo sơ mi',
  brandName: 'Zara',
  size: 'M',
  conditionNote: 'Mới 95%',
  photos: ['https://cdn.example/1.jpg', 'https://cdn.example/2.jpg'],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ProductEditModal', () => {
  it('submits strictly { name, photoUrls } when ON_SALE and keeps other fields read-only', async () => {
    const updated = { ...baseItem, name: 'Áo sơ mi Zara mới' };
    const updateSpy = vi.spyOn(inventoryService, 'update').mockResolvedValue(updated);
    const onUpdated = vi.fn();
    const onClose = vi.fn();

    render(
      <ProductEditModal isOpen item={baseItem} onUpdated={onUpdated} onClose={onClose} />,
      { wrapper },
    );

    // Other fields remain visible and disabled/read-only
    expect(screen.getByLabelText(/SKU/i)).toBeDisabled();
    expect(screen.getByLabelText(/Trạng thái/i)).toBeDisabled();
    expect(screen.getByLabelText(/Giá bán/i)).toBeDisabled();
    expect(screen.getByLabelText(/Danh mục/i)).toBeDisabled();
    expect(screen.getByLabelText(/Thương hiệu/i)).toBeDisabled();
    expect(screen.getByLabelText(/Kích cỡ/i)).toBeDisabled();
    expect(screen.getByLabelText(/Mức độ tình trạng/i)).toBeDisabled();
    expect(screen.getByLabelText(/Ghi chú tình trạng/i)).toBeDisabled();

    // Only name and photos are editable
    const nameInput = screen.getByLabelText(/Tên sản phẩm/i);
    expect(nameInput).not.toBeDisabled();
    fireEvent.change(nameInput, { target: { value: '  Áo sơ mi Zara mới  ' } });

    // Reorder second photo before first photo
    const moveLeftButtons = screen.getAllByTitle('Đưa lên trước');
    fireEvent.click(moveLeftButtons[1]);

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith('Q7-AK-000845', {
        name: 'Áo sơ mi Zara mới',
        photoUrls: ['https://cdn.example/2.jpg', 'https://cdn.example/1.jpg'],
      }),
    );
    expect(onUpdated).toHaveBeenCalledWith(updated);
    expect(onClose).toHaveBeenCalled();
  });

  it('disables editing and save button with clear message when status is not ON_SALE', () => {
    const updateSpy = vi.spyOn(inventoryService, 'update');
    const soldItem = { ...baseItem, status: 'SOLD' };

    render(
      <ProductEditModal isOpen item={soldItem} onUpdated={vi.fn()} onClose={vi.fn()} />,
      { wrapper },
    );

    expect(
      screen.getByText('Chỉ được chỉnh sửa tên và ảnh bán hàng khi sản phẩm đang ON_SALE.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên sản phẩm/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Lưu thay đổi/i })).toBeDisabled();
    screen.getAllByRole('button', { name: 'Xóa' }).forEach((btn) => {
      expect(btn).toBeDisabled();
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('blocks submit when name is blank or all photos are removed', () => {
    const updateSpy = vi.spyOn(inventoryService, 'update');

    render(
      <ProductEditModal isOpen item={baseItem} onUpdated={vi.fn()} onClose={vi.fn()} />,
      { wrapper },
    );

    const saveBtn = screen.getByRole('button', { name: /Lưu thay đổi/i });
    const nameInput = screen.getByLabelText(/Tên sản phẩm/i);

    // Blank name blocks submit
    fireEvent.change(nameInput, { target: { value: '   ' } });
    expect(saveBtn).toBeDisabled();

    // Restore name, remove all photos -> blocks submit
    fireEvent.change(nameInput, { target: { value: 'Áo sơ mi mới' } });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Xóa' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Xóa' })[0]);
    expect(saveBtn).toBeDisabled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('blocks submit while photo upload is pending', async () => {
    let resolveUpload;
    vi.spyOn(inventoryService, 'upload').mockImplementation(
      () => new Promise((resolve) => { resolveUpload = resolve; }),
    );
    const updateSpy = vi.spyOn(inventoryService, 'update');

    const { container } = render(
      <ProductEditModal isOpen item={baseItem} onUpdated={vi.fn()} onClose={vi.fn()} />,
      { wrapper },
    );

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['img'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lưu thay đổi/i })).toBeDisabled();
    });
    expect(updateSpy).not.toHaveBeenCalled();

    resolveUpload({ url: 'https://cdn.example/3.jpg' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lưu thay đổi/i })).not.toBeDisabled();
    });
  });

  it.each([
    [403, 'WAREHOUSE_FORBIDDEN', 'Bạn không có quyền chỉnh sửa sản phẩm thuộc kho khác.'],
    [404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm.'],
    [409, 'PRODUCT_CANNOT_BE_UPDATED_HAS_ORDER', 'Sản phẩm đang nằm trong đơn hàng, không thể chỉnh sửa thông tin.'],
  ])('displays %i error message and keeps modal open', async (status, code, message) => {
    vi.spyOn(inventoryService, 'update').mockRejectedValue(
      new Phase2Error(message, status, code),
    );
    const onClose = vi.fn();

    render(
      <ProductEditModal isOpen item={baseItem} onUpdated={vi.fn()} onClose={onClose} />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(message);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('inventoryService.update sends PUT /products/{id} with strictly { name, photoUrls }', async () => {
    const requestSpy = vi.spyOn(baseApi, 'request').mockResolvedValue({
      status: 200,
      data: { data: { id: 'Q7-AK-000845', name: 'Tên mới', status: 'ON_SALE' } },
    });

    await inventoryService.update('Q7-AK-000845', {
      name: '  Tên mới  ',
      size: 'L',
      conditionNote: 'Should be ignored',
      photoUrls: ['https://cdn.example/1.jpg'],
    });

    expect(requestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'put',
        url: '/products/Q7-AK-000845',
        data: {
          name: 'Tên mới',
          photoUrls: ['https://cdn.example/1.jpg'],
        },
      }),
    );
  });
});
