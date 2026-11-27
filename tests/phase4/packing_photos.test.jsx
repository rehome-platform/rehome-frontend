import React from 'react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { PackingDetail } from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { packingService } from '../../src/features/moderator/services/packingApi.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { orderFixture } from './fixtures.js';
import { phase4Contract } from '../../src/features/moderator/config/packingContract.js';

const originalContract = structuredClone(phase4Contract);

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-a', warehouseId: 'warehouse-a' },
    isAuthenticated: true,
  }),
}));

function mountPackingDetail(orderId = 'o1') {
  return render(
    <MemoryRouter>
      <Phase2Provider>
        <PackingDetail orderId={orderId} onChanged={() => {}} />
      </Phase2Provider>
    </MemoryRouter>
  );
}

describe('Ảnh đóng gói đơn hàng (ORDER_PACKING + PUT /orders/{id}/pack/photos)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    phase4Contract.revision = 'test-only';
    phase4Contract.gates.scan = true;
    phase4Contract.gates.shipment = true;
    phase4Contract.gates.packingPhotos = true;
  });

  afterAll(() => {
    Object.assign(phase4Contract, originalContract);
  });

  it('hiển thị ảnh đóng gói từ đơn hàng, tải ảnh mới với folder ORDER_PACKING, tự động lưu và cho phép xóa ảnh', async () => {
    const order = {
      ...orderFixture(),
      packingPhotoUrls: ['https://storage.rehome.test/order-packing/existing-1.jpg'],
    };
    vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
    const uploadSpy = vi.spyOn(inventoryService, 'upload').mockResolvedValue({
      url: 'https://storage.rehome.test/order-packing/new-2.jpg',
    });
    const updatePhotosSpy = vi.spyOn(packingService, 'updatePhotos').mockImplementation(async (_id, urls) => {
      order.packingPhotoUrls = [...urls];
      return [...urls];
    });

    mountPackingDetail('o1');

    // Hiển thị ảnh đóng gói đã có từ server
    expect(await screen.findByText(/Ảnh đóng gói đơn hàng/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 5 ảnh')).toBeInTheDocument();
    expect(screen.getByAltText('Ảnh đóng gói 1')).toHaveAttribute(
      'src',
      'https://storage.rehome.test/order-packing/existing-1.jpg'
    );

    // Tải thêm 1 ảnh mới
    const fileInput = screen.getByLabelText(/Tải ảnh đóng gói/i);
    const file = new File(['img-bytes'], 'packed-box.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ folder: 'ORDER_PACKING' })
      );
    });
    await waitFor(() => {
      expect(updatePhotosSpy).toHaveBeenCalledWith(
        'o1',
        [
          'https://storage.rehome.test/order-packing/existing-1.jpg',
          'https://storage.rehome.test/order-packing/new-2.jpg',
        ],
        expect.anything()
      );
    });
    expect(await screen.findByText('2 / 5 ảnh')).toBeInTheDocument();

    // Xóa ảnh thứ 1
    fireEvent.click(screen.getByRole('button', { name: /Xóa ảnh đóng gói 1/i }));
    await waitFor(() => {
      expect(updatePhotosSpy).toHaveBeenCalledWith(
        'o1',
        ['https://storage.rehome.test/order-packing/new-2.jpg'],
        expect.anything()
      );
    });
    expect(await screen.findByText('1 / 5 ảnh')).toBeInTheDocument();
  });

  it('chặn tải quá 5 ảnh đóng gói và hiển thị thông báo lỗi', async () => {
    const order = {
      ...orderFixture(),
      packingPhotoUrls: [
        'https://storage.rehome.test/1.jpg',
        'https://storage.rehome.test/2.jpg',
        'https://storage.rehome.test/3.jpg',
        'https://storage.rehome.test/4.jpg',
      ],
    };
    vi.spyOn(packingService, 'read').mockResolvedValue(order);
    const uploadSpy = vi.spyOn(inventoryService, 'upload');

    mountPackingDetail('o1');
    await screen.findByText('4 / 5 ảnh');

    const fileInput = screen.getByLabelText(/Tải ảnh đóng gói/i);
    const f1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [f1, f2] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/tối đa 5 ảnh/i);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('khóa chỉnh sửa và hiển thị ảnh đóng gói ở chế độ chỉ xem sau khi đã tạo vận đơn GHN', async () => {
    const order = {
      ...orderFixture(),
      status: 'SHIPPING',
      ghnTrackingCode: 'GHN-LOCKED-123',
      shipmentOutcome: 'CREATED',
      allowedActions: [],
      packingPhotoUrls: ['https://storage.rehome.test/order-packing/final.jpg'],
    };
    vi.spyOn(packingService, 'read').mockResolvedValue(order);

    mountPackingDetail('o1');

    expect(await screen.findByAltText('Ảnh đóng gói 1')).toBeInTheDocument();
    expect(screen.getByText(/Đã khóa sau khi tạo vận đơn/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Tải ảnh đóng gói/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xóa ảnh đóng gói 1/i })).not.toBeInTheDocument();
  });

  it('vô hiệu hóa nút Tạo vận đơn GHN và nhắc tải ảnh đóng gói khi chưa có ảnh; bật lại sau khi tải ảnh', async () => {
    const order = {
      ...orderFixture(),
      scannedProductIds: ['sku-a', 'SKU-B'],
      scannedCount: 2,
      totalCount: 2,
      packingPhotoUrls: [],
    };
    vi.spyOn(packingService, 'read').mockImplementation(async () => structuredClone(order));
    vi.spyOn(inventoryService, 'upload').mockResolvedValue({
      url: 'https://storage.rehome.test/order-packing/uploaded-1.jpg',
    });
    vi.spyOn(packingService, 'updatePhotos').mockImplementation(async (_id, urls) => {
      order.packingPhotoUrls = [...urls];
      return [...urls];
    });

    mountPackingDetail('o1');

    const shipmentBtn = await screen.findByRole('button', { name: 'Tạo vận đơn GHN' });
    expect(shipmentBtn).toBeDisabled();
    expect(screen.getByTestId('packing-photo-required-notice')).toHaveTextContent(
      /ít nhất 1 ảnh đóng gói/i
    );
    expect(screen.getByTestId('packing-photo-dropzone')).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/Tải ảnh đóng gói/i);
    const file = new File(['box-bytes'], 'packed-parcel.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('1 / 5 ảnh')).toBeInTheDocument();
    await waitFor(() => expect(shipmentBtn).toBeEnabled());
    expect(screen.queryByTestId('packing-photo-required-notice')).not.toBeInTheDocument();

    // Xóa hết ảnh -> nút Tạo vận đơn GHN bị khóa lại và nhắc lại
    fireEvent.click(screen.getByRole('button', { name: /Xóa ảnh đóng gói 1/i }));
    expect(await screen.findByText('0 / 5 ảnh')).toBeInTheDocument();
    await waitFor(() => expect(shipmentBtn).toBeDisabled());
    expect(screen.getByTestId('packing-photo-required-notice')).toBeInTheDocument();
  });
});
