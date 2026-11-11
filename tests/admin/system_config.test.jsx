import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfigPage from '../../src/features/admin/pages/ConfigPage.jsx';
import baseApi from '../../src/services/baseApi.js';

const { onLogAction } = vi.hoisted(() => ({ onLogAction: vi.fn() }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { fullName: 'Admin' } }) }));
vi.mock('react-router-dom', () => ({ useOutletContext: () => ({ onLogAction }) }));
// Keep the page and adminApi real; replace only the HTTP boundary.
vi.mock('../../src/services/baseApi.js', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

const rows = [
  ['term_length_days', '45', 'INT', 1, 365],
  ['max_renewals', '4', 'INT', 0, 10],
  ['free_withdrawal_window_days', '9', 'INT', 0, 365],
  ['end_of_term_decision_days', '30', 'INT', 1, 365],
  ['bring_in_deadline_days', '7', 'INT', 1, 90],
  ['max_pending_forms_per_member', '5', 'INT', 1, 50],
  ['commission_rate_term1', '0.1234', 'DECIMAL', 0, 1],
  ['commission_rate_term2', '0.25', 'DECIMAL', 0, 1],
  ['commission_rate_term3', '0.3', 'DECIMAL', 0, 1],
  ['floor_price_ratio', '0.6', 'DECIMAL', 0.01, 1],
  ['max_price_changes_per_day', '2', 'INT', 1, 20],
  ['withdrawal_fee', '40000', 'DECIMAL', 0, 10000000],
  ['degraded_compensation_rate', '0.7', 'DECIMAL', 0, 1],
  ['max_concurrent_campaigns', '5', 'INT', 1, 100],
  ['legal_image_retention_days', '60', 'INT', 1, 365],
  ['overdue_task_hours', '72', 'INT', 1, 720],
  ['min_payout_amount', '75000', 'DECIMAL', 1, 10000000],
  ['max_payout_requests_per_day', '6', 'INT', 1, 100],
  ['order_payment_timeout_minutes', '20', 'INT', 1, 1440],
  ['order_auto_complete_days', '4', 'INT', 1, 30],
  ['return_request_window_days', '5', 'INT', 1, 30],
  ['return_handover_carrier_days', '3', 'INT', 1, 30],
  ['counter_pickup_days', '10', 'INT', 1, 90],
];
const fixture = () => rows.map(([key, value, type, min, max]) => ({
  key, value, defaultValue: value, usingDefault: false, type, min, max,
  updatedBy: 'admin@example.com', updatedAt: '2026-11-09T00:00:00Z',
}));
const response = (result) => ({ data: { result, isSuccess: true, statusCode: 200, message: 'OK' } });
const saveButton = () => screen.getByRole('button', { name: /Lưu thay đổi/ });
const tab = (name) => fireEvent.click(screen.getByRole('button', { name }));
async function mount() {
  render(<ConfigPage />);
  await waitFor(() => expect(saveButton()).toBeEnabled());
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  baseApi.get.mockResolvedValue(response(fixture()));
  baseApi.put.mockImplementation(async (url, body) => response({ key: url.split('/').pop(), value: body.value }));
});

describe('Admin system configuration HTTP contract', () => {
  it('loads effective API values instead of a stale local snapshot and converts ratios to percentages', async () => {
    localStorage.setItem('rehome_admin_saved_configs', JSON.stringify({ consignment: { termDays: 99 } }));
    await mount();
    expect(baseApi.get).toHaveBeenCalledWith('/api/admin/config');
    expect(screen.getByLabelText(/Độ dài một kỳ/)).toHaveValue(45);
    expect(screen.getByLabelText(/Hạn chọn xử lý cuối kỳ/)).toHaveValue(30);
    expect(screen.getByLabelText(/Hạn mang đồ đến kho/)).toHaveValue(7);
    expect(screen.getByLabelText(/Số form đang chờ tối đa/)).toHaveValue(5);
    tab(/2\. Giá/);
    expect(screen.getByLabelText(/Hoa hồng kỳ 1/)).toHaveValue(12.34);
    expect(screen.getByLabelText(/Số lần đổi giá tối đa/)).toHaveValue(2);
    tab(/3\. Ví/);
    expect(screen.getByLabelText(/Số tiền rút tối thiểu/)).toHaveValue(75000);
    expect(screen.getByLabelText(/Số lần rút tối đa/)).toHaveValue(6);
    tab(/4\. Đơn/);
    expect(screen.getByLabelText(/Thời hạn thanh toán đơn/)).toHaveValue(20);
    expect(screen.getByLabelText(/Thời hạn tự hoàn thành sau giao/)).toHaveValue(4);
    expect(screen.getByLabelText(/Thời hạn gửi yêu cầu trả hàng/)).toHaveValue(5);
    expect(screen.getByLabelText(/Thời hạn bàn giao hàng trả cho GHN/)).toHaveValue(3);
    expect(screen.getByLabelText(/Thời hạn đến kho nhận hàng trả/)).toHaveValue(10);
  });

  it('enables all 23 catalog keys across all 5 tabs when returned by backend', async () => {
    await mount();
    for (const label of [/Hạn chọn xử lý/, /Hạn mang đồ/, /Số form đang chờ/]) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
    tab(/2\. Giá/);
    expect(screen.getByLabelText(/Số lần đổi giá/)).toBeEnabled();
    tab(/4\. Đơn/);
    for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeEnabled();
  });

  it('sends all 23 catalog keys, preserves fractional percentages, and refreshes from the server after saving', async () => {
    await mount();
    tab(/3\. Ví/);
    fireEvent.change(screen.getByLabelText(/Số tiền rút tối thiểu/), { target: { value: '80000' } });
    fireEvent.change(screen.getByLabelText(/Số lần rút tối đa/), { target: { value: '7' } });
    tab(/4\. Đơn/);
    fireEvent.change(screen.getByLabelText(/Thời hạn thanh toán đơn/), { target: { value: '30' } });
    baseApi.get.mockResolvedValue(response(fixture().map(row => row.key === 'min_payout_amount' ? { ...row, value: '80000' } : row)));
    fireEvent.click(saveButton());
    await screen.findByText(/Đã đồng bộ tham số/);
    expect(baseApi.put).toHaveBeenCalledWith('/api/admin/config/min_payout_amount', { value: '80000' });
    expect(baseApi.put).toHaveBeenCalledWith('/api/admin/config/max_payout_requests_per_day', { value: '7' });
    expect(baseApi.put).toHaveBeenCalledWith('/api/admin/config/order_payment_timeout_minutes', { value: '30' });
    expect(baseApi.put).toHaveBeenCalledWith('/api/admin/config/commission_rate_term1', { value: '0.1234' });
    expect(baseApi.put).toHaveBeenCalledTimes(23);
    expect(baseApi.get).toHaveBeenCalledTimes(2);
    tab(/3\. Ví/);
    expect(screen.getByLabelText(/Số lần rút tối đa/)).toHaveValue(6);
    expect(localStorage.getItem('rehome_admin_saved_configs')).toBeNull();
    expect(onLogAction).toHaveBeenCalledTimes(1);
  });

  it('does not report success or log a completed save if any PUT fails', async () => {
    await mount();
    baseApi.put.mockImplementation(async (url, body) => {
      if (url.endsWith('/min_payout_amount')) throw { response: { data: { message: 'Không thể lưu ví' } } };
      return response({ value: body.value });
    });
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('min_payout_amount');
    expect(screen.queryByText(/Đã đồng bộ tham số/)).not.toBeInTheDocument();
    expect(onLogAction).not.toHaveBeenCalled();
    expect(localStorage.getItem('rehome_admin_saved_configs')).toBeNull();
  });

  it('blocks saving while loading and offers retry after a GET error', async () => {
    baseApi.get.mockRejectedValueOnce(new Error('Mất kết nối'));
    render(<ConfigPage />);
    expect(saveButton()).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối');
    expect(saveButton()).toBeDisabled();
    expect(screen.getByLabelText(/Độ dài một kỳ/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(screen.getByLabelText(/Độ dài một kỳ/)).toHaveValue(45);
  });

  it('does not claim success when the post-save GET fails', async () => {
    await mount();
    baseApi.get.mockRejectedValueOnce(new Error('Không xác minh được cấu hình'));
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('Không xác minh được cấu hình');
    expect(screen.queryByText(/Đã đồng bộ tham số/)).not.toBeInTheDocument();
    expect(onLogAction).not.toHaveBeenCalled();
  });

  it('validates all tabs against server limits and rejects empty values before making PUT requests', async () => {
    await mount();
    tab(/3\. Ví/);
    const count = screen.getByLabelText(/Số lần rút tối đa/);
    expect(count).toHaveAttribute('min', '1');
    expect(count).toHaveAttribute('max', '100');
    expect(count).toHaveAttribute('step', '1');
    fireEvent.change(count, { target: { value: '' } });
    tab(/1\. Kỳ/);
    fireEvent.click(saveButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('max_payout_requests_per_day');
    expect(baseApi.put).not.toHaveBeenCalled();
  });

  it('keeps keys omitted by the server disabled and does not send them on save', async () => {
    baseApi.get.mockResolvedValue(response(fixture().filter(row => row.key !== 'min_payout_amount')));
    await mount();
    tab(/3\. Ví/);
    expect(screen.getByLabelText(/Số tiền rút tối thiểu/)).toBeDisabled();
    fireEvent.click(saveButton());
    await screen.findByText(/Đã đồng bộ tham số/);
    expect(baseApi.put).not.toHaveBeenCalledWith('/api/admin/config/min_payout_amount', expect.anything());
  });
});
