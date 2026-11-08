import React, { StrictMode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import {
  consignmentService,
  queueService,
} from '../../src/features/moderator/services/warehouseApi.js';
import ConsignmentListPage from '../../src/features/moderator/pages/ConsignmentListPage.jsx';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a', warehouseName: 'Kho Quận 7' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

function Wrapper({ children }) {
  return (
    <StrictMode>
      <MemoryRouter>
        <Phase2Provider>{children}</Phase2Provider>
      </MemoryRouter>
    </StrictMode>
  );
}

describe('ConsignmentListPage & Flow separation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with tabs, notice banner, footer note and form table with "Mở duyệt" button', async () => {
    vi.spyOn(consignmentService, 'listForms').mockResolvedValue([
      {
        formId: 'KG-F-002318',
        name: 'Áo khoác dạ nữ',
        brand: 'Uniqlo',
        memberName: 'Lê Minh C',
        desiredPrice: 1000000,
        createdAt: '2026-10-11T03:30:00Z',
        claimedBy: 'mod-a',
        status: 'PENDING',
      },
      {
        formId: 'KG-F-002319',
        name: 'Giày sneaker trắng',
        brand: 'Adidas',
        memberName: 'Phạm Thu D',
        desiredPrice: 1400000,
        createdAt: '2026-10-11T07:15:00Z',
        claimedBy: null,
        status: 'PENDING',
      },
    ]);

    render(<ConsignmentListPage />, { wrapper: Wrapper });

    // Tiêu đề & Subtitle
    expect(await screen.findByText('Form ký gửi')).toBeInTheDocument();

    // 5 Subtabs chuẩn KD-01
    expect(screen.getByRole('tab', { name: 'Chờ duyệt' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Đã duyệt, chờ mang đến' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Đang kiểm định' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Nhập kho hôm nay' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Đã từ chối' })).toBeInTheDocument();

    // Khung lưu ý hướng dẫn duyệt trên ảnh (KD-01)
    expect(
      screen.getByText(/Ở bước này bạn duyệt trên ảnh, chưa thấy hàng thật/i)
    ).toBeInTheDocument();

    // Bảng dữ liệu form ký gửi
    expect(screen.getByText('KG-F-002318')).toBeInTheDocument();
    expect(screen.getByText('Áo khoác dạ nữ')).toBeInTheDocument();
    expect(screen.getByText('Uniqlo')).toBeInTheDocument();
    expect(screen.getByText('Lê Minh C')).toBeInTheDocument();
    expect(screen.getByText('Bạn đang nhận việc này')).toBeInTheDocument();

    // Nút "Mở duyệt"
    const openButtons = screen.getAllByRole('link', { name: 'Mở duyệt' });
    expect(openButtons).toHaveLength(2);
    expect(openButtons[0]).toHaveAttribute('href', '/moderator/consignments/KG-F-002318');

    // Ghi chú chân trang thừa đã được gỡ bỏ để giữ giao diện gọn gàng
    expect(
      screen.queryByText(/Member chỉ được giữ tối đa/i)
    ).not.toBeInTheDocument();
  });

  it('HQ-02: ConsignmentQueuePage changes "Nhận việc" to "Nhả việc" with no "Mở" button in table', async () => {
    vi.spyOn(queueService, 'list').mockResolvedValue([
      {
        id: 'q-free-1',
        queueId: 'q-free-1',
        type: 'FORM_REVIEW',
        formId: 'KG-F-002318',
        name: 'Áo khoác dạ nữ',
        claimedBy: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'q-mine-1',
        queueId: 'q-mine-1',
        type: 'FORM_REVIEW',
        formId: 'KG-F-002319',
        name: 'Giày sneaker trắng',
        claimedBy: 'mod-a',
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<ConsignmentQueuePage />, { wrapper: Wrapper });

    // Dòng chưa ai nhận -> có nút "Nhận việc"
    expect(await screen.findByText('chưa ai nhận')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhận việc' })).toBeInTheDocument();

    // Dòng bạn đang nhận việc -> hiển thị "Bạn đang nhận việc này" và duy nhất nút "Nhả việc"
    expect(screen.getByText('Bạn đang nhận việc này')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhả việc' })).toBeInTheDocument();

    // Tuyệt đối không có nút "Mở" ở hàng đợi công việc
    expect(screen.queryByRole('link', { name: 'Mở' })).not.toBeInTheDocument();
  });
});

