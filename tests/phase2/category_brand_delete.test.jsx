import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CategoryBrandPage from '../../src/features/moderator/pages/CategoryBrandPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import ToastContainer from '../../src/components/common/ToastContainer.jsx';
import { catalogService } from '../../src/features/moderator/services/warehouseApi.js';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

vi.mock('../../src/features/moderator/services/warehouseApi.js', () => ({
  catalogService: {
    list: vi.fn().mockResolvedValue({
      categories: [
        { id: 'cat-new', name: 'Phụ kiện mới', slot: 'NONE', hidden: false, status: 'ACTIVE' },
        { id: 'cat-used', name: 'Áo khoác cũ', slot: 'TOP', hidden: false, status: 'ACTIVE' },
      ],
      brands: [
        { id: 'brand-new', name: 'Brand Mới Chưa Dùng', hidden: false, status: 'ACTIVE' },
      ],
    }),
    save: vi.fn().mockResolvedValue(true),
    hide: vi.fn().mockResolvedValue(true),
    delete: vi.fn(),
  },
}));

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/moderator/categories?tab=categories']}>
      <Phase2Provider>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </Phase2Provider>
    </MemoryRouter>
  );
}

describe('CategoryBrandPage - Delete & Soft-Hide Safeguards (DM-01 & F-145)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permanently deletes a category when it has no referenced products', async () => {
    catalogService.delete.mockResolvedValueOnce(true);

    render(<CategoryBrandPage />, { wrapper: Wrapper });

    expect(await screen.findByText('Phụ kiện mới')).toBeInTheDocument();

    // Click "Xóa" on the first category row
    const deleteBtns = screen.getAllByRole('button', { name: /^Xóa$/i });
    fireEvent.click(deleteBtns[0]);

    // Delete confirmation modal should open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Xác nhận xóa/i })).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận xóa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(catalogService.delete).toHaveBeenCalledWith('category', 'cat-new');
    });

    // Success toast should appear
    expect(await screen.findByText(/Đã xóa vĩnh viễn/i)).toBeInTheDocument();
  });

  it('automatically soft-hides and informs moderator when category has historical references (F-145)', async () => {
    // Simulate 409 Conflict from backend
    const conflictError = new Error('CATEGORY_HAS_PRODUCTS');
    conflictError.status = 409;
    catalogService.delete.mockRejectedValueOnce(conflictError);
    catalogService.hide.mockResolvedValueOnce(true);

    render(<CategoryBrandPage />, { wrapper: Wrapper });

    expect(await screen.findByText('Áo khoác cũ')).toBeInTheDocument();

    const deleteBtns = screen.getAllByRole('button', { name: /^Xóa$/i });
    fireEvent.click(deleteBtns[1]);

    expect(screen.getByRole('heading', { name: /Xác nhận xóa/i })).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận xóa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(catalogService.delete).toHaveBeenCalledWith('category', 'cat-used');
      expect(catalogService.hide).toHaveBeenCalledWith('category', 'cat-used');
    });

    // Toast informing auto-hide according to F-145
    expect(await screen.findByText(/bảo toàn dữ liệu.*F-145/i)).toBeInTheDocument();
  });
});
