import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CategoryBrandPage from '../../src/features/moderator/pages/CategoryBrandPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

const mockCategories = vi.hoisted(() => [
  { id: 'c1', name: 'Áo sơ mi', slot: 'TOP', tryonSlot: 'TOP', hidden: false, status: 'ACTIVE' },
  { id: 'c2', name: 'Quần jeans', slot: 'BOTTOM', tryonSlot: 'BOTTOM', hidden: false, status: 'ACTIVE' },
  { id: 'c3', name: 'Đầm dạ hội', slot: 'DRESS', tryonSlot: 'DRESS', hidden: true, status: 'HIDDEN' },
  { id: 'c4', name: 'Áo len', slot: 'TOP', tryonSlot: 'TOP', hidden: true, status: 'HIDDEN' },
]);

vi.mock('../../src/features/moderator/services/warehouseApi.js', () => ({
  catalogService: {
    list: vi.fn().mockResolvedValue({
      categories: mockCategories,
      brands: [{ id: 'b1', name: 'Zara', hidden: false, status: 'ACTIVE' }],
    }),
    save: vi.fn().mockResolvedValue(true),
    hide: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
  },
}));

function Wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/moderator/categories?tab=categories']}>
      <Phase2Provider>{children}</Phase2Provider>
    </MemoryRouter>
  );
}

describe('CategoryBrandPage - Multi-dimensional Filter (DM-01)', () => {
  it('filters categories by TryOn Slot (TOP, BOTTOM, DRESS)', async () => {
    render(<CategoryBrandPage />, { wrapper: Wrapper });

    // Initial render should show all 4 categories
    expect(await screen.findByText('Áo sơ mi')).toBeInTheDocument();
    expect(screen.getByText('Quần jeans')).toBeInTheDocument();
    expect(screen.getByText('Đầm dạ hội')).toBeInTheDocument();
    expect(screen.getByText('Áo len')).toBeInTheDocument();

    // Filter by slot = TOP
    const slotSelect = screen.getByLabelText(/Lọc slot thử đồ|Slot thử đồ AI/i);
    fireEvent.change(slotSelect, { target: { value: 'TOP' } });

    expect(screen.getByText('Áo sơ mi')).toBeInTheDocument();
    expect(screen.getByText('Áo len')).toBeInTheDocument();
    expect(screen.queryByText('Quần jeans')).not.toBeInTheDocument();
    expect(screen.queryByText('Đầm dạ hội')).not.toBeInTheDocument();
  });

  it('filters categories by Status (ACTIVE vs HIDDEN)', async () => {
    render(<CategoryBrandPage />, { wrapper: Wrapper });

    await screen.findByText('Áo sơ mi');

    // Filter by status = ACTIVE (Hiện)
    const statusSelect = screen.getByLabelText(/Lọc trạng thái/i);
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    expect(screen.getByText('Áo sơ mi')).toBeInTheDocument();
    expect(screen.getByText('Quần jeans')).toBeInTheDocument();
    expect(screen.queryByText('Đầm dạ hội')).not.toBeInTheDocument();
    expect(screen.queryByText('Áo len')).not.toBeInTheDocument();

    // Filter by status = HIDDEN (Đã ẩn)
    fireEvent.change(statusSelect, { target: { value: 'HIDDEN' } });
    expect(screen.queryByText('Áo sơ mi')).not.toBeInTheDocument();
    expect(screen.queryByText('Quần jeans')).not.toBeInTheDocument();
    expect(screen.getByText('Đầm dạ hội')).toBeInTheDocument();
    expect(screen.getByText('Áo len')).toBeInTheDocument();
  });

  it('filters categories simultaneously by Keyword, Slot, and Status', async () => {
    render(<CategoryBrandPage />, { wrapper: Wrapper });

    await screen.findByText('Áo sơ mi');

    const searchInput = screen.getByPlaceholderText(/Tìm danh mục/i);
    const slotSelect = screen.getByLabelText(/Lọc slot thử đồ|Slot thử đồ AI/i);
    const statusSelect = screen.getByLabelText(/Lọc trạng thái/i);

    fireEvent.change(searchInput, { target: { value: 'Áo' } });
    fireEvent.change(slotSelect, { target: { value: 'TOP' } });
    fireEvent.change(statusSelect, { target: { value: 'HIDDEN' } });

    expect(screen.getByText('Áo len')).toBeInTheDocument();
    expect(screen.queryByText('Áo sơ mi')).not.toBeInTheDocument();
    expect(screen.queryByText('Quần jeans')).not.toBeInTheDocument();
    expect(screen.queryByText('Đầm dạ hội')).not.toBeInTheDocument();
  });
});
