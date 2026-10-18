import React, { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider, usePhase2 } from '../../src/features/moderator/phase2/hooks.jsx';
import { consignmentService, queueService, endTermService } from '../../src/features/moderator/phase2/api.js';
import { Phase2Error } from '../../src/features/moderator/phase2/model.js';
import ConsignmentDetailPage from '../../src/features/moderator/pages/ConsignmentDetailPage.jsx';
import EndOfTermPage from '../../src/features/moderator/pages/EndOfTermPage.jsx';

const user = { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' };
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => ({ user, isAuthenticated: true }) }));
vi.mock('../../src/features/moderator/phase2/contract.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, phase2Contract: { ...original.phase2Contract, options: {
    termLengthDays: [30], inspectionReturnReasons: ['FAIL', 'SUSPECTED_COUNTERFEIT'],
  } } };
});
vi.mock('../../src/features/moderator/phase2/ReceiptPanel.jsx', () => ({
  default: ({ receiptId }) => <p>Receipt {receiptId}</p>,
}));
const proof = { memberId: 'member-1', identityToken: 'proof-1' };
const baseForm = { formId: 'form-1', queueId: 'queue-1', memberId: 'member-1', name: 'Áo',
  status: 'PENDING', claimedBy: 'mod-a', allowedActions: ['APPROVE', 'REJECT'], photos: [] };
function Identity({ identity, children }) {
  const { setIdentity } = usePhase2();
  useEffect(() => { setIdentity(identity); }, [identity, setIdentity]);
  return children;
}
function show(path, identity = proof) {
  return render(<MemoryRouter initialEntries={[path]}><Phase2Provider><Identity identity={identity}>
    <Routes>
      <Route path="/moderator/consignments/:formId" element={<ConsignmentDetailPage />} />
      <Route path="/moderator/end-of-term" element={<EndOfTermPage />} />
    </Routes>
  </Identity></Phase2Provider></MemoryRouter>);
}
beforeEach(() => {
  vi.spyOn(consignmentService, 'read').mockResolvedValue({ ...baseForm });
  vi.spyOn(endTermService, 'list').mockResolvedValue({ items: [], totalPages: 1 });
});
describe('consignment detail contracts (mocked services)', () => {
  it.each([null, 'other'])('withholds review and inspection actions for claim owner %s', async (claimedBy) => {
    consignmentService.read.mockResolvedValue({ ...baseForm, claimedBy });
    show('/moderator/consignments/form-1');
    await screen.findByText('Áo');
    expect(screen.queryByRole('button', { name: 'Duyệt form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu kiểm định' })).not.toBeInTheDocument();
    if (!claimedBy) expect(screen.getByRole('button', { name: 'Nhận việc' })).toBeEnabled();
    else expect(screen.getByText('Người khác đang xử lý công việc này.')).toBeInTheDocument();
  });
  it('preserves action permissions, rejection validation, trimmed payload and edits after refresh', async () => {
    consignmentService.read.mockResolvedValue({ ...baseForm, allowedActions: ['REJECT'] });
    const reject = vi.spyOn(queueService, 'reject').mockResolvedValue(null);
    const interaction = userEvent.setup();
    show('/moderator/consignments/form-1');
    const button = await screen.findByRole('button', { name: 'Từ chối form' });
    expect(screen.getByRole('button', { name: 'Duyệt form' })).toBeDisabled();
    expect(button).toBeDisabled();
    await interaction.type(screen.getByLabelText('Lý do từ chối'), '  Không đạt  ');
    await interaction.click(button);
    await waitFor(() => expect(reject).toHaveBeenCalledOnce());
    expect(reject.mock.calls[0].slice(0, 2)).toEqual(['form-1', 'Không đạt']);
    await waitFor(() => expect(screen.getByLabelText('Lý do từ chối')).toHaveValue('  Không đạt  '));
  });
  it('requires matching Member identity before starting inspection', async () => {
    consignmentService.read.mockResolvedValue({ ...baseForm, allowedActions: ['START_INSPECTION'] });
    show('/moderator/consignments/form-1', { ...proof, memberId: 'other' });
    expect(await screen.findByRole('button', { name: 'Bắt đầu kiểm định' })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Xác nhận danh tính Member tại quầy/ })).toHaveAttribute('href', '/moderator/counter');
  });
  it('preserves inspection validation, numeric payload, receipt result and editor values', async () => {
    consignmentService.read.mockResolvedValue({ ...baseForm, allowedActions: ['COMPLETE_INSPECTION', 'RETURN_ONSITE'] });
    const complete = vi.spyOn(consignmentService, 'complete').mockResolvedValue({ receiptId: 'new-receipt' });
    const interaction = userEvent.setup();
    show('/moderator/consignments/form-1');
    const button = await screen.findByRole('button', { name: 'Hoàn tất PASS · tạo biên nhận' });
    expect(button).toBeDisabled();
    await interaction.type(screen.getByLabelText('Ghi chú tình trạng'), '  Tốt  ');
    await interaction.type(screen.getByLabelText('Giá chốt (VND, số nguyên)'), '1.5');
    await interaction.selectOptions(screen.getByLabelText('Độ dài kỳ'), '30');
    expect(screen.getByText('Nhập số nguyên dương hợp lệ.')).toBeInTheDocument();
    fireEvent.submit(button.closest('form'));
    expect(complete).not.toHaveBeenCalled();
    await interaction.clear(screen.getByLabelText('Giá chốt (VND, số nguyên)'));
    await interaction.type(screen.getByLabelText('Giá chốt (VND, số nguyên)'), '250000');
    await interaction.click(button);
    await screen.findByText('Receipt new-receipt');
    expect(complete.mock.calls[0].slice(0, 2)).toEqual(['form-1', {
      identityToken: 'proof-1', conditionNote: 'Tốt', agreedPrice: 250000, termLengthDays: 30,
    }]);
    expect(screen.getByLabelText('Ghi chú tình trạng')).toHaveValue('  Tốt  ');
  });
  it('preserves return reason, trimmed note and field error feedback', async () => {
    consignmentService.read.mockResolvedValue({ ...baseForm, allowedActions: ['RETURN_ONSITE'] });
    const onsite = vi.spyOn(consignmentService, 'returnOnsite').mockRejectedValue(new Phase2Error('Invalid return', 422, '', { note: 'Note error' }));
    const interaction = userEvent.setup();
    show('/moderator/consignments/form-1');
    const button = await screen.findByRole('button', { name: 'Xác nhận trả tại chỗ' });
    expect(button).toBeDisabled();
    await interaction.selectOptions(screen.getByLabelText('Kết luận'), 'FAIL');
    await interaction.type(screen.getByLabelText('Ghi chú trả tại chỗ'), '  Đường may lỗi  ');
    await interaction.click(button);
    await screen.findByText('Note error');
    expect(onsite.mock.calls[0].slice(0, 2)).toEqual(['form-1', { identityToken: 'proof-1', reason: 'FAIL', note: 'Đường may lỗi' }]);
  });
});

describe('end-of-term detail contracts (mocked services)', () => {
  function detail(action, identity = proof) {
    vi.spyOn(endTermService, 'read').mockResolvedValue({ sku: 'SKU-1', memberId: 'member-1',
      status: 'WAITING_END_OF_TERM', allowedActions: action ? [action] : [], name: 'Áo', agreedPrice: 200000 });
    return show('/moderator/end-of-term?sku=SKU-1', identity);
  }
  it('requires matching identity for handover and exposes no controls without allowed actions', async () => {
    const view = detail('HANDOVER', null);
    expect(await screen.findByRole('button', { name: 'Bàn giao nhận lại cuối kỳ' })).toBeDisabled();
    view.unmount();
    endTermService.read.mockResolvedValue({ sku: 'SKU-1', allowedActions: [] });
    show('/moderator/end-of-term?sku=SKU-1');
    await screen.findByText('Không có thao tác khả dụng ở trạng thái hiện tại.');
    expect(screen.queryByRole('button', { name: 'Chốt giá ký gửi lại' })).not.toBeInTheDocument();
  });
  it('confirms handover once and keeps the dialog open while pending', async () => {
    let finish;
    const handover = vi.spyOn(endTermService, 'handover').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const interaction = userEvent.setup();
    detail('HANDOVER');
    await interaction.click(await screen.findByRole('button', { name: 'Bàn giao nhận lại cuối kỳ' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Xác nhận', exact: true });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await interaction.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();
    expect(confirm).toBeDisabled();
    expect(handover).toHaveBeenCalledOnce();
    expect(handover.mock.calls[0].slice(0, 2)).toEqual(['SKU-1', { identityToken: 'proof-1' }]);
    await act(async () => finish(null));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('validates reconsignment, preserves numeric values and displays the new receipt', async () => {
    const reconsign = vi.spyOn(endTermService, 'reconsign').mockResolvedValue({ receiptId: 'r2' });
    const interaction = userEvent.setup();
    detail('RE_CONSIGN');
    const button = await screen.findByRole('button', { name: 'Chốt giá ký gửi lại' });
    await interaction.type(screen.getByLabelText('Giá ký gửi lại (VND)'), '0');
    expect(button).toBeDisabled();
    await interaction.clear(screen.getByLabelText('Giá ký gửi lại (VND)'));
    await interaction.type(screen.getByLabelText('Giá ký gửi lại (VND)'), '180000');
    await interaction.selectOptions(screen.getByLabelText('Độ dài kỳ mới'), '30');
    await interaction.click(button);
    expect(reconsign).not.toHaveBeenCalled();
    await interaction.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận', exact: true }));
    await screen.findByText('Receipt r2');
    expect(reconsign.mock.calls[0].slice(0, 2)).toEqual(['SKU-1', { agreedPrice: 180000, termLengthDays: 30 }]);
  });
  it('requires a partner, cancels without mutation and retains error feedback in confirmation', async () => {
    const transfer = vi.spyOn(endTermService, 'transfer').mockRejectedValue(new Phase2Error('Transfer failed', 422));
    const interaction = userEvent.setup();
    detail('TRANSFER');
    const button = await screen.findByRole('button', { name: 'Chuyển giao hàng vô thừa nhận' });
    expect(button).toBeDisabled();
    await interaction.type(screen.getByLabelText('Tên tổ chức đối tác nhận chuyển giao'), '  Đối tác  ');
    await interaction.click(button);
    await interaction.keyboard('{Escape}');
    expect(transfer).not.toHaveBeenCalled();
    await interaction.click(button);
    await interaction.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận', exact: true }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Transfer failed')).toBeInTheDocument());
    expect(transfer.mock.calls[0].slice(0, 2)).toEqual(['SKU-1', 'Đối tác']);
  });
});
