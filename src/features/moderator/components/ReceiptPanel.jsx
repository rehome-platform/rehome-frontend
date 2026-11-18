import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Input, Modal } from '../../../components/common/index.js';
import Spinner from '../../../components/common/Spinner.jsx';
import { useToast } from '../../../context/ToastContext.jsx';
import { consignmentService } from '../services/warehouseApi.js';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { canStockIn, normalizeError } from '../models/warehouseModel.js';
import { Card, ResourceState, DocumentLink, money, date } from './WarehouseUi.jsx';
import StockInForm from './StockInForm.jsx';

export default function ReceiptPanel({ receiptId, form, allowStockIn = false, onStocked, onReceiptVoided }) {
  const toast = useToast();
  const [activeReceiptId, setActiveReceiptId] = React.useState(receiptId);
  React.useEffect(() => {
    setActiveReceiptId(receiptId);
  }, [receiptId]);

  const receipt = useResource(
    (options) => consignmentService.receipt(activeReceiptId, options),
    [activeReceiptId],
    {
      poll: true,
      done: (value) =>
        Boolean(
          value?.confirmedAt ||
          value?.status === 'CONFIRMED' ||
          value?.status === 'VOIDED' ||
          value?.voidedAt,
        ),
    },
  );
  const data = receipt.data ? { ...receipt.data, productSku: receipt.data.productSku || receipt.data.sku || null } : null;
  const snapshot = data?.snapshot;
  const isVoided = data?.status === 'VOIDED' || Boolean(data?.voidedAt);
  const isConfirmed = Boolean(data?.confirmedAt || data?.status === 'CONFIRMED');
  const isPending = Boolean(data) && !isConfirmed && !isVoided;
  const canVoid = Boolean(data) && isConfirmed && !isVoided && !data.productSku;

  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = React.useState(null);
  React.useEffect(() => () => {
    if (pdfBlobUrl?.startsWith('blob:')) URL.revokeObjectURL?.(pdfBlobUrl);
  }, [pdfBlobUrl]);

  // Modal Sửa biên nhận (status = PENDING)
  const [editOpen, setEditOpen] = React.useState(false);
  const [editAgreedPrice, setEditAgreedPrice] = React.useState('');
  const [editConditionNote, setEditConditionNote] = React.useState('');
  const [editModeratorNote, setEditModeratorNote] = React.useState('');
  const [editReason, setEditReason] = React.useState('');
  const [editError, setEditError] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Modal Huỷ biên nhận (đã xác nhận, chưa nhập kho)
  const [voidOpen, setVoidOpen] = React.useState(false);
  const [voidReason, setVoidReason] = React.useState('');
  const [voidError, setVoidError] = React.useState('');
  const [voiding, setVoiding] = React.useState(false);

  const agreedPrice = data?.agreedPrice ?? snapshot?.agreedPrice;
  const floorPrice = data?.floorPrice ?? snapshot?.floorPrice;
  const termDays = data?.termLengthDays ?? snapshot?.termLengthDays;
  const commission = data?.commissionRateTerm1 ?? snapshot?.commissionRate;
  const fee = data?.withdrawalFee ?? snapshot?.fee;
  const rateText = value => value == null ? '—' : `${Math.round(Number(value) * (Number(value) <= 1 ? 100 : 1))}%`;
  const commissions = [data?.commissionRateTerm1 ?? snapshot?.commissionRate, data?.commissionRateTerm2, data?.commissionRateTerm3]
    .map(rateText).join(' → ');

  const handleOpenPdf = async () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
      return;
    }
    if (data?.pdfUrl) {
      window.open(data.pdfUrl, '_blank');
      return;
    }
    try {
      setDownloadingPdf(true);
      const res = await consignmentService.pdf(activeReceiptId);
      if (res?.pdfUrl) {
        setPdfBlobUrl(res.pdfUrl);
        window.open(res.pdfUrl, '_blank');
      }
    } catch (err) {
      console.error('Không thể tải PDF biên nhận:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const openEditModal = () => {
    setEditAgreedPrice(agreedPrice != null ? String(agreedPrice) : '');
    setEditConditionNote(data?.conditionNote || '');
    setEditModeratorNote(data?.moderatorNote || '');
    setEditReason('');
    setEditError('');
    setEditOpen(true);
  };

  const handleConfirmEdit = async (e) => {
    e?.preventDefault?.();
    const numericPrice = Number(editAgreedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setEditError('Giá chốt phải lớn hơn 0.');
      return;
    }
    if (!editConditionNote.trim()) {
      setEditError('Vui lòng nhập ghi chú tình trạng.');
      return;
    }
    if (!editReason.trim()) {
      setEditError('Vui lòng nhập lý do sửa biên nhận.');
      return;
    }
    setEditError('');
    setSavingEdit(true);
    try {
      await receipt.mutate(
        (options) =>
          consignmentService.updateReceipt(
            activeReceiptId,
            {
              agreedPrice: numericPrice,
              conditionNote: editConditionNote.trim(),
              moderatorNote: editModeratorNote.trim() || null,
              reason: editReason.trim(),
            },
            options,
          ),
        {
          onSuccess: () => {
            toast.success('Đã cập nhật biên nhận ký gửi.');
            setEditOpen(false);
          },
          onError: (normalized) => {
            if (normalized.status === 409 && normalized.code === 'RECEIPT_NOT_EDITABLE') {
              setEditError('Biên nhận đã được xác nhận, không sửa được nữa');
            } else {
              setEditError(normalized.message || 'Không thể cập nhật biên nhận.');
            }
          },
        },
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const openVoidModal = () => {
    setVoidReason('');
    setVoidError('');
    setVoidOpen(true);
  };

  const handleConfirmVoid = async (e) => {
    e?.preventDefault?.();
    const reason = voidReason.trim();
    if (!reason) {
      setVoidError('Vui lòng nhập lý do huỷ biên nhận.');
      return;
    }
    setVoidError('');
    setVoiding(true);
    try {
      await receipt.mutate(
        (options) => consignmentService.voidReceipt(activeReceiptId, reason, options),
        {
          onSuccess: (voided) => {
            toast.success('Đã huỷ biên nhận. Vui lòng lập biên nhận mới ở bước kiểm định.');
            setVoidOpen(false);
            onReceiptVoided?.(voided || data);
          },
          onError: (normalized) => {
            if (normalized.status === 409 && normalized.code === 'RECEIPT_HAS_PRODUCT') {
              setVoidError('Món đã nhập kho, không huỷ được');
            } else {
              setVoidError(normalized.message || 'Không thể huỷ biên nhận.');
            }
          },
        },
      );
    } finally {
      setVoiding(false);
    }
  };

  const previewFloorPrice = Number.isFinite(Number(editAgreedPrice)) && Number(editAgreedPrice) > 0
    ? Math.round(Number(editAgreedPrice) * 0.5)
    : null;

  return (
    <Card title="Biên nhận ký gửi & Xác nhận">
      <ResourceState resource={{ ...receipt, error: receipt.actionError ? null : receipt.error }} />
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-[#e0e0e0]">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={receipt.refresh} className="text-xs">
            Tải lại biên nhận
          </Button>
          {isPending && (
            <Button variant="outline" size="sm" onClick={openEditModal} className="text-xs font-bold border-[#006B2C] text-[#006B2C]">
              Sửa biên nhận
            </Button>
          )}
          {canVoid && (
            <Button variant="outline" size="sm" onClick={openVoidModal} className="text-xs font-bold border-red-300 text-red-700 hover:bg-red-50">
              Huỷ biên nhận
            </Button>
          )}
        </div>
        {data && (
          <span className="text-xs font-mono font-bold text-[#191C19]">
            Mã biên nhận: {data.receiptNo || data.receiptId || data.id}
          </span>
        )}
      </div>

      {data && !(receipt.error && !receipt.actionError) && (
        <div className="space-y-6 pt-2">
          {data.editedAt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              Đã sửa lúc {date(data.editedAt)}{data.editReason ? ` · ${data.editReason}` : ''}
            </div>
          )}

          {isVoided ? (
            <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Đã huỷ
                </span>
                {data.voidedAt && (
                  <span className="text-red-800 font-medium">Thời điểm: {date(data.voidedAt)}</span>
                )}
              </div>
              {data.voidReason && (
                <p className="text-red-900">
                  <strong>Lý do:</strong> {data.voidReason}
                </p>
              )}
              {data.voidedBy && (
                <p className="text-red-800 text-[11px]">
                  <strong>Người huỷ:</strong> <span className="font-mono">{data.voidedBy}</span>
                </p>
              )}
              {data.replacedByReceiptId && (
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveReceiptId(data.replacedByReceiptId)}
                    className="text-xs font-bold border-red-300 text-red-800 bg-white"
                  >
                    Xem biên nhận mới
                  </Button>
                </div>
              )}
            </div>
          ) : !isConfirmed ? (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
              {/* CỘT TRÁI: SPINNER CHỜ XÁC NHẬN */}
              <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
                <Spinner size="lg" color="#2b2b2b" className="mx-auto my-2" />
                <div>
                  <h3 className="text-lg font-bold text-[#191C19]">
                    Đang chờ khách xác nhận biên nhận
                  </h3>
                  <p className="text-xs text-[#5B6776] max-w-sm mx-auto mt-1 leading-relaxed">
                    Biên nhận đã gửi vào ứng dụng của Member. Mời khách mở app, đọc kỹ điều khoản rồi bấm xác nhận.
                  </p>
                </div>

                <div className="w-full text-left p-3.5 bg-[#f4f4f4] border border-[#2b2b2b] rounded-xl text-xs space-y-1">
                  <p className="font-bold text-[#191C19]">Chưa nhập kho được cho tới khi khách xác nhận</p>
                  <p className="text-[#5f5f5f] text-[11px] leading-relaxed">
                    Đây là chốt chặn bắt buộc: hàng chỉ lên sàn sau khi khách đồng ý với giá và điều khoản. Không có đường tắt bỏ qua bước này.
                  </p>
                </div>

                <p role="status" className="text-[11px] text-[#717971]">
                  Đang chờ Member xác nhận trên ứng dụng. Chưa thể nhập kho.
                </p>

                <div className="flex gap-2 w-full pt-2">
                  <Button
                    disabled
                    className="flex-1 text-xs py-3 bg-[#e0e0e0] text-[#717971] border border-[#c4c4c4] cursor-not-allowed"
                  >
                    Nhập kho — chờ khách xác nhận
                  </Button>
                </div>
              </div>

              {/* CỘT PHẢI: TÓM TẮT BIÊN NHẬN & BƯỚC TIẾP THEO */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#191C19] border-b border-[#e0e0e0] pb-2">
                    Biên nhận đã gửi
                  </h4>
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#5f5f5f]">Số biên nhận:</span>
                      <span className="font-bold font-mono">{data.receiptNo || data.receiptId || data.id}</span>
                    </div>
                    {agreedPrice != null && (
                      <div className="flex justify-between">
                        <span className="text-[#5f5f5f]">Giá bán thỏa thuận:</span>
                        <span className="font-bold text-[#006B2C]">{money(agreedPrice)}</span>
                      </div>
                    )}
                    {floorPrice != null && (
                      <div className="flex justify-between">
                        <span className="text-[#5f5f5f]">Giá sàn tự tính (50%):</span>
                        <span className="font-bold">{money(floorPrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#5f5f5f]">
                        Hoa hồng: {rateText(commission)}
                      </span>
                      <span className="font-bold">3 kỳ: {commissions}</span>
                    </div>
                    {termDays && (
                      <div className="flex justify-between">
                        <span className="text-[#5f5f5f]">Độ dài kỳ:</span>
                        <span>{termDays} ngày / kỳ</span>
                      </div>
                    )}
                    {data.conditionNote && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#5f5f5f]">Tình trạng:</span>
                        <span className="font-medium text-right">{data.conditionNote}</span>
                      </div>
                    )}
                    {data.moderatorNote && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#5f5f5f]">Ghi chú Moderator:</span>
                        <span className="font-medium text-right">{data.moderatorNote}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#8a8a8a] bg-[#fafafa] p-4 space-y-2.5 text-xs">
                  <h4 className="font-bold text-[#191C19]">Tiếp theo sẽ là</h4>
                  <ul className="space-y-2 text-[#5B6776] text-[11px] list-decimal list-inside">
                    <li>Nhập thông tin sản phẩm, chụp ảnh bán hàng và tách nền</li>
                    <li>Hệ thống cấp SKU, in tem dán lên món hàng</li>
                    <li>Sản phẩm sẵn sàng lên sàn ngay</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* KD-08: MEMBER ĐÃ XÁC NHẬN - CHO PHÉP NHẬP KHO */
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-[#006B2C] bg-[#E8F5E9] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#006B2C] text-white flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <div>
                    <span className="font-bold text-[#006B2C] text-sm block">
                      MEMBER ĐÃ XÁC NHẬN
                    </span>
                    <p role="status" className="text-[#414942] text-[11px]">
                      Member đã xác nhận: {date(data.confirmedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {data.pdfUrl ? (
                    <DocumentLink url={data.pdfUrl}>Mở PDF biên nhận</DocumentLink>
                  ) : (
                    <Button
                      variant="outline"
                      loading={downloadingPdf}
                      onClick={handleOpenPdf}
                      className="text-xs font-bold border-[#006B2C] text-[#006B2C]"
                    >
                      Mở PDF biên nhận
                    </Button>
                  )}
                </div>
              </div>

              {(snapshot || agreedPrice != null) && (
                <dl className="grid gap-2 text-xs sm:grid-cols-2 p-3 bg-white border border-[#e0e0e0] rounded-xl">
                  <div>Giá chốt: <strong>{money(agreedPrice)}</strong></div>
                  <div>Giá sàn: <strong>{money(floorPrice)}</strong></div>
                  <div>
                    Hoa hồng:{' '}
                    <strong>{commissions}</strong>
                  </div>
                  <div>Độ dài kỳ: <strong>{termDays != null ? `${termDays} ngày` : '—'}</strong></div>
                  {fee != null && <div>Phí rút: {money(fee)}</div>}
                </dl>
              )}

              {data.productSku && (
                <div className="space-y-3">
                  <Link className="block text-primary underline font-bold text-xs" to={`/moderator/inventory/${encodeURIComponent(data.productSku)}`}>
                    Đã nhập kho · {data.productSku}
                  </Link>
                  <Link className="inline-block rounded-xl bg-primary p-3 text-sm font-semibold text-white" to={`/moderator/consignments/print-queue?sku=${encodeURIComponent(data.productSku)}`}>
                    Đến hàng đợi in tem
                  </Link>
                </div>
              )}

              {allowStockIn && canStockIn(data) && (
                <StockInForm
                  key={activeReceiptId}
                  receipt={data}
                  form={form}
                  onSuccess={onStocked}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Sửa biên nhận (PENDING) */}
      <Modal
        isOpen={editOpen}
        onClose={() => { if (!savingEdit) setEditOpen(false); }}
        title="Sửa biên nhận ký gửi"
        size="md"
      >
        <form onSubmit={handleConfirmEdit} className="space-y-3.5 text-xs">
          <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3 space-y-1 text-[11px] text-[#5B6776]">
            <p className="font-bold text-[#191C19]">Thông số cố định (không cho sửa)</p>
            <p>Hoa hồng 3 kỳ: <strong>{commissions}</strong> · Độ dài kỳ: <strong>{termDays != null ? `${termDays} ngày` : '—'}</strong></p>
            {fee != null && <p>Phí rút giữa kỳ: <strong>{money(fee)}</strong></p>}
          </div>

          <div>
            <label htmlFor="receipt-edit-price" className="block font-bold text-[#191C19] mb-1">
              Giá chốt (đ) <span className="text-red-600">*</span>
            </label>
            <input
              id="receipt-edit-price"
              type="number"
              min="1000"
              step="1"
              value={editAgreedPrice}
              disabled={savingEdit}
              onChange={(e) => setEditAgreedPrice(e.target.value)}
              className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            />
            {previewFloorPrice != null && (
              <p className="text-[11px] text-[#5B6776] mt-1">
                Giá sàn tự tính lại (50%): <strong>{money(previewFloorPrice)}</strong>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="receipt-edit-condition" className="block font-bold text-[#191C19] mb-1">
              Ghi chú tình trạng <span className="text-red-600">*</span>
            </label>
            <textarea
              id="receipt-edit-condition"
              rows={2}
              value={editConditionNote}
              disabled={savingEdit}
              onChange={(e) => setEditConditionNote(e.target.value)}
              className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="receipt-edit-mod-note" className="block font-bold text-[#191C19] mb-1">
              Ghi chú Moderator
            </label>
            <textarea
              id="receipt-edit-mod-note"
              rows={2}
              value={editModeratorNote}
              disabled={savingEdit}
              onChange={(e) => setEditModeratorNote(e.target.value)}
              className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="receipt-edit-reason" className="block font-bold text-[#191C19] mb-1">
              Lý do sửa biên nhận <span className="text-red-600">*</span>
            </label>
            <textarea
              id="receipt-edit-reason"
              rows={2}
              value={editReason}
              disabled={savingEdit}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Nhập lý do sửa biên nhận (bắt buộc)..."
              className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          {editError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {editError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={savingEdit} onClick={() => setEditOpen(false)}>
              Đóng
            </Button>
            <Button type="submit" variant="primary" loading={savingEdit} className="bg-[#006B2C] hover:bg-[#005523] text-white font-bold">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Huỷ biên nhận (CONFIRMED, chưa nhập kho) */}
      <Modal
        isOpen={voidOpen}
        onClose={() => { if (!voiding) setVoidOpen(false); }}
        title="Huỷ biên nhận ký gửi"
        size="sm"
      >
        <form onSubmit={handleConfirmVoid} className="space-y-3.5 text-xs">
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 font-medium">
            Member sẽ phải xác nhận lại biên nhận mới. Sau khi huỷ, form sẽ quay về bước kiểm định để lập biên nhận mới (các mức phí tự giữ như bản cũ).
          </div>

          <div>
            <label htmlFor="receipt-void-reason" className="block font-bold text-[#191C19] mb-1">
              Lý do huỷ biên nhận <span className="text-red-600">*</span>
            </label>
            <textarea
              id="receipt-void-reason"
              rows={3}
              value={voidReason}
              disabled={voiding}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Nhập lý do huỷ biên nhận (bắt buộc)..."
              className="w-full rounded-xl border border-neutral bg-white px-3 py-2 text-xs text-[#191C19] focus:border-[#006B2C] focus:outline-none"
            />
          </div>

          {voidError && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {voidError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={voiding} onClick={() => setVoidOpen(false)}>
              Đóng
            </Button>
            <Button type="submit" variant="primary" loading={voiding} className="bg-red-600 hover:bg-red-700 text-white font-bold">
              Xác nhận huỷ biên nhận
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
