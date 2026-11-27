import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import ReceiptClauseTemplatesPage from '../../src/features/admin/pages/ReceiptClauseTemplatesPage.jsx';
import receiptClauseAdminApi from '../../src/features/admin/services/receiptClauseAdminApi.js';

function wrap(ui) {
  return (
    <MemoryRouter initialEntries={['/admin/receipt-clause-templates']}>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

const SAMPLE_CLAUSES = [
  {
    id: 'cl-1',
    displayOrder: 1,
    title: 'ĐIỀU 5 — GIẢM GIÁ',
    bodyTemplate: 'Giá bán không được thấp hơn {{floorPrice}} .',
    active: true,
  },
  {
    id: 'cl-2',
    displayOrder: 2,
    title: 'ĐIỀU 6 — RÚT HÀNG',
    bodyTemplate:
      'Trong {{freeWithdrawalWindowDays}} ngày đầu được miễn phí. Sau đó thu {{withdrawalFee}}.',
    active: true,
  },
  {
    id: 'cl-3',
    displayOrder: 3,
    title: 'ĐIỀU PHỤ — TẠM ẨN',
    bodyTemplate: 'Nếu hư hỏng bồi thường {{degradedCompensationRate}}.',
    active: false,
  },
];

describe('Admin ReceiptClauseTemplatesPage UI upgrade', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('never shows raw {{...}} on cards or preview, renders clear Vietnamese values, and smooths punctuation spacing', async () => {
    vi.spyOn(receiptClauseAdminApi, 'list').mockResolvedValue(SAMPLE_CLAUSES);

    const { container } = render(wrap(<ReceiptClauseTemplatesPage />));

    expect(await screen.findByText('3 điều khoản')).toBeInTheDocument();
    expect(screen.getByText('2 đang áp dụng')).toBeInTheDocument();

    // Expand guide: zero raw {{...}} anywhere in UI
    const guideBtn = screen.getByRole('button', { name: /Thông số tự động \(4\)/i });
    expect(guideBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(guideBtn);
    expect(guideBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Mẫu: 50%/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\{\{|\}\}/);

    // Left card shows substituted readable values and friendly metadata strip (no {{...}})
    const card1 = screen.getAllByText('ĐIỀU 5 — GIẢM GIÁ')[0].closest('div.bg-white');
    expect(within(card1).getByText('500.000 đ')).toBeInTheDocument();
    expect(within(card1).getByText('Thông số tự động:')).toBeInTheDocument();
    expect(within(card1).getByText('Giá sàn')).toBeInTheDocument();
    expect(within(card1).getByText('mẫu 500.000 đ')).toBeInTheDocument();
    expect(within(card1).getByText('Đang áp dụng')).toBeInTheDocument();
    expect(within(card1).getByText('Hiển thị tại Điều 5')).toBeInTheDocument();
    // Space before "." after {{floorPrice}} is stripped cleanly
    expect(card1.querySelector('p.leading-relaxed').textContent).toBe(
      'Giá bán không được thấp hơn 500.000 đ.',
    );

    const card2 = screen.getAllByText('ĐIỀU 6 — RÚT HÀNG')[0].closest('div.bg-white');
    expect(within(card2).getByText('Số ngày rút miễn phí')).toBeInTheDocument();
    expect(within(card2).getByText('mẫu 7 ngày')).toBeInTheDocument();
    expect(within(card2).getByText('Phí rút hàng')).toBeInTheDocument();
    expect(within(card2).getByText('mẫu 50.000 đ')).toBeInTheDocument();

    const inactiveCard = screen.getByText('ĐIỀU PHỤ — TẠM ẨN').closest('div.bg-white');
    expect(within(inactiveCard).getByText('Đã tắt')).toBeInTheDocument();
    expect(within(inactiveCard).getByText('Không hiện trên biên nhận mới')).toBeInTheDocument();

    // Right preview panel renders sections, substitutes sample values, and omits inactive clause
    const previewPanel = screen.getByText('Xem trước biên nhận mẫu').closest('div.rounded-2xl');
    expect(within(previewPanel).getByText('Điều khoản cố định (Điều 1 – 4)')).toBeInTheDocument();
    expect(within(previewPanel).getByText('Điều khoản tùy chỉnh (từ Điều 5)')).toBeInTheDocument();
    expect(within(previewPanel).getByText('6 điều khoản')).toBeInTheDocument();
    expect(within(previewPanel).getByText('50.000 đ')).toBeInTheDocument();
    expect(within(previewPanel).queryByText('ĐIỀU PHỤ — TẠM ẨN')).not.toBeInTheDocument();
  });

  it('edits with readable Vietnamese token and saves raw {{...}} placeholder format to backend API', async () => {
    vi.spyOn(receiptClauseAdminApi, 'list').mockResolvedValue(SAMPLE_CLAUSES);
    const updateSpy = vi.spyOn(receiptClauseAdminApi, 'update').mockResolvedValue({ ...SAMPLE_CLAUSES[0] });

    const { container } = render(wrap(<ReceiptClauseTemplatesPage />));
    const matches = await screen.findAllByText('ĐIỀU 5 — GIẢM GIÁ');
    const card1 = matches[0].closest('div.bg-white');

    fireEvent.click(within(card1).getByRole('button', { name: /Sửa/i }));

    const textarea = screen.getByLabelText(/Nội dung/i);
    expect(textarea).toHaveValue('Giá bán không được thấp hơn [Giá sàn] .');
    expect(container.textContent).not.toMatch(/\{\{|\}\}/);

    fireEvent.change(textarea, {
      target: { value: 'Giá bán tối thiểu là [Giá sàn].' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu điều khoản' }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('cl-1', {
        title: 'ĐIỀU 5 — GIẢM GIÁ',
        bodyTemplate: 'Giá bán tối thiểu là {{floorPrice}}.',
        active: true,
      });
    });
  });

  it('quick-inserts Vietnamese parameter token in create mode, warns on unsupported placeholder, updates preview live, and saves', async () => {
    vi.spyOn(receiptClauseAdminApi, 'list').mockResolvedValue(SAMPLE_CLAUSES);
    const createSpy = vi.spyOn(receiptClauseAdminApi, 'create').mockResolvedValue({ id: 'cl-new' });

    render(wrap(<ReceiptClauseTemplatesPage />));
    await screen.findByText('3 điều khoản');

    fireEvent.click(screen.getByRole('button', { name: /Thêm điều khoản/i }));

    fireEvent.change(screen.getByLabelText(/Tiêu đề/i), {
      target: { value: 'ĐIỀU 7 — BỒI THƯỜNG' },
    });

    // Quick-insert parameter button writes [Tỷ lệ đền xuống cấp] into textarea & updates preview
    fireEvent.click(screen.getByRole('button', { name: /\+ Tỷ lệ đền xuống cấp/i }));
    const textarea = screen.getByLabelText(/Nội dung/i);
    expect(textarea).toHaveValue('[Tỷ lệ đền xuống cấp]');
    expect(screen.getByText('Đang chỉnh sửa')).toBeInTheDocument();
    expect(screen.getAllByText('50%').length).toBeGreaterThanOrEqual(2);

    // Unsupported variable triggers warning without displaying raw {{...}}
    fireEvent.change(textarea, {
      target: { value: 'Bồi thường [Tỷ lệ đền xuống cấp] hoặc {{badVar}}' },
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Phát hiện thông số chưa được hệ thống hỗ trợ/i);
    expect(alert.textContent).not.toMatch(/\{\{/);

    // Fix & save valid template -> converts back to {{degradedCompensationRate}} for BE
    fireEvent.change(textarea, {
      target: { value: 'Bồi thường [Tỷ lệ đền xuống cấp].' },
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu điều khoản' }));
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        title: 'ĐIỀU 7 — BỒI THƯỜNG',
        bodyTemplate: 'Bồi thường {{degradedCompensationRate}}.',
        active: true,
      });
    });
  });

  it('toggles clause status and deletes clause via confirmation modal', async () => {
    vi.spyOn(receiptClauseAdminApi, 'list').mockResolvedValue(SAMPLE_CLAUSES);
    const toggleSpy = vi.spyOn(receiptClauseAdminApi, 'toggle').mockResolvedValue({ ...SAMPLE_CLAUSES[0], active: false });
    const removeSpy = vi.spyOn(receiptClauseAdminApi, 'remove').mockResolvedValue({});

    render(wrap(<ReceiptClauseTemplatesPage />));
    const matches = await screen.findAllByText('ĐIỀU 5 — GIẢM GIÁ');

    const card1 = matches[0].closest('div.bg-white');
    fireEvent.click(within(card1).getByRole('switch'));
    await waitFor(() => expect(toggleSpy).toHaveBeenCalledWith('cl-1'));

    const card1AfterToggle = screen.getAllByText('ĐIỀU 5 — GIẢM GIÁ')[0].closest('div.bg-white');
    fireEvent.click(within(card1AfterToggle).getByRole('button', { name: /Xóa/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận xóa' }));
    await waitFor(() => expect(removeSpy).toHaveBeenCalledWith('cl-1'));
  });
});
