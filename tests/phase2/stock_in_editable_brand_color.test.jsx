import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StockInForm from '../../src/features/moderator/components/StockInForm.jsx';
import {
  catalogService,
  consignmentService,
  inventoryService,
} from '../../src/features/moderator/services/warehouseApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', accountId: 'mod-1', warehouseId: 'wh-1' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../src/context/ToastContext.jsx', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('Task 5: Allow editing Category, Brand and Color during stock-in', () => {
  it('pre-fills category, brand and color from receipt/form while keeping all editable', async () => {
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [
        { id: 'cat-1', name: 'Áo khoác' },
        { id: 'cat-2', name: 'Chân váy' },
      ],
      brands: [
        { id: 'brand-1', name: 'Zara' },
        { id: 'brand-2', name: 'Uniqlo' },
      ],
    });
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      id: 'rec-1',
      confirmedAt: '2026-11-19T00:00:00Z',
      agreedPrice: 300000,
      brandId: 'brand-1',
      categoryId: 'cat-1',
      color: 'Đen',
    });
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-1',
      formId: 'form-1',
      name: 'Áo khoác kaki',
      brandId: 'brand-1',
      categoryId: 'cat-1',
      color: 'Đen',
    });

    render(
      <MemoryRouter>
        <Phase2Provider>
          <StockInForm
            receipt={{
              id: 'rec-1',
              confirmedAt: '2026-11-19T00:00:00Z',
              agreedPrice: 300000,
              brandId: 'brand-1',
              categoryId: 'cat-1',
              color: 'Đen',
            }}
            form={{
              formId: 'form-1',
              name: 'Áo khoác kaki',
              brandId: 'brand-1',
              categoryId: 'cat-1',
              color: 'Đen',
            }}
          />
        </Phase2Provider>
      </MemoryRouter>,
    );

    const categorySelect = await screen.findByLabelText('Danh mục');
    const brandSelect = screen.getByLabelText('Thương hiệu');
    const colorSelect = screen.getByLabelText('Màu sắc');
    const quickAddBtn = screen.getByRole('button', { name: /\+ Thêm nhanh thương hiệu/i });

    await waitFor(() => {
      expect(categorySelect.value).toBe('cat-1');
      expect(brandSelect.value).toBe('brand-1');
    });

    expect(categorySelect).not.toBeDisabled();
    expect(brandSelect).not.toBeDisabled();
    expect(quickAddBtn).not.toBeDisabled();
    expect(colorSelect).not.toBeDisabled();

    fireEvent.change(categorySelect, { target: { value: 'cat-2' } });
    expect(categorySelect.value).toBe('cat-2');

    fireEvent.change(brandSelect, { target: { value: 'brand-2' } });
    expect(brandSelect.value).toBe('brand-2');

    fireEvent.change(colorSelect, { target: { value: 'Trắng' } });
    expect(colorSelect.value).toBe('Trắng');
  });

  it('submits updated categoryId when Moderator changes pre-filled category before stock-in', async () => {
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [
        { id: 'cat-1', name: 'Áo kiểu' },
        { id: 'cat-2', name: 'Áo sơ mi' },
      ],
      brands: [{ id: 'brand-1', name: 'Coolmate' }],
    });
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      id: 'rec-2',
      confirmedAt: '2026-11-25T00:00:00Z',
      agreedPrice: 200000,
      categoryId: 'cat-1',
      brandId: 'brand-1',
    });
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-2',
      formId: 'form-2',
      productName: 'Áo sơ mi trắng',
      categoryId: 'cat-1',
      brandId: 'brand-1',
    });
    vi.spyOn(inventoryService, 'upload').mockResolvedValue({
      url: 'https://cdn.rehome.test/shirt.jpg',
    });
    const createSpy = vi.spyOn(inventoryService, 'create').mockResolvedValue({
      id: 'Q7-SM-000001',
      sku: 'Q7-SM-000001',
      name: 'Áo sơ mi trắng',
      status: 'ON_SALE',
    });

    render(
      <MemoryRouter>
        <Phase2Provider>
          <StockInForm
            receipt={{
              id: 'rec-2',
              confirmedAt: '2026-11-25T00:00:00Z',
              agreedPrice: 200000,
              categoryId: 'cat-1',
              brandId: 'brand-1',
              productName: 'Áo sơ mi trắng',
            }}
            form={{
              formId: 'form-2',
              productName: 'Áo sơ mi trắng',
              categoryId: 'cat-1',
              brandId: 'brand-1',
            }}
          />
        </Phase2Provider>
      </MemoryRouter>,
    );

    const categorySelect = await screen.findByLabelText('Danh mục');
    await waitFor(() => expect(categorySelect.value).toBe('cat-1'));
    fireEvent.change(categorySelect, { target: { value: 'cat-2' } });

    const photoInput = screen.getByLabelText('Ảnh sản phẩm');
    const file = new File(['dummy'], 'shirt.png', { type: 'image/png' });
    fireEvent.change(photoInput, { target: { files: [file] } });
    await screen.findByText('shirt.png · Đã tải ảnh gốc');

    const submitBtn = screen.getByRole('button', { name: 'Nhập kho · tạo Mã hàng hóa' });
    await waitFor(() => expect(submitBtn).toBeEnabled());
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          receiptId: 'rec-2',
          categoryId: 'cat-2',
          brandId: 'brand-1',
        }),
        expect.anything(),
      );
    });
  });

  it('filters categories by AI try-on slot, shows active slot badge, and warns on name/slot mismatch', async () => {
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [
        { id: 'cat-top', name: 'Áo sơ mi', tryonSlot: 'TOP' },
        { id: 'cat-bottom', name: 'Quần jeans', tryonSlot: 'BOTTOM' },
        { id: 'cat-dress', name: 'Đầm dự tiệc', tryonSlot: 'DRESS' },
      ],
      brands: [{ id: 'brand-1', name: 'Zara' }],
    });
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      id: 'rec-slot-1',
      confirmedAt: '2026-11-26T00:00:00Z',
      agreedPrice: 350000,
      categoryId: 'cat-top',
      brandId: 'brand-1',
    });
    vi.spyOn(consignmentService, 'read').mockResolvedValue({
      id: 'form-slot-1',
      formId: 'form-slot-1',
      productName: 'Quần jeans ống rộng Zara',
      categoryId: 'cat-top',
      brandId: 'brand-1',
    });

    render(
      <MemoryRouter>
        <Phase2Provider>
          <StockInForm
            receipt={{
              id: 'rec-slot-1',
              confirmedAt: '2026-11-26T00:00:00Z',
              agreedPrice: 350000,
              categoryId: 'cat-top',
              brandId: 'brand-1',
            }}
            form={{
              formId: 'form-slot-1',
              productName: 'Quần jeans ống rộng Zara',
              categoryId: 'cat-top',
              brandId: 'brand-1',
            }}
          />
        </Phase2Provider>
      </MemoryRouter>,
    );

    const badge = await screen.findByTestId('stockin-tryon-slot-badge');
    expect(badge).toHaveTextContent('Áo');
    expect(badge).not.toHaveTextContent('(TOP)');

    // Tên sản phẩm là "Quần jeans..." nhưng đang chọn danh mục TOP -> hiện cảnh báo lệch slot
    expect(screen.getByTestId('stockin-slot-mismatch-warning')).toHaveTextContent(/Quần \/ Váy/);
    expect(screen.getByTestId('stockin-slot-mismatch-warning')).not.toHaveTextContent(/\((TOP|BOTTOM|DRESS)\)/);

    // Lọc theo BOTTOM -> chỉ còn danh mục BOTTOM trong select Danh mục và reset category không khớp
    const slotFilter = screen.getByLabelText('Lọc theo Slot thử đồ AI');
    fireEvent.change(slotFilter, { target: { value: 'BOTTOM' } });

    const categorySelect = screen.getByLabelText('Danh mục');
    expect(categorySelect.value).toBe('');
    expect(screen.queryByRole('option', { name: 'Áo sơ mi' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Quần jeans' })).toBeInTheDocument();

    fireEvent.change(categorySelect, { target: { value: 'cat-bottom' } });
    expect(screen.getByTestId('stockin-tryon-slot-badge')).toHaveTextContent('Quần / Váy');
    expect(screen.getByTestId('stockin-tryon-slot-badge')).not.toHaveTextContent('(BOTTOM)');
    expect(screen.queryByTestId('stockin-slot-mismatch-warning')).not.toBeInTheDocument();
  });
});
