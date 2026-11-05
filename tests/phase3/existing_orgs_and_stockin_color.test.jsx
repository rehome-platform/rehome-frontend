import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StockInForm, { COMMON_COLORS } from '../../src/features/moderator/components/StockInForm.jsx';
import { ExistingOrganizationsSection } from '../../src/features/moderator/components/verification/ExistingOrganizationsSection.jsx';
import { catalogService, consignmentService, inventoryService } from '../../src/features/moderator/services/warehouseApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { BrowserRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho A' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

function Wrapper({ children }) {
  return (
    <BrowserRouter>
      <Phase2Provider>{children}</Phase2Provider>
    </BrowserRouter>
  );
}

describe('StockInForm - Color Dropdown & Custom Color Input', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(consignmentService, 'receipt').mockResolvedValue({
      id: 'rcpt-test-1',
      confirmedAt: '2026-11-05T10:00:00Z',
      agreedPrice: 250000,
    });
    vi.spyOn(catalogService, 'list').mockResolvedValue({
      categories: [{ id: 'cat-1', name: 'Áo', hidden: false }],
      brands: [{ id: 'brand-1', name: 'Zara', hidden: false }],
    });
    vi.spyOn(inventoryService, 'upload').mockResolvedValue({
      url: 'https://cdn.rehome.test/photo.jpg',
    });
  });

  it('renders common colors dropdown and does not show manual text input by default', async () => {
    render(
      <StockInForm receipt={{ id: 'rcpt-test-1', confirmedAt: '2026-11-05T10:00:00Z' }} />,
      { wrapper: Wrapper }
    );

    const colorSelect = await screen.findByLabelText('Màu sắc');
    expect(colorSelect.tagName).toBe('SELECT');

    // Check that preset colors exist in options
    expect(screen.getByRole('option', { name: 'Đen' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Trắng' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Khác (nhập tay)' })).toBeInTheDocument();

    // Custom input should not be visible
    expect(screen.queryByLabelText('Nhập màu sắc khác')).not.toBeInTheDocument();
  });

  it('shows manual text input when "Khác" is selected and sends custom color on submit', async () => {
    const createSpy = vi.spyOn(inventoryService, 'create').mockResolvedValue({
      id: 'SKU-001',
      sku: 'SKU-001',
      name: 'Áo sơ mi lụa',
      status: 'ON_SALE',
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(
      <StockInForm
        receipt={{ id: 'rcpt-test-1', confirmedAt: '2026-11-05T10:00:00Z' }}
        onSuccess={onSuccess}
      />,
      { wrapper: Wrapper }
    );

    await user.type(await screen.findByLabelText('Tên sản phẩm'), 'Áo sơ mi lụa');
    await user.type(screen.getByLabelText('Vị trí kệ'), 'B2-01');
    await user.selectOptions(screen.getByLabelText('Danh mục'), 'cat-1');
    await user.selectOptions(screen.getByLabelText('Thương hiệu'), 'brand-1');

    // Select "Khác"
    const colorSelect = screen.getByLabelText('Màu sắc');
    await user.selectOptions(colorSelect, 'Khác');

    // Custom text input should appear
    const customColorInput = await screen.findByLabelText('Nhập màu sắc khác');
    expect(customColorInput).toBeInTheDocument();
    await user.type(customColorInput, 'Xanh pastel ánh kim');

    // Upload a photo to make valid
    const file = new File(['dummy'], 'shirt.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), file);
    await screen.findByText('shirt.png · Đã tải ảnh gốc');

    const submitBtn = screen.getByRole('button', { name: 'Nhập kho · tạo SKU' });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'Xanh pastel ánh kim',
        }),
        expect.anything()
      );
    });
  });

  it('selects preset color directly without opening custom input and submits preset color', async () => {
    const createSpy = vi.spyOn(inventoryService, 'create').mockResolvedValue({
      id: 'SKU-002',
      sku: 'SKU-002',
      name: 'Váy dạ hội',
      status: 'ON_SALE',
    });
    const user = userEvent.setup();

    render(
      <StockInForm receipt={{ id: 'rcpt-test-1', confirmedAt: '2026-11-05T10:00:00Z' }} />,
      { wrapper: Wrapper }
    );

    await user.type(await screen.findByLabelText('Tên sản phẩm'), 'Váy dạ hội');
    await user.type(screen.getByLabelText('Vị trí kệ'), 'C1-03');
    await user.selectOptions(screen.getByLabelText('Danh mục'), 'cat-1');
    await user.selectOptions(screen.getByLabelText('Thương hiệu'), 'brand-1');

    // Select preset "Đỏ"
    const colorSelect = screen.getByLabelText('Màu sắc');
    await user.selectOptions(colorSelect, 'Đỏ');

    // Custom input should still NOT be in document
    expect(screen.queryByLabelText('Nhập màu sắc khác')).not.toBeInTheDocument();

    const file = new File(['dummy'], 'dress.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Ảnh sản phẩm'), file);
    await screen.findByText('dress.png · Đã tải ảnh gốc');

    const submitBtn = screen.getByRole('button', { name: 'Nhập kho · tạo SKU' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'Đỏ',
        }),
        expect.anything()
      );
    });
  });
});

describe('ExistingOrganizationsSection - Existing Organizations Tab', () => {
  const sampleOrgs = [
    {
      id: 'ORG-001',
      displayName: 'Quỹ Hy Vọng Xanh',
      legalName: 'Quỹ Từ Thiện Hy Vọng Xanh',
      description: 'Hỗ trợ đồng bào vùng cao và cứu trợ bão lũ',
      orgType: 'Quỹ từ thiện',
      operationScope: 'Toàn quốc',
      taxCode: '0312998877',
      representative: 'Trần Văn Hưng',
      phone: '028 3822 6858',
      email: 'contact@hyvongxanh.org',
      donationPointName: 'Trụ sở Quận 1',
      donationPointAddress: '120 Hai Bà Trưng, Quận 1, TP.HCM',
      donationPointReceivingHours: '08:00 - 17:00',
      verifiedAt: '2026-02-15T00:00:00Z',
    },
    {
      id: 'ORG-002',
      displayName: 'Mái Ấm Hướng Dương',
      legalName: 'Cơ Sở Bảo Trợ Hướng Dương',
      description: 'Nuôi dạy trẻ em cơ nhỡ',
      orgType: 'Cơ sở trợ giúp xã hội',
      operationScope: 'TP.HCM',
      taxCode: 'không có',
      representative: 'Nguyễn Thị Hoa',
      phone: '028 3844 1200',
      email: 'maiam@huongduong.org',
      donationPointName: 'Kho tiếp nhận Bình Tân',
      donationPointAddress: '124 Mã Lò, Bình Tân, TP.HCM',
      donationPointReceivingHours: '08:30 - 18:00',
      verifiedAt: '2026-03-20T00:00:00Z',
    },
  ];

  it('renders list of existing organizations with proper details and badges', () => {
    render(<ExistingOrganizationsSection existingOrgs={sampleOrgs} loading={false} />);

    expect(screen.getByText('Quỹ Hy Vọng Xanh')).toBeInTheDocument();
    expect(screen.getByText('Quỹ Từ Thiện Hy Vọng Xanh')).toBeInTheDocument();
    expect(screen.getByText('0312998877')).toBeInTheDocument();
    expect(screen.getByText('Mái Ấm Hướng Dương')).toBeInTheDocument();
    expect(screen.getAllByText('Đang hoạt động')).toHaveLength(2);
  });

  it('filters organizations by search keyword', async () => {
    const user = userEvent.setup();
    render(<ExistingOrganizationsSection existingOrgs={sampleOrgs} loading={false} />);

    const searchInput = screen.getByPlaceholderText(/Tìm theo tên tổ chức/i);
    await user.type(searchInput, 'Hướng Dương');

    expect(screen.getByText('Mái Ấm Hướng Dương')).toBeInTheDocument();
    expect(screen.queryByText('Quỹ Hy Vọng Xanh')).not.toBeInTheDocument();
  });

  it('filters organizations by type dropdown', async () => {
    const user = userEvent.setup();
    render(<ExistingOrganizationsSection existingOrgs={sampleOrgs} loading={false} />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'Cơ sở trợ giúp xã hội');

    expect(screen.getByText('Mái Ấm Hướng Dương')).toBeInTheDocument();
    expect(screen.queryByText('Quỹ Hy Vọng Xanh')).not.toBeInTheDocument();
  });

  it('opens and closes organization detail modal on "Xem hồ sơ" click', async () => {
    const user = userEvent.setup();
    render(<ExistingOrganizationsSection existingOrgs={sampleOrgs} loading={false} />);

    const viewButtons = screen.getAllByRole('button', { name: /Xem hồ sơ/i });
    await user.click(viewButtons[0]);

    // Modal title & content should appear
    expect(screen.getByText('Chi tiết hồ sơ tổ chức hiện hữu')).toBeInTheDocument();
    expect(screen.getByText('Hỗ trợ đồng bào vùng cao và cứu trợ bão lũ')).toBeInTheDocument();
    expect(screen.getByText('Trần Văn Hưng')).toBeInTheDocument();
    expect(screen.getByText('028 3822 6858')).toBeInTheDocument();
    expect(screen.getAllByText('Trụ sở Quận 1').length).toBeGreaterThan(0);

    // Close button
    const closeBtns = screen.getAllByRole('button', { name: 'Đóng' });
    await user.click(closeBtns[0]);

    expect(screen.queryByText('Chi tiết hồ sơ tổ chức hiện hữu')).not.toBeInTheDocument();
  });
});
