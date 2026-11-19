import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StockInForm from '../../src/features/moderator/components/StockInForm.jsx';
import {
  catalogService,
  consignmentService,
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

describe('Task 5: Allow editing Brand and Color during stock-in', () => {
  it('pre-fills brand and color from receipt/form while keeping both editable', async () => {
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [{ id: 'cat-1', name: 'Áo khoác' }],
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

    const brandSelect = await screen.findByLabelText('Thương hiệu');
    const colorSelect = screen.getByLabelText('Màu sắc');
    const quickAddBtn = screen.getByRole('button', { name: /\+ Thêm nhanh thương hiệu/i });

    await waitFor(() => {
      expect(brandSelect.value).toBe('brand-1');
    });

    expect(brandSelect).not.toBeDisabled();
    expect(quickAddBtn).not.toBeDisabled();
    expect(colorSelect).not.toBeDisabled();

    fireEvent.change(brandSelect, { target: { value: 'brand-2' } });
    expect(brandSelect.value).toBe('brand-2');

    fireEvent.change(colorSelect, { target: { value: 'Trắng' } });
    expect(colorSelect.value).toBe('Trắng');
  });
});
