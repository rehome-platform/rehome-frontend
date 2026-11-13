import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL as base } from '../../src/configs/api.config.js';
import { Phase2Provider, usePhase2 } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import ConsignmentDetailPage from '../../src/features/moderator/pages/ConsignmentDetailPage.jsx';
import ConsignmentListPage from '../../src/features/moderator/pages/ConsignmentListPage.jsx';
import ConsignmentPrintQueuePage from '../../src/features/moderator/pages/ConsignmentPrintQueuePage.jsx';
import ReceiptPanel from '../../src/features/moderator/components/ReceiptPanel.jsx';
import { consignmentService, skuLabelService } from '../../src/features/moderator/services/warehouseApi.js';

const auth = vi.hoisted(() => ({ isAuthenticated: true, user: { id: 'mod-a', role: 'staff', warehouseId: 'wh-a' } }));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));
vi.mock('../../src/layouts/ModeratorLayout.jsx', () => ({ default: ({ children }) => <main>{children}</main> }));
const server = setupServer();
const json = result => HttpResponse.json({ result });
const detailPath = `${base}/moderator/consignment-forms/form-1`;
const receiptPath = `${base}/consignment-receipts/receipt-1`;
let state;
let requests;
let downloadClick;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  URL.createObjectURL = vi.fn(() => 'blob:label-pdf');
  URL.revokeObjectURL = vi.fn();
});
afterAll(() => {
  server.close();
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});
afterEach(() => { server.resetHandlers(); vi.useRealTimers(); });
const form = () => ({ id: 'form-1', productName: 'Áo Zara', status: 'INSPECTING', claimedBy: 'mod-a', memberId: 'member-1',
  member: { id: 'member-1', fullName: 'Nguyễn An' }, categoryId: 'cat-1', brandId: 'brand-1', size: 'M',
  description: 'Ghi chú bán hàng', receiptId: state.created ? 'receipt-1' : null,
  resumeStep: !state.created ? 'INSPECTION' : state.sku ? 'PRINT' : state.confirmed ? 'STOCK_IN' : 'WAITING_CONFIRMATION', productSku: state.sku });
const receipt = () => ({ id: 'receipt-1', formId: 'form-1', receiptNo: 'KG-001', productName: 'Áo Zara',
  agreedPrice: 850000, floorPrice: 425000, conditionNote: 'Còn mới', size: 'M', categoryId: 'cat-1', brandId: 'brand-1',
  confirmedAt: state.confirmed ? '2026-11-01T03:00:00Z' : null, sku: state.sku });
const label = { sku: 'Q7-AO-000001', name: 'Áo Zara', brandName: 'Zara', categoryName: 'Áo', size: 'M', warehouseName: 'Kho A' };
beforeEach(() => {
  state = { created: false, confirmed: false, sku: null };
  localStorage.clear();
  requests = { complete: 0, create: [], stages: [], pdf: 0, mark: 0, receipt: 0 };
  downloadClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  server.use(
    http.get(detailPath, () => json(form())),
    http.get(`${base}/moderator/consignment-forms`, ({ request }) => {
      const stage = new URL(request.url).searchParams.get('stage');
      requests.stages.push(stage);
      if (stage === 'STOCKED_TODAY') {
        return json({ content: state.sku ? [form()] : [], totalElements: state.sku ? 1 : 0, totalPages: 1, page: 0 });
      }
      return json({ content: [form()], totalElements: 1, totalPages: 1, page: 0 });
    }),
    http.post(`${base}/consignment-forms/form-1/inspection/complete`, async ({ request }) => {
      requests.complete++; await request.json(); state.created = true; return json({ receiptId: 'receipt-1' });
    }),
    http.get(receiptPath, () => { requests.receipt++; return json(receipt()); }),
    http.get(`${base}/categories`, ({ request }) => json(new URL(request.url).searchParams.get('status') === 'HIDDEN' ? [] : [
      { id: 'cat-1', name: 'Áo', tryonSlot: 'TOP', status: 'ACTIVE' },
      { id: 'cat-2', name: 'Túi xách', tryonSlot: 'NONE', status: 'ACTIVE' },
    ])),
    http.get(`${base}/brands`, ({ request }) => json(new URL(request.url).searchParams.get('status') === 'HIDDEN' ? [] : [{ id: 'brand-1', name: 'Zara' }])),
    http.post(`${base}/uploads`, () => json({ url: 'https://cdn.test/photo.jpg' })),
    http.post(`${base}/products`, async ({ request }) => {
      requests.create.push(await request.json()); state.sku = label.sku; return json({ id: label.sku });
    }),
    http.get(`${base}/products/:sku/sku-label`, ({ params }) => {
      expect(params.sku).toBe(label.sku); requests.pdf++;
      return new HttpResponse('%PDF-1.4\n%%EOF', { headers: { 'Content-Type': 'application/pdf' } });
    }),
  );
});
function Identity({ enabled }) {
  const { setIdentity } = usePhase2();
  React.useEffect(() => { if (enabled) setIdentity({ memberId: 'member-1', identityToken: 'proof' }); }, [enabled, setIdentity]);
  return null;
}
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function app(entry = '/moderator/consignments/form-1', identity = false) {
  return render(<MemoryRouter initialEntries={[entry]}><Phase2Provider><Identity enabled={identity} /><Location /><Routes>
    <Route path="/moderator/consignments" element={<ConsignmentListPage />} />
    <Route path="/moderator/consignments/print-queue" element={<ConsignmentPrintQueuePage />} />
    <Route path="/moderator/consignments/:formId" element={<ConsignmentDetailPage />} />
  </Routes></Phase2Provider></MemoryRouter>);
}
async function completeInspection(user) {
  await screen.findByRole('heading', { name: /Áo Zara/ });
  for (const box of screen.getAllByRole('checkbox')) await user.click(box);
  await user.type(screen.getByPlaceholderText(/Mô tả độ mới/), 'Còn mới');
  await user.type(screen.getByPlaceholderText(/VD: 850000/), '850000');
  await user.selectOptions(screen.getByLabelText(/Độ dài kỳ ký gửi/), '30');
  await user.click(screen.getByRole('button', { name: /Đạt kiểm định/ }));
}
async function stock(user) {
  await screen.findByLabelText('Tên sản phẩm');
  await waitFor(() => expect(screen.getByLabelText('Danh mục')).toHaveValue('cat-1'));
  expect(screen.getByLabelText('Tên sản phẩm')).toHaveValue('Áo Zara');
  expect(screen.getByLabelText('Thương hiệu')).toHaveValue('brand-1');
  await user.selectOptions(screen.getByLabelText('Màu sắc'), 'Be');
  await user.upload(screen.getByLabelText('Ảnh sản phẩm'), new File(['image'], 'photo.png', { type: 'image/png' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Nhập kho · tạo SKU' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'Nhập kho · tạo SKU' }));
}

describe('L-02 HTTP workflow', () => {
  it('creates once, leaves and resumes waiting, stocks after confirmation and downloads a real PDF', async () => {
    const user = userEvent.setup();
    const first = app(undefined, true);
    await completeInspection(user);
    await screen.findByText('Đang chờ khách xác nhận biên nhận');
    expect(screen.queryByRole('button', { name: /Đạt kiểm định/ })).not.toBeInTheDocument();
    expect(requests.complete).toBe(1);
    await user.click(screen.getByRole('link', { name: 'Thoát về danh sách' }));
    await screen.findByRole('link', { name: 'Chờ xác nhận' });
    expect(requests.stages).toContain('INSPECTING');
    expect(screen.getByText('Bạn đang nhận việc này')).toBeInTheDocument();
    first.unmount();
    app();
    await screen.findByText('Đang chờ khách xác nhận biên nhận');
    state.confirmed = true;
    await user.click(screen.getByRole('button', { name: 'Tải lại biên nhận' }));
    await stock(user);
    await screen.findByRole('heading', { name: 'Hàng đợi in tem' });
    expect(screen.getByTestId('location')).toHaveTextContent(`print-queue?sku=${label.sku}`);
    // Món vừa nhập kho được chọn sẵn khi mở từ bước nhập kho
    await waitFor(() => expect(screen.getByRole('checkbox', { name: `Chọn ${label.sku}` })).toBeChecked());
    await user.click(screen.getByRole('button', { name: 'Tải PDF 1 tem' }));
    await screen.findByText('Đã tải PDF 1 tem và cập nhật hàng đợi.');
    expect(requests.create).toEqual([expect.objectContaining({ receiptId: 'receipt-1', categoryId: 'cat-1', brandId: 'brand-1', color: 'Be', description: 'Ghi chú bán hàng', photoUrls: ['https://cdn.test/photo.jpg'] })]);
    expect(requests.pdf).toBe(1); expect(downloadClick).toHaveBeenCalledOnce();
    expect(requests.stages).toContain('STOCKED_TODAY');
    expect(JSON.parse(localStorage.getItem('rehome_printed_sku_labels'))).toEqual([label.sku]);
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: `Chọn ${label.sku}` })).not.toBeInTheDocument());
  });

  it('recovers an existing receipt on the specific 409 without submitting twice', async () => {
    server.use(http.post(`${base}/consignment-forms/form-1/inspection/complete`, () => {
      requests.complete++; state.created = true;
      return HttpResponse.json({ code: 'CONSIGNMENT_RECEIPT_ALREADY_EXISTS' }, { status: 409 });
    }));
    app(undefined, true); await completeInspection(userEvent.setup());
    await screen.findByText('Đang chờ khách xác nhận biên nhận');
    expect(requests.complete).toBe(1);
  });

  it('keeps inspection available for other conflicts without resubmitting', async () => {
    server.use(http.post(`${base}/consignment-forms/form-1/inspection/complete`, () => {
      requests.complete++;
      return HttpResponse.json({ code: 'CONSIGNMENT_FORM_NOT_INSPECTING' }, { status: 409 });
    }));
    app(undefined, true); await completeInspection(userEvent.setup());
    await screen.findByText('Dữ liệu đã thay đổi. Vui lòng kiểm tra trạng thái mới.');
    expect(screen.queryByText('Đang chờ khách xác nhận biên nhận')).not.toBeInTheDocument();
    expect(requests.complete).toBe(1);
  });

  it('does not turn a permission failure into a waiting screen', async () => {
    server.use(http.get(detailPath, () => HttpResponse.json({ message: 'Forbidden' }, { status: 403 })));
    app(); await screen.findByText('Tài khoản hiện tại chưa được phép xem chi tiết ký gửi này');
    expect(screen.queryByText('Đang chờ khách xác nhận biên nhận')).not.toBeInTheDocument();
  });

  it('recovers the existing SKU after losing the stock-in response', async () => {
    state.created = true; state.confirmed = true;
    server.use(http.post(`${base}/products`, () => { requests.create.push({}); state.sku = label.sku; return HttpResponse.error(); }));
    app(); await stock(userEvent.setup());
    await screen.findByText(`Sản phẩm đã tồn tại · ${label.sku}`);
    expect(requests.create).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Nhập kho · tạo SKU' })).not.toBeInTheDocument();
  });

  it('keeps new brand selection and form input without web AI try-on/background-removal UI', async () => {
    state.created = true; state.confirmed = true;
    server.use(
      http.get(detailPath, () => json({ ...form(), categoryId: '', brandId: '' })),
      http.get(receiptPath, () => json({ ...receipt(), categoryId: '', brandId: '' })),
      http.post(`${base}/brands`, async ({ request }) => { expect((await request.json()).name).toBe('New Brand'); return json({ id: 'brand-2', name: 'New Brand' }); }),
    );
    const user = userEvent.setup(); app();
    await screen.findByLabelText('Danh mục');
    expect(screen.queryByText(/Ảnh dùng cho thử đồ AI/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Danh mục'), 'cat-2');
    expect(screen.queryByText(/Không cần tách nền/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Đang tách nền/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Thêm nhanh thương hiệu' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Tên thương hiệu'), 'New Brand');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu thương hiệu' }));
    await waitFor(() => expect(screen.getByLabelText('Thương hiệu')).toHaveValue('brand-2'));
    expect(screen.getByLabelText('Tên sản phẩm')).toHaveValue('Áo Zara');
  });

  it('keeps selection on PDF failure and retries marking without generating a second PDF', async () => {
    state.sku = label.sku;
    let failPdf = true;
    server.use(
      http.get(`${base}/products/:sku/sku-label`, () => {
        requests.pdf++;
        return failPdf ? new HttpResponse(null, { status: 500 }) : new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } });
      }),
    );
    const mark = vi.spyOn(skuLabelService, 'markPrinted').mockRejectedValueOnce(new Error('storage unavailable'));
    const user = userEvent.setup(); app('/moderator/consignments/print-queue');
    await user.click(await screen.findByRole('checkbox', { name: `Chọn ${label.sku}` }));
    await user.click(screen.getByRole('button', { name: 'Tải PDF 1 tem' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('checkbox', { name: `Chọn ${label.sku}` })).toBeChecked();
    expect(mark).not.toHaveBeenCalled();
    failPdf = false;
    await user.click(screen.getByRole('button', { name: 'Tải PDF 1 tem' }));
    await screen.findByText(/Đã tải PDF nhưng chưa cập nhật hàng đợi/);
    await user.click(screen.getByRole('button', { name: 'Thử lại cập nhật hàng đợi' }));
    await screen.findByText('Đã tải PDF 1 tem và cập nhật hàng đợi.');
    expect(requests.pdf).toBe(2); expect(mark).toHaveBeenCalledTimes(2);
  });

  it('keeps the stage valid for every tab (STOCKED -> STOCKED_TODAY, REJECTED filtered client-side)', async () => {
    const seen = [];
    server.use(http.get(`${base}/moderator/consignment-forms`, ({ request }) => {
      seen.push(new URL(request.url).searchParams.get('stage'));
      return json({ content: [{ ...form(), status: 'REJECTED' }, { ...form(), id: 'form-2', status: 'PENDING' }], totalPages: 1 });
    }));
    expect(await consignmentService.listForms({ status: 'STOCKED' })).toMatchObject({ items: expect.any(Array) });
    const rejected = await consignmentService.listForms({ status: 'REJECTED' });
    expect(rejected.items.map(item => item.status)).toEqual(['REJECTED']);
    expect(seen).toEqual(['STOCKED_TODAY', null]);
  });

  it('normalizes receipt SKU and does not invent an assignee', async () => {
    state.sku = label.sku;
    expect((await consignmentService.receipt('receipt-1')).productSku).toBe(label.sku);
    server.use(http.get(detailPath, () => json({ ...form(), claimedBy: null })));
    expect((await consignmentService.read('form-1', { scope: { userId: 'mod-a' } })).claimedBy).toBeNull();
  });

  it('uses backend pagination and the selected stage for the form list', async () => {
    server.use(http.get(`${base}/moderator/consignment-forms`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get('stage')).toBe('INSPECTING');
      expect(query.get('page')).toBe('2');
      expect(query.get('size')).toBe('20');
      return json({ content: [form()], page: 2, totalPages: 4, totalElements: 65 });
    }));
    app('/moderator/consignments?status=INSPECTING&page=2');
    await screen.findByRole('link', { name: 'Tiếp tục kiểm định' });
    expect(screen.getByRole('tab', { name: 'Đang kiểm định' })).toHaveAttribute('aria-selected', 'true');
  });

  it('polls at five seconds, pauses while hidden, stops after confirmation and aborts on leaving', async () => {
    vi.useFakeTimers();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const read = vi.spyOn(consignmentService, 'receipt').mockResolvedValue({ id: 'receipt-1', confirmedAt: null });
    const view = render(<MemoryRouter><Phase2Provider><ReceiptPanel receiptId="receipt-1" /></Phase2Provider></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(read).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(read).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(read).toHaveBeenCalledTimes(2);
    visibility.mockReturnValue('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(read).toHaveBeenCalledTimes(3);
    read.mockResolvedValue({ id: 'receipt-1', confirmedAt: '2026-11-01T03:00:00Z', sku: label.sku });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(read).toHaveBeenCalledTimes(4);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(read).toHaveBeenCalledTimes(4);
    const signal = read.mock.calls[0][1].signal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it('requires a manual refresh after ten minutes of waiting', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const read = vi.spyOn(consignmentService, 'receipt').mockResolvedValue({ id: 'receipt-1', confirmedAt: null });
    render(<MemoryRouter><Phase2Provider><ReceiptPanel receiptId="receipt-1" /></Phase2Provider></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(600000); });
    expect(screen.getByText(/Đã dừng tự cập nhật sau 10 phút/)).toBeInTheDocument();
    const before = read.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(read).toHaveBeenCalledTimes(before);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tải lại biên nhận' })); });
    expect(read).toHaveBeenCalledTimes(before + 1);
  });
});
