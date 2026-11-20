import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../../src/context/AuthContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import InventoryDetailPage from '../../src/features/moderator/pages/InventoryDetailPage.jsx';
import { inventoryService } from '../../src/features/moderator/services/warehouseApi.js';
import { returnService } from '../../src/features/moderator/services/returnApi.js';

function renderWithAuth(ui, initialEntry = '/moderator/inventory') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthContext.Provider
        value={{ user: { id: 'mod-1', role: 'MODERATOR', warehouseId: 'wh-1' }, isAuthenticated: true }}
      >
        <Phase2Provider>{ui}</Phase2Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

describe('Task 5: Returned item ("Đã bàn giao") management in WarehouseInventoryPage & InventoryDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('WarehouseInventoryPage includes "Đã bàn giao" tab querying status RETURNED, distinguishes ownership, and supports relist with double-submit protection', async () => {
    const returnedPendingItem = {
      id: 'RH-RET-01',
      sku: 'RH-RET-01',
      name: 'Áo khoác dạ trả về',
      status: 'RETURNED',
      pendingReturnRequestId: 'ret-uuid-01',
      currentTerm: 1,
      daysIntoTerm: 8,
      termLengthDays: 30,
      currentPrice: 450000,
    };
    const returnedLostItem = {
      id: 'RH-RET-LOST',
      sku: 'RH-RET-LOST',
      name: 'Váy trả thất lạc',
      status: 'RETURNED',
      currentTerm: 1,
      daysIntoTerm: 4,
      termLengthDays: 30,
      currentPrice: 320000,
    };
    const pendingReturn = {
      id: 'ret-uuid-01',
      code: 'YC-RET01',
      sku: 'RH-RET-01',
      productId: 'RH-RET-01',
      itemName: 'Áo khoác dạ trả về',
      status: 'RESOLVED',
      rawStatus: 'VALID',
      itemAction: null,
      outcome: null,
      degraded: false,
      amount: 450000,
      refundAmount: 450000,
    };

    const listSpy = vi.spyOn(inventoryService, 'list').mockResolvedValue({
      content: [returnedPendingItem, returnedLostItem],
      items: [returnedPendingItem, returnedLostItem],
      totalElements: 2,
      totalPages: 1,
    });
    const actionSpy = vi.spyOn(returnService, 'applyItemAction').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ id: 'ret-uuid-01', status: 'VALID', itemAction: 'RELIST' }), 30))
    );

    renderWithAuth(<WarehouseInventoryPage />);

    // Renders "Chờ phân loại hoàn" tab & queries status: 'RETURNED'
    const returnedTab = await screen.findByRole('button', { name: 'Chờ phân loại hoàn' });
    fireEvent.click(returnedTab);
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'RETURNED' }), expect.anything());
    });

    // Pending row shows Chờ phân loại hoàn + Chờ chọn phương án xử lý + Đăng bán lại, and NOT Tài sản nền tảng
    const pendingRow = (await screen.findByText('Áo khoác dạ trả về')).closest('tr');
    expect(within(pendingRow).getByText('Chờ phân loại hoàn')).toBeInTheDocument();
    expect(within(pendingRow).getByText('Chờ chọn phương án xử lý')).toBeInTheDocument();
    expect(within(pendingRow).queryByText(/Tài sản nền tảng/i)).not.toBeInTheDocument();
    const relistBtn = within(pendingRow).getByRole('button', { name: 'Đăng bán lại' });

    // Non-pending RETURNED row (e.g. LOST) does NOT expose Đăng bán lại or pending indicator
    const lostRow = screen.getByText('Váy trả thất lạc').closest('tr');
    expect(within(lostRow).getByText('Chờ phân loại hoàn')).toBeInTheDocument();
    expect(within(lostRow).queryByText('Chờ chọn phương án xử lý')).not.toBeInTheDocument();
    expect(within(lostRow).queryByRole('button', { name: 'Đăng bán lại' })).not.toBeInTheDocument();

    // Open relist modal, select single option, double-click confirm -> single applyItemAction call
    fireEvent.click(relistBtn);
    await screen.findByText(/Chọn phương án xử lý món hàng/i);
    expect(screen.queryByText(/Hoàn trả cho người ký gửi/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Đăng bán lại \(Đăng bán liền\)/i));

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận xử lý' });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(actionSpy).toHaveBeenCalledTimes(1);
    });
    expect(actionSpy).toHaveBeenCalledWith('ret-uuid-01', 'RELIST');
  });

  it('InventoryDetailPage supports Đăng bán lại on RETURNED items with pending return and preserves ownership distinction', async () => {
    const productReturned = {
      id: 'RH-RET-02',
      sku: 'RH-RET-02',
      name: 'Đầm midi lụa',
      status: 'RETURNED',
      pendingReturnRequestId: 'ret-uuid-02',
      photos: [],
      allowedActions: [],
      currentPrice: 500000,
    };
    const pendingReturn = {
      id: 'ret-uuid-02',
      code: 'YC-RET02',
      sku: 'RH-RET-02',
      productId: 'RH-RET-02',
      itemName: 'Đầm midi lụa',
      status: 'RESOLVED',
      rawStatus: 'VALID',
      itemAction: null,
      outcome: null,
      degraded: false,
      amount: 500000,
    };

    const readSpy = vi.spyOn(inventoryService, 'read').mockResolvedValue(productReturned);
    vi.spyOn(inventoryService, 'degradedCases').mockResolvedValue([]);
    const actionSpy = vi.spyOn(returnService, 'applyItemAction').mockResolvedValue({
      id: 'ret-uuid-02',
      status: 'VALID',
      itemAction: 'RELIST',
    });

    renderWithAuth(
      <Routes>
        <Route path="/moderator/inventory/:sku" element={<InventoryDetailPage />} />
      </Routes>,
      '/moderator/inventory/RH-RET-02'
    );

    await screen.findByText('Đầm midi lụa');
    expect(screen.getAllByText('Chờ phân loại hoàn').length).toBeGreaterThan(0);
    expect(screen.getByText(/không thuộc sở hữu nền tảng/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem yêu cầu trả hàng/i })).toHaveAttribute(
      'href',
      '/moderator/returns?id=ret-uuid-02'
    );

    // Relist button triggers ReturnOutcomeDialog -> applyItemAction('ret-uuid-02', 'RELIST') -> refreshes to ON_SALE
    readSpy.mockResolvedValue({ ...productReturned, status: 'ON_SALE' });
    fireEvent.click(screen.getByRole('button', { name: /^Đăng bán lại$/i }));
    await screen.findByText(/Chọn phương án xử lý món hàng/i);
    fireEvent.click(screen.getByText(/Đăng bán lại \(Đăng bán liền\)/i));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xử lý' }));

    await waitFor(() => {
      expect(actionSpy).toHaveBeenCalledWith('ret-uuid-02', 'RELIST');
    });
    await screen.findByText('Đang bán');
  });

  it('InventoryDetailPage allows opening Hàng xuống cấp on RETURNED items (Option C): keeps modal on BE 409 and refreshes to WAREHOUSE on BE 200', async () => {
    const productReturned = {
      id: 'RH-RET-03',
      sku: 'RH-RET-03',
      name: 'Túi xách da',
      status: 'RETURNED',
      photos: [],
      allowedActions: [],
      currentPrice: 700000,
    };

    const readSpy = vi.spyOn(inventoryService, 'read').mockResolvedValue(productReturned);
    vi.spyOn(inventoryService, 'degradedCases').mockResolvedValue([]);
    vi.spyOn(inventoryService, 'upload').mockResolvedValue({ url: 'https://photos.test/deg.jpg' });
    vi.spyOn(returnService, 'findPendingDispositionBySku').mockResolvedValue(null);
    const degradedSpy = vi
      .spyOn(returnService, 'createDegradedCase')
      .mockRejectedValueOnce(
        Object.assign(new Error('Chỉ mở ca xử lý hàng xuống cấp cho sản phẩm đang bán.'), {
          status: 409,
          code: 'DEGRADED_ITEM_CASE_PRODUCT_NOT_ON_SALE',
        })
      )
      .mockResolvedValueOnce({ id: 'case-ret-1', productId: 'RH-RET-03', status: 'PENDING_DECISION' });

    renderWithAuth(
      <Routes>
        <Route path="/moderator/inventory/:sku" element={<InventoryDetailPage />} />
      </Routes>,
      '/moderator/inventory/RH-RET-03'
    );

    await screen.findByText('Túi xách da');
    // Without pending VALID return, Đăng bán lại is hidden, while Hàng xuống cấp is available
    expect(screen.queryByRole('button', { name: /^Đăng bán lại$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Hàng xuống cấp$/i }));
    fireEvent.change(screen.getByPlaceholderText(/VD: Sản phẩm/i), {
      target: { value: 'Trầy xước khi hoàn hàng' },
    });
    const fileInput = document.querySelector('input[type=file][accept="image/*"]');
    fireEvent.change(fileInput, { target: { files: [new File(['a'], 'deg.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /Gửi đề xuất cho/i })).toBeEnabled());

    // Attempt 1: backend returns 409 -> modal stays open, surfaces error, no fake frontend status
    fireEvent.click(screen.getByRole('button', { name: /Gửi đề xuất cho/i }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Chỉ mở ca xử lý hàng xuống cấp'));
    });
    expect(screen.getByRole('button', { name: /Gửi đề xuất cho/i })).toBeInTheDocument();

    // Attempt 2: backend Option C deployed -> succeeds and refreshes product status to WAREHOUSE
    readSpy.mockResolvedValue({ ...productReturned, status: 'WAREHOUSE' });
    fireEvent.click(screen.getByRole('button', { name: /Gửi đề xuất cho/i }));
    await waitFor(() => {
      expect(degradedSpy).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getAllByText(/Lưu kho, tạm ngừng bán/i).length).toBeGreaterThan(0);
    });
  });
});
