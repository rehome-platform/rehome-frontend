import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import { inventoryService } from '../../src/features/moderator/services/warehouseApi.js';

vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({
  default: ({ children }) => <div data-testid="moderator-layout">{children}</div>,
}));

function renderInventory(initialEntry = '/moderator/inventory') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider
        value={{ user: { id: 'mod-1', role: 'MODERATOR', warehouseId: 'wh-1' }, isAuthenticated: true }}
      >
        <Phase2Provider>
          <WarehouseInventoryPage />
        </Phase2Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('WarehouseInventoryPage thumbnail column', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Ảnh as the first column before Sản phẩm, shows thumbnails, opens ImageLightbox on click, and shows fallback when missing', async () => {
    vi.spyOn(inventoryService, 'list').mockResolvedValue({
      items: [
        {
          sku: 'HCM-AK2-000080',
          name: 'Áo kiểu H&M',
          status: 'ON_SALE',
          currentTerm: 1,
          daysIntoTerm: 1,
          currentPrice: 200000,
          thumbnailUrl: 'https://cdn.rehome.test/ao-hm-1.jpg',
          photos: [
            'https://cdn.rehome.test/ao-hm-1.jpg',
            'https://cdn.rehome.test/ao-hm-2.jpg',
          ],
        },
        {
          sku: 'HCM-AK2-000081',
          name: 'Đầm Mango không ảnh',
          status: 'ON_SALE',
          currentTerm: 1,
          daysIntoTerm: 2,
          currentPrice: 400000,
        },
      ],
      totalElements: 2,
      totalPages: 1,
    });

    renderInventory();

    await screen.findByText('Áo kiểu H&M');

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('Ảnh');
    expect(headers[1]).toHaveTextContent('Sản phẩm');

    // First row shows thumbnail in first cell and never leaks raw SKU text
    const firstRow = screen.getByText('Áo kiểu H&M').closest('tr');
    const firstRowCells = within(firstRow).getAllByRole('cell');
    const thumbImg = within(firstRowCells[0]).getByRole('img', { name: 'Áo kiểu H&M' });
    expect(thumbImg).toHaveAttribute('src', 'https://cdn.rehome.test/ao-hm-1.jpg');
    expect(screen.queryByText('HCM-AK2-000080')).not.toBeInTheDocument();

    // Clicking thumbnail opens ImageLightbox with all product photos and zoom controls
    fireEvent.click(thumbImg.closest('button'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Áo kiểu H&M')).toBeInTheDocument();
    expect(within(dialog).getByText('Ảnh 1 / 2')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Phóng to' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Second row without photos shows fallback in first cell
    const secondRow = screen.getByText('Đầm Mango không ảnh').closest('tr');
    const secondRowCells = within(secondRow).getAllByRole('cell');
    expect(within(secondRowCells[0]).getByTestId('inventory-thumb-fallback')).toBeInTheDocument();
  });

  it('falls back gracefully to placeholder when thumbnail image fails to load', async () => {
    vi.spyOn(inventoryService, 'list').mockResolvedValue({
      items: [
        {
          sku: 'HCM-AK2-000082',
          name: 'Quần jeans lỗi ảnh',
          status: 'ON_SALE',
          currentPrice: 300000,
          thumbnailUrl: 'https://cdn.rehome.test/broken.jpg',
        },
      ],
      totalElements: 1,
      totalPages: 1,
    });

    renderInventory();

    const img = await screen.findByRole('img', { name: 'Quần jeans lỗi ảnh' });
    fireEvent.error(img);

    const row = screen.getByText('Quần jeans lỗi ảnh').closest('tr');
    const cells = within(row).getAllByRole('cell');
    expect(within(cells[0]).getByTestId('inventory-thumb-fallback')).toBeInTheDocument();
  });

  it('renders Ảnh column as first column and thumbnail/fallback in DEGRADED tab', async () => {
    vi.spyOn(inventoryService, 'degradedCases').mockResolvedValue([
      {
        id: 'deg-1',
        productId: 'HCM-DEG-001',
        productName: 'Áo khoác xuống cấp',
        receivedAt: '2026-11-20T10:00:00Z',
        moderatorNote: 'Rách tay áo',
        decision: null,
      },
    ]);
    vi.spyOn(inventoryService, 'read').mockResolvedValue({
      sku: 'HCM-DEG-001',
      currentTerm: 1,
      daysIntoTerm: 5,
      currentPrice: 250000,
      photos: ['https://cdn.rehome.test/degraded-1.jpg'],
    });

    renderInventory('/moderator/inventory?status=DEGRADED');

    await screen.findByText('Áo khoác xuống cấp');

    const headers = screen.getAllByRole('columnheader');
    expect(headers[0]).toHaveTextContent('Ảnh');
    expect(headers[1]).toHaveTextContent('Sản phẩm');

    const row = screen.getByText('Áo khoác xuống cấp').closest('tr');
    const cells = within(row).getAllByRole('cell');
    const img = within(cells[0]).getByRole('img', { name: 'Áo khoác xuống cấp' });
    expect(img).toHaveAttribute('src', 'https://cdn.rehome.test/degraded-1.jpg');
  });
});
