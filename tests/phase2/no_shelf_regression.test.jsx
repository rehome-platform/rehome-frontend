import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  inventoryQuery,
  inventoryResult,
  inventoryDetail,
  productPayload,
} from '../../src/features/moderator/models/inventoryApiModel.js';
import {
  normalizeUnclaimedItem,
  filterUnclaimedItems,
} from '../../src/features/moderator/models/endTermModel.js';
import { normalizePackingOrder } from '../../src/features/moderator/models/packingModel.js';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import EndOfTermPage from '../../src/features/moderator/pages/EndOfTermPage.jsx';
import StockInForm from '../../src/features/moderator/components/StockInForm.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import {
  catalogService,
  consignmentService,
  endTermService,
  inventoryService,
} from '../../src/features/moderator/services/warehouseApi.js';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

function Wrapper({ children }) {
  return (
    <MemoryRouter>
      <Phase2Provider>{children}</Phase2Provider>
    </MemoryRouter>
  );
}

describe('Phase 2 No-Shelf Regression', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('inventoryApiModel does not read, write, or emit shelf, shelfLocation, or CHANGE_SHELF', () => {
    const query = inventoryQuery({
      status: 'ON_SALE',
      shelf: 'A1-02',
      shelfLocation: 'A1-02',
      page: 1,
      size: 10,
    });
    expect(query).toEqual({ status: 'ON_SALE', page: 1, size: 10 });
    expect(query).not.toHaveProperty('shelf');
    expect(query).not.toHaveProperty('shelfLocation');

    const result = inventoryResult({
      content: [
        {
          id: 'Q7-AO-001',
          name: 'Áo sơ mi',
          status: 'ON_SALE',
          allowedActions: ['CHANGE_SHELF', 'RE_CONSIGN'],
        },
      ],
    });
    expect(result.items[0]).not.toHaveProperty('shelfLocation');
    expect(result.items[0]).not.toHaveProperty('shelf');
    expect(result.items[0].allowedActions).not.toContain('CHANGE_SHELF');

    const detail = inventoryDetail(
      {
        id: 'Q7-AO-001',
        name: 'Áo sơ mi',
        status: 'ON_SALE',
        allowedActions: ['CHANGE_SHELF'],
      },
      'Q7-AO-001',
    );
    expect(detail).not.toHaveProperty('shelfLocation');
    expect(detail).not.toHaveProperty('shelf');
    expect(detail.allowedActions).not.toContain('CHANGE_SHELF');

    const payload = productPayload({
      receiptId: 'rcpt-1',
      name: 'Áo sơ mi',
      size: 'M',
      shelfLocation: 'A1-02',
      shelf: 'A1-02',
      photoUrls: ['https://cdn.rehome.test/1.jpg'],
    });
    expect(payload).not.toHaveProperty('shelfLocation');
    expect(payload).not.toHaveProperty('shelf');
  });

  it('endTermModel does not read, write, or emit shelfLocation or filter by shelf', () => {
    const item = normalizeUnclaimedItem({
      id: 'Q7-AK-001',
      name: 'Áo khoác dạ',
      status: 'UNCLAIMED',
    });
    expect(item).not.toHaveProperty('shelfLocation');
    expect(item).not.toHaveProperty('shelf');

    const items = [
      { sku: 'Q7-AK-001', name: 'Áo khoác dạ', shelfLocation: 'A1-01' },
      { sku: 'Q7-QJ-002', name: 'Quần jeans', shelfLocation: 'B2-05' },
    ];
    expect(filterUnclaimedItems(items, 'A1-01')).toEqual([]);
    expect(filterUnclaimedItems(items, 'Q7-AK-001')).toHaveLength(1);
    expect(filterUnclaimedItems(items, 'jeans')).toHaveLength(1);
  });

  it('packingModel does not emit shelfLocation or shelf on normalized packing items', () => {
    const order = normalizePackingOrder({
      id: 'order-1',
      status: 'PAID',
      items: [
        {
          productId: 'Q7-AO-001',
          name: 'Áo sơ mi',
          size: 'M',
          shelfLocation: 'A1-02',
          shelf: 'A1-02',
        },
      ],
    });
    expect(order.items[0]).not.toHaveProperty('shelfLocation');
    expect(order.items[0]).not.toHaveProperty('shelf');
  });

  it('WarehouseInventoryPage renders without shelf filters, columns, or placeholders and searches by SKU/name', async () => {
    const listSpy = vi.spyOn(inventoryService, 'list').mockResolvedValue({
      items: [
        { sku: 'Q7-AO-001', name: 'Áo sơ mi trắng', status: 'ON_SALE', currentPrice: 120000 },
      ],
      totalElements: 1,
      totalPages: 1,
    });

    render(<WarehouseInventoryPage />, { wrapper: Wrapper });

    await screen.findByText('Q7-AO-001');
    expect(screen.queryByText(/vị trí kệ/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/kệ/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /kệ|vị trí/i })).not.toBeInTheDocument();

    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText(/RH-M4T19B/i);
    await user.type(searchInput, 'Q7-AO-001');

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'Q7-AO-001' }),
        expect.anything(),
      );
    });
  });

  it('EndOfTermPage renders without shelf placeholders or columns and searches by SKU/name', async () => {
    const items = [
      { id: 'Q7-AK-001', sku: 'Q7-AK-001', name: 'Áo khoác dạ', status: 'UNCLAIMED' },
      { id: 'Q7-QJ-002', sku: 'Q7-QJ-002', name: 'Quần jeans', status: 'UNCLAIMED' },
    ];
    vi.spyOn(endTermService, 'list').mockResolvedValue({
      items,
      content: items,
      totalElements: 2,
      totalPages: 1,
    });

    render(<EndOfTermPage />, { wrapper: Wrapper });

    await screen.findByText('Q7-AK-001');
    expect(screen.queryByPlaceholderText(/kệ|vị trí/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chưa gán vị trí/i)).not.toBeInTheDocument();

    const user = userEvent.setup();
    const searchInput = screen.getByPlaceholderText(/Tìm theo mã SKU hoặc tên sản phẩm/i);
    await user.type(searchInput, 'Q7-QJ-002');

    expect(screen.queryByText('Q7-AK-001')).not.toBeInTheDocument();
    expect(screen.getByText('Q7-QJ-002')).toBeInTheDocument();
  });

  it('StockInForm payload does not include shelfLocation or shelf', async () => {
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      id: 'rcpt-uuid-99',
      confirmedAt: '2026-10-26T12:00:00Z',
    });
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [{ id: 'cat-1', name: 'Áo', hidden: false }],
      brands: [{ id: 'brand-1', name: 'Zara', hidden: false }],
    });
    vi.spyOn(inventoryService, 'upload').mockResolvedValue({
      url: 'https://cdn.rehome.test/p1.jpg',
    });
    const createSpy = vi.spyOn(inventoryService, 'create').mockResolvedValue({
      id: 'Q7-AO-000001',
      sku: 'Q7-AO-000001',
      name: 'Áo thun cotton',
      status: 'ON_SALE',
    });

    const user = userEvent.setup();
    render(
      <StockInForm receipt={{ id: 'rcpt-uuid-99', confirmedAt: '2026-10-26T12:00:00Z' }} />,
      { wrapper: Wrapper },
    );

    await user.type(await screen.findByLabelText('Tên sản phẩm'), 'Áo thun cotton');
    await user.type(screen.getByLabelText('Size'), 'L');
    await user.selectOptions(screen.getByLabelText('Danh mục'), 'cat-1');
    await user.selectOptions(screen.getByLabelText('Thương hiệu'), 'brand-1');

    const file = new File(['photo'], 'shirt.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), file);
    await screen.findByText('shirt.png · Đã tải ảnh gốc');

    await user.click(screen.getByRole('button', { name: 'Nhập kho · tạo SKU' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });
    const submittedPayload = createSpy.mock.calls[0][0];
    expect(submittedPayload).not.toHaveProperty('shelfLocation');
    expect(submittedPayload).not.toHaveProperty('shelf');
  });
});
