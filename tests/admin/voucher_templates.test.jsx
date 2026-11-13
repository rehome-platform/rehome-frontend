import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import VoucherTemplatesPage from '../../src/features/admin/membership/VoucherTemplatesPage.jsx';
import { membershipAdminApi } from '../../src/features/admin/services/membershipAdminApi.js';

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => ({
  membershipAdminApi: {
    getVoucherTemplates: vi.fn(),
    createVoucherTemplate: vi.fn(),
    updateVoucherTemplate: vi.fn(),
    deactivateVoucherTemplate: vi.fn(),
  },
}));

const SAMPLE_TEMPLATES = [
  {
    id: 1,
    name: 'Freeship Bạc',
    description: 'Miễn phí vận chuyển tối đa 15k',
    type: 'SHIPPING',
    discountKind: 'FIXED',
    discountValue: 15000,
    maxDiscountAmount: null,
    minOrderAmount: 100000,
    validDays: 30,
    active: true,
    tierRules: [{ tier: 'SILVER', quantityPerMonth: 1 }],
  },
  {
    id: 2,
    name: 'Giảm đơn VIP',
    description: 'Giảm 10% đơn hàng',
    type: 'ORDER_DISCOUNT',
    discountKind: 'PERCENT',
    discountValue: 0.1,
    maxDiscountAmount: 50000,
    minOrderAmount: 200000,
    validDays: 15,
    active: false,
    tierRules: [
      { tier: 'GOLD', quantityPerMonth: 2 },
      { tier: 'DIAMOND', quantityPerMonth: 3 },
    ],
  },
];

describe('VoucherTemplatesPage & VoucherTemplateModal (W-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipAdminApi.getVoucherTemplates.mockResolvedValue(SAMPLE_TEMPLATES);
    membershipAdminApi.createVoucherTemplate.mockResolvedValue({ id: 3 });
    membershipAdminApi.updateVoucherTemplate.mockResolvedValue({ id: 2 });
    membershipAdminApi.deactivateVoucherTemplate.mockResolvedValue({ id: 1, active: false });
  });

  it('fetches and renders voucher templates with formatted columns and no delete button', async () => {
    render(<VoucherTemplatesPage />);

    await waitFor(() => {
      expect(membershipAdminApi.getVoucherTemplates).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Freeship Bạc')).toBeInTheDocument();
    expect(screen.getByText('Miễn phí vận chuyển')).toBeInTheDocument();
    expect(screen.getByText('15.000đ')).toBeInTheDocument();
    expect(screen.getByText('100.000đ')).toBeInTheDocument();
    expect(screen.getByText('30 ngày')).toBeInTheDocument();
    expect(screen.getByText('SILVER ×1')).toBeInTheDocument();
    expect(screen.getByText('Đang phát')).toBeInTheDocument();

    expect(screen.getByText('Giảm đơn VIP')).toBeInTheDocument();
    expect(screen.getByText('Giảm giá đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('10% (tối đa 50.000đ)')).toBeInTheDocument();
    expect(screen.getByText('200.000đ')).toBeInTheDocument();
    expect(screen.getByText('15 ngày')).toBeInTheDocument();
    expect(screen.getByText('GOLD ×2')).toBeInTheDocument();
    expect(screen.getByText('DIAMOND ×3')).toBeInTheDocument();
    const row2 = screen.getByText('Giảm đơn VIP').closest('tr');
    expect(within(row2).getByText('Ngừng phát')).toBeInTheDocument();

    // Must NOT have any Delete button
    expect(screen.queryByRole('button', { name: /Xóa/i })).not.toBeInTheDocument();
  });

  it('opens deactivate confirm dialog, prevents duplicate submit, calls API and reloads', async () => {
    let resolveDeactivate;
    membershipAdminApi.deactivateVoucherTemplate.mockImplementation(
      () => new Promise((resolve) => { resolveDeactivate = resolve; })
    );

    render(<VoucherTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Freeship Bạc')).toBeInTheDocument());

    const row = screen.getByText('Freeship Bạc').closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: 'Ngừng phát' }));

    expect(
      screen.getByText(
        'Ngừng phát chỉ dừng cấp mã mới; các voucher đã phát cho thành viên vẫn giữ hiệu lực.'
      )
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận ngừng phát' });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    expect(membershipAdminApi.deactivateVoucherTemplate).toHaveBeenCalledTimes(1);
    expect(membershipAdminApi.deactivateVoucherTemplate).toHaveBeenCalledWith(1);

    resolveDeactivate({ id: 1, active: false });

    await waitFor(() => {
      expect(membershipAdminApi.getVoucherTemplates).toHaveBeenCalledTimes(2);
    });
  });

  it('locks discountKind to PERCENT with note when ORDER_DISCOUNT is selected, validates maxDiscountAmount, converts percent and tierRules on create', async () => {
    let resolveCreate;
    membershipAdminApi.createVoucherTemplate.mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; })
    );

    render(<VoucherTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Freeship Bạc')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Tạo mẫu voucher/i }));

    // Only SILVER, GOLD, DIAMOND checkboxes should exist (never FREE)
    expect(screen.queryByRole('checkbox', { name: /Thành viên thường|FREE/i })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /SILVER/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /GOLD/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /DIAMOND/ })).toBeInTheDocument();

    // Switch type to ORDER_DISCOUNT
    fireEvent.change(screen.getByLabelText(/Loại voucher/i), {
      target: { value: 'ORDER_DISCOUNT' },
    });

    expect(
      screen.getByText(
        'Voucher giảm đơn hàng bắt buộc theo phần trăm; phần giảm giá do nền tảng chịu (không trừ vào tiền người ký gửi) và bị chặn trần theo hoa hồng kỳ ký gửi.'
      )
    ).toBeInTheDocument();

    const kindSelect = screen.getByLabelText(/Hình thức giảm/i);
    expect(kindSelect).toHaveValue('PERCENT');
    expect(kindSelect).toBeDisabled();

    // Fill name & percent discount without maxDiscountAmount -> should fail validation
    fireEvent.change(screen.getByLabelText(/Tên mẫu voucher/i), {
      target: { value: 'Giảm 10% đơn mới' },
    });
    fireEvent.change(screen.getByLabelText(/Mức giảm/i), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText(/Đơn tối thiểu/i), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(/Hiệu lực/i), {
      target: { value: '30' },
    });

    const submitBtn = screen.getByRole('button', { name: /Lưu mẫu voucher/i });
    fireEvent.click(submitBtn);

    expect(membershipAdminApi.createVoucherTemplate).not.toHaveBeenCalled();
    expect(screen.getByText(/Giảm tối đa phải lớn hơn 0/i)).toBeInTheDocument();

    // Provide maxDiscountAmount and select SILVER with qty 2
    fireEvent.change(screen.getByLabelText(/Giảm tối đa/i), {
      target: { value: '40000' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /SILVER/ }));
    fireEvent.change(screen.getByLabelText(/Số lượng \/ tháng cho SILVER/i), {
      target: { value: '2' },
    });

    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn); // duplicate submit guard

    expect(membershipAdminApi.createVoucherTemplate).toHaveBeenCalledTimes(1);
    expect(membershipAdminApi.createVoucherTemplate).toHaveBeenCalledWith({
      name: 'Giảm 10% đơn mới',
      description: '',
      type: 'ORDER_DISCOUNT',
      discountKind: 'PERCENT',
      discountValue: 0.1,
      maxDiscountAmount: 40000,
      minOrderAmount: 50000,
      validDays: 30,
      active: true,
      tierRules: [{ tier: 'SILVER', quantityPerMonth: 2 }],
    });

    resolveCreate({ id: 3 });

    await waitFor(() => {
      expect(membershipAdminApi.getVoucherTemplates).toHaveBeenCalledTimes(2);
    });
  });

  it('opens edit modal with percentage converted from 0.10 to 10 and sends full tierRules on PUT', async () => {
    render(<VoucherTemplatesPage />);
    await waitFor(() => expect(screen.getByText('Giảm đơn VIP')).toBeInTheDocument());

    const row = screen.getByText('Giảm đơn VIP').closest('tr');
    fireEvent.click(within(row).getByRole('button', { name: 'Sửa' }));

    expect(screen.getByLabelText(/Tên mẫu voucher/i)).toHaveValue('Giảm đơn VIP');
    expect(screen.getByLabelText(/Mức giảm/i)).toHaveValue(10);
    expect(screen.getByLabelText(/Giảm tối đa/i)).toHaveValue(50000);
    expect(screen.getByRole('checkbox', { name: /GOLD/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /DIAMOND/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /SILVER/ })).not.toBeChecked();

    // Update: uncheck GOLD, check SILVER with qty 1, change discount to 15%
    fireEvent.click(screen.getByRole('checkbox', { name: /GOLD/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /SILVER/ }));
    fireEvent.change(screen.getByLabelText(/Mức giảm/i), {
      target: { value: '15' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Lưu mẫu voucher/i }));

    await waitFor(() => {
      expect(membershipAdminApi.updateVoucherTemplate).toHaveBeenCalledTimes(1);
    });

    expect(membershipAdminApi.updateVoucherTemplate).toHaveBeenCalledWith(2, {
      name: 'Giảm đơn VIP',
      description: 'Giảm 10% đơn hàng',
      type: 'ORDER_DISCOUNT',
      discountKind: 'PERCENT',
      discountValue: 0.15,
      maxDiscountAmount: 50000,
      minOrderAmount: 200000,
      validDays: 15,
      active: false,
      tierRules: [
        { tier: 'SILVER', quantityPerMonth: 1 },
        { tier: 'DIAMOND', quantityPerMonth: 3 },
      ],
    });

    await waitFor(() => {
      expect(membershipAdminApi.getVoucherTemplates).toHaveBeenCalledTimes(2);
    });
  });
});
