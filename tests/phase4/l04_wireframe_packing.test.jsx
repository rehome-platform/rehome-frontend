import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, describe, beforeEach } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import PackingOrdersPage, { PackingDetail } from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { resetPackingSessionStore } from '../../src/features/moderator/services/packingMockApi.js';

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
  const input = await screen.findByLabelText('SKU');
  fireEvent.change(input, { target: { value: code } });
  const submitBtn = screen.getByRole('button', { name: 'Đối chiếu' });
  fireEvent.click(submitBtn);
}

describe('L-04 Moderator Packing Wireframe Test Suite (DG-01 to DG-04)', () => {
  it('DG-01: Renders 8-column packing queue table with search and action buttons', async () => {
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
    expect(screen.getByText('Vị trí kệ gom hàng')).toBeInTheDocument();
    expect(screen.getByText('Thời gian đặt')).toBeInTheDocument();
    expect(screen.getByText('Chờ')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Thao tác')).toBeInTheDocument();

    // Kiểm tra render các đơn từ wireframe DG-01-HangDoi
    await screen.findByText('DH-00239');
    expect(screen.getByText('Vũ Thanh H')).toBeInTheDocument();
    expect(screen.getByText('A1-04, A3-07, C2-11')).toBeInTheDocument();

    expect(screen.getByText('DH-00244')).toBeInTheDocument();
    expect(screen.getByText('Ngô Hải F')).toBeInTheDocument();
    expect(screen.getByText('B1-18, B1-22')).toBeInTheDocument();
  });

  it('DG-02: Renders picking sheet with shelf locations and buyer note', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingDetail orderId="DH-00244" onChanged={() => {}} />
        </Phase2Provider>
      </MemoryRouter>
    );

    // Tiêu đề phiếu lấy hàng và vị trí kệ
    await screen.findByText(/Phiếu lấy hàng — 2 món/);
    expect(screen.getByText('B1-18')).toBeInTheDocument();
    expect(screen.getByText('B1-22')).toBeInTheDocument();
    expect(screen.getByText('Áo sơ mi linen')).toBeInTheDocument();
    expect(screen.getByText('Quần jeans ống đứng')).toBeInTheDocument();

    // Card ghi chú đóng gói và không huỷ được
    expect(screen.getByText('Ghi chú đóng gói của người mua')).toBeInTheDocument();
    expect(screen.getByText('Giao giờ hành chính, gọi trước khi tới.')).toBeInTheDocument();
    expect(screen.getByText('Đơn này không huỷ được nữa')).toBeInTheDocument();
  });

  it('DG-03 & DG-03-SaiMon: Scans SKU and opens warning modal when wrong SKU is scanned', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingDetail orderId="DH-00244" onChanged={() => {}} />
        </Phase2Provider>
      </MemoryRouter>
    );

    await screen.findByText('Đã quét 0/2 SKU');

    // Quét món sai: RH-K9B47T (thuộc đơn DH-00239 theo wireframe DG-03-SaiMon)
    await scanSku('RH-K9B47T');

    // Kiểm tra hiển thị modal cảnh báo DG-03-SaiMon
    await screen.findByText(/Món này không thuộc đơn DH-00244/);
    expect(screen.getByText(/Áo khoác denim — Zara — L/)).toBeInTheDocument();
    expect(screen.getByText(/Trả món này về kệ A3-07/)).toBeInTheDocument();

    // Đóng modal cảnh báo
    fireEvent.click(screen.getByText('Đã hiểu — Xoá và nhập lại mã món đúng'));

    // Quét món đúng thứ 1
    await scanSku('RH-A7F31K');
    await screen.findByText('Đã quét 1/2 SKU');

    // Quét món đúng thứ 2
    await scanSku('RH-C2M08P');
    await screen.findByText('Đã quét 2/2 SKU');

    // Mở khóa nút tạo vận đơn GHN
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tạo vận đơn GHN' })).toBeEnabled();
    });
  });

  it('DG-04: Creates GHN shipment and allows printing waybills', async () => {
    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=DH-00244']}>
        <Phase2Provider>
          <PackingDetail orderId="DH-00244" onChanged={() => {}} />
        </Phase2Provider>
      </MemoryRouter>
    );

    await scanSku('RH-A7F31K');
    await screen.findByText('Đã quét 1/2 SKU');

    await scanSku('RH-C2M08P');
    await screen.findByText('Đã quét 2/2 SKU');

    const shipmentBtn = await screen.findByRole('button', { name: 'Tạo vận đơn GHN' });
    await waitFor(() => expect(shipmentBtn).toBeEnabled());
    fireEvent.click(shipmentBtn);

    // Xuất hiện modal in phiếu vận đơn
    await screen.findByText('In phiếu giao hàng GHN');
    expect(screen.getAllByText('GHN5LK9P2XQ').length).toBeGreaterThan(0);
    expect(screen.getByText('Khổ A5')).toBeInTheDocument();
    expect(screen.getByText('80 x 80mm')).toBeInTheDocument();
    expect(screen.getByText('52 x 70mm')).toBeInTheDocument();
  });
});
