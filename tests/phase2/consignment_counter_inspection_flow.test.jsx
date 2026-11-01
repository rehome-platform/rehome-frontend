import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import ConsignmentPrintQueuePage from '../../src/features/moderator/pages/ConsignmentPrintQueuePage.jsx';
import ReceiptPanel from '../../src/features/moderator/components/ReceiptPanel.jsx';
import BrandQuickAddModal from '../../src/features/moderator/components/BrandQuickAddModal.jsx';
import StockInForm from '../../src/features/moderator/components/StockInForm.jsx';

import { counterService, consignmentService, catalogService, inventoryService, skuLabelService } from '../../src/features/moderator/services/warehouseApi.js';
import * as labelDownload from '../../src/features/moderator/services/skuLabelApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

function renderWithProviders(ui, initialRoute = '/') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Phase2Provider>{ui}</Phase2Provider>
      </MemoryRouter>
    </StrictMode>
  );
}

describe('Luồng 2 - Bước 3: Quầy tiếp nhận, Kiểm định tại quầy, Chờ xác nhận, Nhập kho & Hàng đợi in tem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Quầy tiếp nhận (QT-01, QT-02, QT-03)', () => {
    it('tra cứu Member, xác nhận danh tính và hiển thị nút "Bắt đầu kiểm định" cho form ký gửi đã duyệt', async () => {
      const mockMember = {
        memberId: 'MB-004821',
        memberCode: 'MB-004821',
        fullName: 'Lê Minh C',
        phone: '0901234567',
        isIdentityVerified: true,
      };

      vi.spyOn(counterService, 'lookup').mockResolvedValue([mockMember]);
      vi.spyOn(counterService, 'confirm').mockResolvedValue({
        memberId: 'MB-004821',
        accountId: 'MB-004821',
        identityToken: 'token-mb-4821',
        member: mockMember,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      });
      vi.spyOn(counterService, 'tasks').mockResolvedValue({
        pendingForms: [
          {
            formId: 'KG-2026-000123',
            name: 'Áo khoác dạ nữ',
            desiredPrice: 1200000,
            status: 'APPROVED',
          },
        ],
        pendingWithdrawals: [],
        endTermItems: [],
      });

      const user = userEvent.setup();
      renderWithProviders(
        <Routes>
          <Route path="/moderator/counter" element={<CounterPage />} />
          <Route path="/moderator/consignments/:formId" element={<div data-testid="detail-page">Trang kiểm định</div>} />
        </Routes>,
        '/moderator/counter'
      );

      // QT-01: Tìm kiếm
      const searchInput = screen.getByRole('textbox', { name: /Mã Member|Số điện thoại/i }) || document.getElementById('lookup-query-input');
      await user.type(searchInput, 'MB-004821');
      const searchBtn = screen.getByRole('button', { name: /^Tra cứu$/i });
      await user.click(searchBtn);

      // QT-02: Chọn và xác nhận người
      const selectBtn = await screen.findByRole('button', { name: /Chọn Member MB-004821/i });
      await user.click(selectBtn);

      const confirmBtn = await screen.findByRole('button', { name: /Tôi đã đối chiếu đúng Member/i });
      await user.click(confirmBtn);

      // QT-03: Danh sách việc tại quầy có nút "Bắt đầu kiểm định"
      const startInspectBtn = await screen.findByRole('button', { name: /Bắt đầu kiểm định/i });
      expect(startInspectBtn).toBeInTheDocument();
      await user.click(startInspectBtn);

      expect(await screen.findByTestId('detail-page')).toBeInTheDocument();
    });
  });

  describe('2. Màn hình Chờ Member xác nhận trên mobile', () => {
    it('hiển thị spinner, thông báo chờ xác nhận và chặn nút nhập kho khi chưa xác nhận', async () => {
      vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
        receiptId: 'KG-2026-000127',
        receiptNo: 'KG-2026-000127',
        confirmedAt: null, // Chưa xác nhận
        agreedPrice: 850000,
        floorPrice: 425000,
        termLengthDays: 30,
        commissionRateTerm1: 0.1,
      });

      renderWithProviders(<ReceiptPanel receiptId="KG-2026-000127" allowStockIn />);

      expect(await screen.findByText(/Đang chờ khách xác nhận biên nhận/i)).toBeInTheDocument();
      expect(screen.getByText(/Chưa nhập kho được cho tới khi khách xác nhận/i)).toBeInTheDocument();
      expect(screen.getByText(/Giá bán thỏa thuận:/i)).toBeInTheDocument();
      expect(screen.getByText(/850\.000/)).toBeInTheDocument();
      expect(screen.getByText(/Giá sàn tự tính \(50%\):/i)).toBeInTheDocument();
      expect(screen.getByText(/425\.000/)).toBeInTheDocument();

      const stockInBtn = screen.getByRole('button', { name: /Nhập kho — chờ khách xác nhận/i });
      expect(stockInBtn).toBeDisabled();
    });

    it('hiển thị trạng thái đã xác nhận và mở form nhập kho khi member đã xác nhận', async () => {
      vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
        receiptId: 'KG-2026-000127',
        receiptNo: 'KG-2026-000127',
        confirmedAt: '2026-11-01T09:46:00Z',
        agreedPrice: 850000,
        floorPrice: 425000,
        termLengthDays: 30,
      });
      vi.spyOn(catalogService, 'list').mockResolvedValue({ categories: [], brands: [] });
      vi.spyOn(inventoryService, 'byReceipt').mockResolvedValue(null);

      renderWithProviders(<ReceiptPanel receiptId="KG-2026-000127" allowStockIn />);

      const confirmedStatuses = await screen.findAllByText(/xác nhận/i);
      expect(confirmedStatuses.length).toBeGreaterThan(0);
      expect(screen.getByText(/Nhập thông tin sản phẩm và nhập kho/i)).toBeInTheDocument();
    });
  });

  describe('3. Nhập kho & Thêm nhanh thương hiệu ', () => {
    it('hiển thị slot thử đồ AI khi chọn danh mục quần áo, và khối không cần tách nền khi chọn danh mục khác', async () => {
      vi.spyOn(consignmentService, 'receipt').mockResolvedValue({ id: 'rcpt-test', confirmedAt: '2026-11-01T10:00:00Z' });
      vi.spyOn(catalogService, 'list').mockResolvedValue({
        categories: [
          { id: 'cat-coat', name: 'Áo khoác', tryonSlot: 'TOP', hidden: false },
          { id: 'cat-bag', name: 'Túi xách', tryonSlot: 'NONE', hidden: false },
        ],
        brands: [{ id: 'b1', name: 'Uniqlo', hidden: false }],
      });
      vi.spyOn(inventoryService, 'byReceipt').mockResolvedValue(null);

      const user = userEvent.setup();
      renderWithProviders(
        <StockInForm
          receipt={{ receiptId: 'rcpt-test', confirmedAt: '2026-11-01T10:00:00Z', agreedPrice: 850000 }}
          onSuccess={vi.fn()}
        />
      );

      const catSelect = await screen.findByLabelText(/Danh mục/i);

      // Chọn Áo khoác -> Hiện Slot thử đồ AI
      await user.selectOptions(catSelect, 'cat-coat');
      expect(await screen.findByText(/Ảnh dùng cho thử đồ AI/i)).toBeInTheDocument();
      expect(screen.getByText(/Ảnh dùng cho thử đồ AI · SLOT ÁO/i)).toBeInTheDocument();

      // Đổi sang Túi xách -> Hiện Không cần tách nền
      await user.selectOptions(catSelect, 'cat-bag');
      expect(await screen.findByText(/Không cần tách nền/i)).toBeInTheDocument();
      expect(screen.getByText(/Không cần tách nền · KHÔNG CÓ SLOT/i)).toBeInTheDocument();
    });

    it('BrandQuickAddModal: phát hiện trùng tên thương hiệu và vô hiệu hóa nút Lưu ', async () => {
      const existingBrands = [{ id: 'b1', name: 'Uniqlo' }, { id: 'b2', name: 'Zara' }];
      const onClose = vi.fn();
      const onCreated = vi.fn();

      const user = userEvent.setup();
      renderWithProviders(
        <BrandQuickAddModal
          isOpen={true}
          existingBrands={existingBrands}
          onClose={onClose}
          onCreated={onCreated}
        />
      );

      const nameInput = screen.getByPlaceholderText(/VD: Uniqlo, Zara/i);
      const submitBtn = screen.getByRole('button', { name: /Lưu thương hiệu/i });

      // Nhập tên trùng "uniqlo" (case-insensitive)
      await user.type(nameInput, 'uniqlo');
      expect(
        await screen.findByText(/Thương hiệu này đã có trong danh mục, chọn "Uniqlo" ở ô Thương hiệu/i)
      ).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();

      // Đổi tên thành thương hiệu mới "Calvin Klein"
      await user.clear(nameInput);
      await user.type(nameInput, 'Calvin Klein');
      expect(
        screen.queryByText(/Thương hiệu này đã có trong danh mục/i)
      ).not.toBeInTheDocument();
      expect(submitBtn).toBeEnabled();
    });
  });

  describe('4. Hàng đợi in tem  ', () => {
    it('hiển thị danh sách tem chờ in, xem trước tem 70x37mm, cập nhật bộ đếm và tải PDF', async () => {
      let items = [{ sku: 'Q7-AK-000846', name: 'Áo khoác', brandName: 'Zara', warehouseName: 'KHO QUẬN 7' }];
      vi.spyOn(skuLabelService, 'list').mockImplementation(async () => items);
      const pdf = vi.spyOn(skuLabelService, 'pdf').mockResolvedValue(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
      vi.spyOn(skuLabelService, 'markPrinted').mockImplementation(async () => { items = []; });
      vi.spyOn(labelDownload, 'downloadLabelPdf').mockImplementation(() => {});
      const user = userEvent.setup();
      renderWithProviders(<ConsignmentPrintQueuePage />);

      expect(screen.getByRole('heading', { name: 'Hàng đợi in tem' })).toBeInTheDocument();
      await user.click(await screen.findByRole('checkbox', { name: 'Chọn Q7-AK-000846' }));
      expect(screen.getByText(/đã chọn 1 \/ 1 món/i)).toBeInTheDocument();
      expect(screen.getByText(/Xem trước một tem · 70 × 37 mm/i)).toBeInTheDocument();
      expect(screen.getByText(/REHOME · KHO QUẬN 7/i)).toBeInTheDocument();
      expect(screen.getByText(/Bố cục tờ in/i)).toBeInTheDocument();

      const downloadBtn = screen.getByRole('button', { name: /Tải PDF 1 tem/i });
      await user.click(downloadBtn);

      // Sau khi tải xong, hiển thị thông báo và các món đã in rời hàng đợi
      await waitFor(() => {
        expect(screen.getByText(/Đã tải PDF 1 tem và cập nhật hàng đợi/i)).toBeInTheDocument();
      }, { timeout: 2000 });
      expect(pdf).toHaveBeenCalledWith(['Q7-AK-000846'], expect.anything());
    });
  });
});
