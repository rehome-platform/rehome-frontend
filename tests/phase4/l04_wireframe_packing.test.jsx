import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, describe, beforeEach } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import PackingOrdersPage, { PackingDetail } from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { packingMockApi, resetPackingSessionStore } from '../../src/features/moderator/services/packingMockApi.js';

vi.mock('../../src/features/moderator/config/warehouseContract.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, isFixtureMode: true };
});

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'MOD-07-003', warehouseId: 'WH-Q7' },
    isAuthenticated: true,
  }),
}));

beforeEach(() => {
  resetPackingSessionStore();
});

async function scanSku(code) {
  const input = await screen.findByLabelText('Mã hàng hóa');
  fireEvent.change(input, { target: { value: code } });
  const submitBtn = screen.getByRole('button', { name: 'Đối chiếu' });
  fireEvent.click(submitBtn);
}

describe('L-04 Moderator Packing Wireframe Test Suite (DG-01 to DG-04)', () => {
  it('DG-01: Renders 8-column packing queue table with search and action buttons', async () => {
    await packingMockApi.claimQueue('queue-pk-01', 'MOD-07-003');
    await packingMockApi.claimQueue('queue-pk-02', 'MOD-07-003');

    render(
      <MemoryRouter initialEntries={['/moderator/packing']}>
        <Phase2Provider>
          <PackingOrdersPage />
        </Phase2Provider>
      </MemoryRouter>
    );

    // Kiểm tra các cột tiêu đề của bảng DG-01
    expect(screen.getByText('Mã đơn')).toBeInTheDocument();
    expect(screen.getByText('Người mua')).toBeInTheDocument();
    expect(screen.getByText('Số món')).toBeInTheDocument();
    expect(screen.getByText('Thời gian đặt')).toBeInTheDocument();
    expect(screen.getByText('Đã chờ')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Thao tác')).toBeInTheDocument();

    // Kiểm tra render các đơn đã nhận bởi moderator từ wireframe DG-01-HangDoi
    await screen.findByText('DH-00239');
    expect(screen.getByText('Vũ Thanh H')).toBeInTheDocument();

    expect(screen.getByText('DH-00244')).toBeInTheDocument();
    expect(screen.getByText('Ngô Hải F')).toBeInTheDocument();
    expect(screen.getAllByText('Bạn đang giữ')).toHaveLength(2);

    // Đơn Chưa ai nhận không hiển thị trong Đóng gói đơn hàng (chỉ nằm bên Hàng đợi công việc)
    expect(screen.queryByText('DH-00251')).not.toBeInTheDocument();
    expect(screen.queryByText('Trần Minh K')).not.toBeInTheDocument();
    expect(screen.queryByText('Chưa ai nhận')).not.toBeInTheDocument();
  });

  it('DG-02: Renders picking sheet and buyer note', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingDetail orderId="DH-00244" onChanged={() => {}} />
        </Phase2Provider>
      </MemoryRouter>
    );

    // Tiêu đề phiếu lấy hàng
    await screen.findByText(/Phiếu lấy hàng — 2 món/);
    expect(screen.getByText('Áo sơ mi linen')).toBeInTheDocument();
    expect(screen.getByText('Quần jeans ống đứng')).toBeInTheDocument();

    // Card ghi chú đóng gói và không huỷ được
    expect(screen.getByText('Ghi chú đóng gói của người mua')).toBeInTheDocument();
    expect(screen.getByText('Giao giờ hành chính, gọi trước khi tới.')).toBeInTheDocument();
    expect(screen.getByText('Đơn này không huỷ được nữa')).toBeInTheDocument();
  });

  it('DG-03 & DG-03-SaiMon: Scans SKU and opens warning modal when wrong SKU is scanned', async () => {
    await packingMockApi.updatePackingPhotos('DH-00244', [
      'https://storage.rehome.test/order-packing/dh244-1.jpg',
    ]);
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingDetail orderId="DH-00244" onChanged={() => {}} />
        </Phase2Provider>
      </MemoryRouter>
    );

    await screen.findByText('Đã quét 0/2 Mã hàng hóa');

    // Quét món sai: RH-K9B47T (thuộc đơn DH-00239 theo wireframe DG-03-SaiMon)
    await scanSku('RH-K9B47T');

    // Kiểm tra hiển thị modal cảnh báo DG-03-SaiMon
    await screen.findByText(/Món này không thuộc đơn DH-00244/);
    expect(screen.getByText(/Áo khoác denim — Zara — L/)).toBeInTheDocument();

    // Đóng modal cảnh báo
    fireEvent.click(screen.getByText('Đã hiểu — Xoá và nhập lại mã món đúng'));

    // Quét món đúng thứ 1
    await scanSku('RH-A7F31K');
    await screen.findByText('Đã quét 1/2 Mã hàng hóa');

    // Quét món đúng thứ 2
    await scanSku('RH-C2M08P');
    await screen.findByText('Đã quét 2/2 Mã hàng hóa');

    // Mở khóa nút tạo vận đơn GHN
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeEnabled();
    });
  });

  it('DG-04: Creates GHN shipment and allows printing waybills', async () => {
    await packingMockApi.updatePackingPhotos('DH-00244', [
      'https://storage.rehome.test/order-packing/dh244-1.jpg',
    ]);
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingDetail orderId="DH-00244" onChanged={() => {}} />
        </Phase2Provider>
      </MemoryRouter>
    );

    await scanSku('RH-A7F31K');
    await screen.findByText('Đã quét 1/2 Mã hàng hóa');

    await scanSku('RH-C2M08P');
    await screen.findByText('Đã quét 2/2 Mã hàng hóa');

    const shipmentBtn = await screen.findByRole('button', { name: 'Tạo vận đơn GHN' });
    await waitFor(() => expect(shipmentBtn).toBeEnabled());
    fireEvent.click(shipmentBtn);

    // Xuất hiện modal in phiếu vận đơn
    await screen.findByRole('heading', { name: 'Chi tiết phiếu giao hàng' });
    expect(screen.getByRole('dialog')).toHaveTextContent('Mã đơn');
    expect(screen.getByRole('dialog')).toHaveTextContent('Mã vận đơn GHN');
    expect(screen.getByText('Người nhận')).toBeInTheDocument();
    expect(screen.getAllByText('GHN5LK9P2XQ').length).toBeGreaterThan(0);
    expect(screen.getByRole('dialog')).toHaveTextContent('In vận đơn A5');
    expect(screen.queryByText('80 x 80mm')).not.toBeInTheDocument();
    expect(screen.queryByText('52 x 70mm')).not.toBeInTheDocument();
  });
});
