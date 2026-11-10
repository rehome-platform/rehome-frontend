import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminWarehousesView from '../../src/features/admin/components/AdminWarehousesView.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getWarehouses: vi.fn(),
    createWarehouse: vi.fn(),
    updateWarehouse: vi.fn(),
    hideWarehouse: vi.fn(),
    getProvinces: vi.fn(),
    getWards: vi.fn(),
  },
}));

describe('AdminWarehousesView component', () => {
  const mockWarehouses = [
    {
      id: 'WH-01',
      name: 'Kho Quận 7',
      address: '105 Nguyễn Thị Thập, Phường Tân Phú, Hồ Chí Minh',
      latitude: 10.734,
      longitude: 106.722,
      openingHours: '08:00 - 20:00 (Thứ 2 - Chủ nhật)',
      wardName: 'Phường Tân Phú',
      provinceName: 'Hồ Chí Minh',
      moderatorCount: 2,
      inventoryCount: 5,
      activeOrders: 1,
      status: 'ACTIVE',
    },
  ];

  const mockProvinces = [
    { code: '201', name: 'Hà Nội' },
    { code: 202, name: 'Hồ Chí Minh' },
  ];

  const mockWards = [
    { code: '1A01', name: 'Phường Bến Nghé' },
    { code: '1A02', name: 'Phường Tân Phú' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getWarehouses.mockResolvedValue(mockWarehouses);
    adminApi.getProvinces.mockResolvedValue(mockProvinces);
    adminApi.getWards.mockResolvedValue(mockWards);
    adminApi.createWarehouse.mockResolvedValue({ id: 'WH-02', name: 'Kho Mới' });
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <AdminWarehousesView onLogAction={vi.fn()} />
      </ToastProvider>
    );
  };

  it('renders list of warehouses and displays formatted coordinates', async () => {
    renderComponent();

    expect(await screen.findByText('Kho Quận 7')).toBeInTheDocument();
    expect(screen.getByText('10.734, 106.722')).toBeInTheDocument();
    expect(screen.getByText('105 Nguyễn Thị Thập, Phường Tân Phú, Hồ Chí Minh')).toBeInTheDocument();
  });

  it('opens create modal, selects province and ward, and submits valid payload', async () => {
    renderComponent();

    await screen.findByText('Kho Quận 7');
    const openBtn = screen.getByText('Thêm điểm kí gửi mới');
    fireEvent.click(openBtn);

    expect(await screen.findByText('Mở điểm kí gửi mới')).toBeInTheDocument();
    expect(adminApi.getProvinces).toHaveBeenCalled();

    // Điền tên
    const nameInput = screen.getByPlaceholderText('Ví dụ: Điểm kí gửi Tân Bình - Chi nhánh số 5');
    fireEvent.change(nameInput, { target: { value: 'Kho Tân Bình' } });

    // Chọn Tỉnh/Thành
    const provinceSelect = await screen.findByLabelText(/Tỉnh \/ Thành phố/i);
    fireEvent.change(provinceSelect, { target: { value: '202' } });

    await waitFor(() => {
      expect(adminApi.getWards).toHaveBeenCalledWith('202');
    });

    // Chọn Phường/Xã
    const wardSelect = await screen.findByLabelText(/Phường \/ Xã/i);
    fireEvent.change(wardSelect, { target: { value: '1A02' } });

    // Điền số nhà/tên đường
    const streetInput = screen.getByPlaceholderText('Số nhà, tên đường (ví dụ: 123 Nguyễn Thị Thập)');
    fireEvent.change(streetInput, { target: { value: '45 Cộng Hòa' } });

    // Điền tọa độ
    const latInput = screen.getByPlaceholderText('10.7769');
    const lngInput = screen.getByPlaceholderText('106.7009');
    fireEvent.change(latInput, { target: { value: '10.8015' } });
    fireEvent.change(lngInput, { target: { value: '106.6527' } });

    // Submit
    const submitBtn = screen.getByText('Tạo điểm kí gửi mới');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createWarehouse).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kho Tân Bình',
          address: '45 Cộng Hòa, Phường Tân Phú, Hồ Chí Minh',
          latitude: 10.8015,
          longitude: 106.6527,
          wardName: 'Phường Tân Phú',
          provinceName: 'Hồ Chí Minh',
          provinceId: 202,
          wardCode: '1A02',
          isNewAddress: true,
        })
      );
    });
  });

  it('restores the returned address names when editing and submits the resolved codes', async () => {
    adminApi.updateWarehouse.mockResolvedValue({ ...mockWarehouses[0], isNewAddress: true });
    renderComponent();
    await screen.findByText('Kho Quận 7');
    fireEvent.click(screen.getByText('Sửa thông tin'));
    await waitFor(() => {
      expect(screen.getByLabelText(/Phường \/ Xã/i)).toHaveValue('1A02');
    });
    expect(screen.getByLabelText(/Tỉnh \/ Thành phố/i)).toHaveValue('202');
    const street = screen.getByPlaceholderText('Số nhà, tên đường (ví dụ: 123 Nguyễn Thị Thập)');
    expect(street).toHaveValue('105 Nguyễn Thị Thập');
    fireEvent.submit(street.closest('form'));
    await waitFor(() => expect(adminApi.updateWarehouse).toHaveBeenCalledWith('WH-01', expect.objectContaining({
      address: mockWarehouses[0].address, provinceId: 202, wardCode: '1A02',
      provinceName: 'Hồ Chí Minh', wardName: 'Phường Tân Phú', isNewAddress: true,
    })));
  });

  it('does not submit an incomplete two-level address', async () => {
    renderComponent();
    await screen.findByText('Kho Quận 7');
    fireEvent.click(screen.getByText('Thêm điểm kí gửi mới'));
    const name = await screen.findByPlaceholderText('Ví dụ: Điểm kí gửi Tân Bình - Chi nhánh số 5');
    fireEvent.change(name, { target: { value: 'Kho mới' } });
    const street = screen.getByPlaceholderText('Số nhà, tên đường (ví dụ: 123 Nguyễn Thị Thập)');
    fireEvent.change(street, { target: { value: '12 ABC' } });
    fireEvent.submit(street.closest('form'));
    expect(adminApi.createWarehouse).not.toHaveBeenCalled();
  });

  it('uses browser geolocation API when clicking Lấy vị trí hiện tại', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 10.8231,
            longitude: 106.6297,
          },
        })
      ),
    };
    global.navigator.geolocation = mockGeolocation;

    renderComponent();
    await screen.findByText('Kho Quận 7');
    fireEvent.click(screen.getByText('Thêm điểm kí gửi mới'));

    const geoBtn = await screen.findByText(/Lấy vị trí hiện tại/i);
    fireEvent.click(geoBtn);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    const latInput = screen.getByPlaceholderText('10.7769');
    const lngInput = screen.getByPlaceholderText('106.7009');

    expect(latInput.value).toBe('10.823100');
    expect(lngInput.value).toBe('106.629700');
  });
});

