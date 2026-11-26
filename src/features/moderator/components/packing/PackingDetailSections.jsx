import React, { useRef, useState } from "react";
import { safeDocumentUrl } from "../../models/warehouseModel.js";
import { warehouseDateTime } from "../../models/warehouseTime.js";
import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";
import Spinner from "../../../../components/common/Spinner.jsx";
import ImageLightbox from "../../../../components/common/ImageLightbox.jsx";
import { canPack, canShip, canHandoverToGhn, hasPackingPhotos } from "../../models/packingModel.js";
import { operationReady } from "../../config/packingContract.js";
import { formatDeadlineWithCountdown } from "../WarehouseUi.jsx";

export function PackingRecipientPanel({ order, scanLogs }) {
  const recipientName = order.shippingRecipientName || order.recipientName || '—';
  const recipientPhone = order.shippingPhone || order.recipientPhone || '—';
  const shippingAddress = order.shippingAddress || '—';
  const subtotalStr = order.subtotal != null ? `${Number(order.subtotal).toLocaleString('vi-VN')}đ` : '—';
  const shippingFeeStr = order.shippingFee != null ? `${Number(order.shippingFee).toLocaleString('vi-VN')}đ` : '—';
  const totalAmountStr = order.totalAmount != null ? `${Number(order.totalAmount).toLocaleString('vi-VN')}đ` : '—';
  const PAYMENT_METHOD_LABELS = {
    WALLET: 'Ví ReHome',
    VNPAY: 'VNPay',
    BANK_TRANSFER: 'Chuyển khoản ngân hàng',
    COD: 'Thanh toán khi nhận hàng',
  };
  const paymentMethodLabel = order.paymentMethod
    ? PAYMENT_METHOD_LABELS[String(order.paymentMethod).toUpperCase()] || order.paymentMethod
    : null;
  const paymentMethodStr = paymentMethodLabel ? `Đã thu qua ${paymentMethodLabel}` : 'Đã thanh toán';
  const paidTimeStr = order.paidAt ? warehouseDateTime(order.paidAt) : "";

  return (
    <div className="space-y-5">
      {/* Người nhận hàng */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-2 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Người nhận hàng</p>
        <p className="text-sm font-bold text-[#191C19]">{recipientName}</p>
        <p className="text-[#5B6776]">{recipientPhone}</p>
        <p className="text-[#5B6776] leading-relaxed">
          {shippingAddress}
        </p>
        {order.buyerNote && (
          <div className="pt-2 border-t border-[#E2E8E0]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Ghi chú đóng gói của người mua</p>
            <p className="text-xs text-[#191C19] mt-0.5">{order.buyerNote}</p>
            <p className="text-[10px] font-semibold text-[#BA1A1A] mt-1">Đơn này không huỷ được nữa</p>
          </div>
        )}
      </div>

      {/* Thanh toán & Vận chuyển */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-3 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Thanh toán</p>
        <div className="flex justify-between text-[#5f5f5f]">
          <span>Tiền hàng</span>
          <span className="font-semibold text-[#191C19]">{subtotalStr}</span>
        </div>
        <div className="flex justify-between text-[#5f5f5f]">
          <span>Phí vận chuyển</span>
          <span className="font-semibold text-[#191C19]">{shippingFeeStr}</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-[#191C19] pt-2 border-t border-[#E2E8E0]">
          <span>{paymentMethodStr}</span>
          <span>{totalAmountStr}</span>
        </div>
        {paidTimeStr && (
          <p className="text-[10px] text-[#7a7a7a]">
            {paidTimeStr}
          </p>
        )}

        {(order.autoCompleteDeadline || order.returnDeadline) && (
          <div className="pt-2 border-t border-[#E2E8E0] space-y-1 text-[11px]">
            {order.autoCompleteDeadline && (
              <div className="flex justify-between gap-2 text-[#5f5f5f]">
                <span>Hạn tự động hoàn tất:</span>
                <span className="font-semibold text-[#191C19]">{formatDeadlineWithCountdown(order.autoCompleteDeadline)}</span>
              </div>
            )}
            {order.returnDeadline && (
              <div className="flex justify-between gap-2 text-[#5f5f5f]">
                <span>Hạn yêu cầu trả hàng:</span>
                <span className="font-semibold text-[#191C19]">{formatDeadlineWithCountdown(order.returnDeadline)}</span>
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-[#E2E8E0] flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Đơn vị vận chuyển</span>
          <span className="font-bold text-[#006B2C]">GHN Express</span>
        </div>
      </div>

      {/* Nhật ký nhập mã SKU (DG-03) */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Nhật ký nhập mã</p>
        {scanLogs.length === 0 ? (
          <p className="text-xs text-[#717971]">Chưa có lượt quét nào.</p>
        ) : (
          <div className="divide-y divide-[#E2E8E0] text-xs">
            {scanLogs.map((log, i) => (
              <div key={i} className="py-2 space-y-0.5">
                <p className="font-bold text-[#191C19]">{log.time} · {log.code}</p>
                <p className={log.matched ? 'text-[#006B2C] font-semibold' : 'text-[#BA1A1A] font-semibold'}>
                  {log.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PackingShipmentPanel({ order, onOpenPrintModal, onHandover, handoverLoading = false }) {
  const isHandedOver = ['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order?.status);
  const canConfirmHandover = canHandoverToGhn(order) && typeof onHandover === 'function';

  return (
    <div className="rounded-2xl border-2 border-[#006B2C] bg-white p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[#006B2C]">Vận đơn đã tạo thành công</h3>
          <p className="text-xs text-[#5B6776] mt-0.5">
            Thời điểm tạo vận đơn: {warehouseDateTime(order?.shipmentCreatedAt)}
          </p>
        </div>
        {isHandedOver && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]">
            Đã bàn giao cho GHN
          </span>
        )}
      </div>

      <div className="p-4 rounded-xl border border-[#2b2b2b] bg-[#f9faf9] space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Mã vận đơn GHN</p>
        <p className="text-2xl font-mono font-extrabold text-[#191C19] tracking-wider">
          {order?.ghnTrackingCode || 'Chưa có thông tin'}
        </p>
        <div className="flex justify-between text-xs text-[#5f5f5f] pt-1 border-t border-[#e0e0e0]">
          <span>Dự kiến lấy hàng:</span>
          <span className="font-semibold text-[#191C19]">Chưa có thông tin</span>
        </div>
        <div className="flex justify-between text-xs text-[#5f5f5f]">
          <span>Dự kiến giao:</span>
          <span className="font-semibold text-[#191C19]">{warehouseDateTime(order?.expectedDeliveryDate)}</span>
        </div>
        {isHandedOver && order?.handedOverAt && (
          <div className="flex justify-between text-xs text-[#5f5f5f] pt-1 border-t border-[#e0e0e0]">
            <span>Thời điểm bàn giao GHN:</span>
            <span className="font-semibold text-[#006B2C]">{warehouseDateTime(order.handedOverAt)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onOpenPrintModal} disabled={!order.ghnTrackingCode}>In vận đơn A5</Button>
        {canConfirmHandover && (
          <Button
            variant="outline"
            disabled={handoverLoading || !operationReady('ghnHandover')}
            onClick={onHandover}
            className="border-[#006B2C] text-[#006B2C] hover:bg-[#E8F5E9] font-bold"
          >
            {handoverLoading ? 'Đang xác nhận...' : 'Xác nhận bàn giao GHN'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function PackingPhotosPanel({
  photos = [],
  canEdit = false,
  lockedByShipment = false,
  uploading = false,
  saving = false,
  error = '',
  onUpload,
  onRemove,
}) {
  const fileInputRef = useRef(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const busy = uploading || saving;
  const editable = canEdit && !lockedByShipment;
  const remaining = Math.max(0, 5 - photos.length);
  const safePhotos = photos.map((url) => safeDocumentUrl(url)).filter(Boolean);
  const hasPhotos = photos.length > 0;

  const triggerFilePicker = () => {
    if (!editable || busy || remaining === 0) return;
    fileInputRef.current?.click();
  };

  const forwardFiles = (fileList) => {
    const selected = Array.from(fileList || []);
    if (selected.length > 0 && onUpload) {
      onUpload(selected);
    }
  };

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    forwardFiles(selected);
  };

  const handleDragOver = (event) => {
    if (!editable || busy || remaining === 0) return;
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    if (!editable || busy || remaining === 0) return;
    forwardFiles(event.dataTransfer?.files);
  };

  return (
    <div
      id="packing-photos-panel"
      className="rounded-2xl border border-[#DDE5D9] bg-white p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(25,28,25,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F0F5EE] text-[#006B2C] flex items-center justify-center shrink-0 border border-[#DDE5D9]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[#191C19]">Ảnh đóng gói đơn hàng</h3>
              {!lockedByShipment && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    hasPhotos
                      ? 'bg-[#ECFDF3] text-[#006B2C] border-[#ABEFC6]'
                      : 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
                  }`}
                >
                  {hasPhotos ? 'Đã đủ điều kiện tạo vận đơn' : 'Bắt buộc • tối thiểu 1 ảnh'}
                </span>
              )}
            </div>
            <p className="text-xs text-[#5B6776] mt-0.5">
              Chụp kiện hàng và tem nhãn trước khi bàn giao GHN để làm bằng chứng đối chiếu nếu phát sinh trả hàng.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F0F5EE] text-[#006B2C] border border-[#D4E4CF]">
            {photos.length} / 5 ảnh
          </span>
          {lockedByShipment && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F4F6F4] text-[#5B6776] border border-[#DDE5D9]">
              Đã khóa sau khi tạo vận đơn
            </span>
          )}
        </div>
      </div>

      {editable && (
        <input
          ref={fileInputRef}
          id="packing-photo-input"
          aria-label="Tải ảnh đóng gói"
          type="file"
          accept="image/*"
          multiple
          disabled={busy || remaining === 0}
          onChange={handleFileChange}
          className="hidden"
        />
      )}

      {hasPhotos ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {photos.map((url, index) => {
            const safeUrl = safeDocumentUrl(url);
            if (!safeUrl) return null;
            return (
              <div
                key={`${url}-${index}`}
                className="relative group aspect-square rounded-xl overflow-hidden border border-[#DDE5D9] bg-[#FAFBF9] shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    const idx = safePhotos.indexOf(safeUrl);
                    setLightboxIndex(idx >= 0 ? idx : 0);
                  }}
                  className="w-full h-full block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#006B2C]"
                  title="Phóng to ảnh đóng gói"
                >
                  <img
                    src={safeUrl}
                    alt={`Ảnh đóng gói ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="pointer-events-none absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-semibold">
                    #{index + 1}
                  </span>
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 py-1 bg-gradient-to-t from-black/60 to-transparent text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Phóng to
                  </span>
                </button>
                {editable && (
                  <button
                    type="button"
                    aria-label={`Xóa ảnh đóng gói ${index + 1}`}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove?.(index);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#191C19]/75 text-white text-xs font-bold flex items-center justify-center hover:bg-[#B42318] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Xóa ảnh"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {editable && remaining > 0 && (
            <button
              type="button"
              data-testid="packing-photo-dropzone"
              disabled={busy}
              onClick={triggerFilePicker}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 p-3 text-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isDragOver
                  ? 'border-[#006B2C] bg-[#F2F7F0] text-[#006B2C]'
                  : 'border-[#B8C7B4] bg-[#FAFBF9] text-[#3F493E] hover:border-[#006B2C] hover:bg-[#F6F9F4]'
              }`}
            >
              <span className="w-8 h-8 rounded-full bg-[#E6EFE2] text-[#006B2C] flex items-center justify-center text-lg font-bold leading-none">
                +
              </span>
              <span className="text-xs font-bold text-[#191C19]">
                {uploading ? 'Đang tải...' : saving ? 'Đang lưu...' : 'Thêm ảnh'}
              </span>
              <span className="text-[11px] text-[#5B6776]">Còn {remaining} ảnh</span>
            </button>
          )}
        </div>
      ) : editable ? (
        <div
          role="button"
          tabIndex={busy ? -1 : 0}
          data-testid="packing-photo-dropzone"
          onClick={triggerFilePicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              triggerFilePicker();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-6 sm:p-7 flex flex-col items-center justify-center text-center gap-2.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006B2C] ${
            isDragOver
              ? 'border-[#006B2C] bg-[#F2F7F0]'
              : 'border-[#B8C7B4] bg-[#FAFBF9] hover:border-[#006B2C] hover:bg-[#F6F9F4]'
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-[#E6EFE2] text-[#006B2C] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#191C19]">
              Kéo thả hoặc nhấn để tải ảnh đóng gói
            </p>
            <p className="text-xs text-[#5B6776]">
              Hỗ trợ JPG, PNG, WEBP • Tối đa 5 ảnh • Cần ít nhất 1 ảnh trước khi tạo vận đơn GHN
            </p>
          </div>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-[#006B2C] px-4 py-2 text-xs font-bold text-white shadow-xs">
            {uploading ? 'Đang tải ảnh lên...' : saving ? 'Đang lưu ảnh...' : `Chọn ảnh (${remaining} còn lại)`}
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-[#DDE5D9] bg-[#FAFBF9] px-4 py-5 text-center">
          <p className="text-xs font-medium text-[#5B6776]">
            {lockedByShipment
              ? 'Đơn hàng này không có ảnh đóng gói được lưu.'
              : 'Chưa có ảnh đóng gói. Bạn cần tải ảnh kiện hàng trước khi tạo vận đơn GHN.'}
          </p>
        </div>
      )}

      {busy && (
        <div role="status" className="flex items-center gap-2 text-xs font-medium text-[#3F493E] bg-[#F6F9F4] border border-[#DDE5D9] rounded-xl px-3.5 py-2.5">
          <Spinner size="sm" />
          <span>{uploading ? 'Đang tải ảnh lên máy chủ...' : 'Đang lưu danh sách ảnh đóng gói...'}</span>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-semibold text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA] rounded-xl p-3">
          {error}
        </p>
      )}

      {lightboxIndex !== null && safePhotos.length > 0 && (
        <ImageLightbox
          isOpen={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          images={safePhotos}
          initialIndex={lightboxIndex ?? 0}
          categoryLabel="Ảnh đóng gói đơn hàng"
        />
      )}
    </div>
  );
}

export function PackingScanPanel({
  totalCount,
  order,
  scope,
  now,
  scan,
  sku,
  input,
  setSku,
  uncertain,
  resource,
  setCamera,
  message,
  create,
  packingPhotos = [],
  packingPhotosBusy = false,
  canEditPhotos = false,
}) {
  const hasPhotos = hasPackingPhotos(order, packingPhotos);
  const photoCount = (Array.isArray(packingPhotos) && packingPhotos.length > 0
    ? packingPhotos
    : Array.isArray(order?.packingPhotoUrls)
      ? order.packingPhotoUrls
      : []
  ).filter((url) => (typeof url === 'string' ? url.trim().length > 0 : Boolean(url))).length;
  const scannedCount = order?.scannedCount ?? 0;
  const skuReady = totalCount > 0 && scannedCount >= totalCount;
  const canCreateShipment =
    operationReady('shipment') &&
    !resource.busy &&
    !resource.loading &&
    !uncertain &&
    !packingPhotosBusy &&
    canShip(order, scope, now, packingPhotos);

  const handleJumpToPhotos = () => {
    const panel = document.getElementById('packing-photos-panel');
    panel?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const inputEl = document.getElementById('packing-photo-input');
    inputEl?.click?.();
  };

  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-sm font-bold text-[#191C19]">Quét đối chiếu mã SKU</h3>
        <span className="text-xs text-[#717971]">
          Chỉ tạo được vận đơn khi đủ {totalCount} / {totalCount} món khớp mã và có ảnh đóng gói
        </span>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const val = (input?.current?.value || sku || '').trim();
          scan(val);
        }}
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="sku-input" className="block text-xs font-bold text-[#191C19] mb-1">
            SKU
          </label>
          <input
            ref={input}
            id="sku-input"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Nhập mã SKU trên tem sản phẩm (vd: RH-A7F31K)..."
            className="w-full rounded-xl border-2 border-[#2b2b2b] px-3.5 py-2 text-sm font-mono font-bold focus:border-[#006B2C] focus:outline-none"
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          disabled={!operationReady('scan') || uncertain || resource.busy || resource.loading || !canPack(order, scope, now)}
          className="py-2.5 px-5 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
        >
          Đối chiếu
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!operationReady('scan') || uncertain || resource.busy || !canPack(order, scope, now)}
          onClick={() => setCamera(true)}
          className="py-2.5 px-3.5 text-xs font-semibold"
        >
          Quét camera
        </Button>
      </form>

      {message && (
        <p
          role="status"
          className={`text-xs font-bold p-2.5 rounded-lg border ${message.toLowerCase().includes('không') || message.toLowerCase().includes('lỗi') || message.toLowerCase().includes('sai') ? 'bg-red-50 text-[#BA1A1A] border-red-200' : 'bg-green-50 text-[#006B2C] border-green-200'
            }`}
        >
          {message}
        </p>
      )}

      {(uncertain || order.shipmentOutcome === 'UNKNOWN') && (
        <p role="status" className="text-xs text-[#D97706] font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200">
          Đang kiểm tra kết quả tạo vận đơn. Chưa thể tạo mới.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
            skuReady
              ? 'bg-[#ECFDF3] text-[#006B2C] border-[#ABEFC6]'
              : 'bg-[#FAFBF9] text-[#5B6776] border-[#DDE5D9]'
          }`}
        >
          {skuReady ? `✓ Đủ SKU (${scannedCount}/${totalCount})` : `Quét SKU (${scannedCount}/${totalCount})`}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
            hasPhotos
              ? 'bg-[#ECFDF3] text-[#006B2C] border-[#ABEFC6]'
              : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
          }`}
        >
          {hasPhotos ? `✓ Đã có ${photoCount} ảnh đóng gói` : 'Chưa có ảnh đóng gói'}
        </span>
      </div>

      {!hasPhotos && (
        <div
          data-testid="packing-photo-required-notice"
          role="status"
          className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-3.5 py-2.5 text-xs text-[#B54708]"
        >
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" aria-hidden="true">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">
              Vui lòng tải lên ít nhất 1 ảnh đóng gói trước khi bấm Tạo vận đơn GHN.
            </span>
          </div>
          {canEditPhotos && !order?.ghnTrackingCode && (
            <button
              type="button"
              onClick={handleJumpToPhotos}
              className="px-3 py-1 rounded-lg bg-white border border-[#FEDF89] text-[#B54708] font-bold hover:bg-[#FEF0C7] transition-colors cursor-pointer shrink-0"
            >
              Tải ảnh ngay
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <Button
          disabled={!canCreateShipment}
          onClick={() => create()}
          className="py-3 px-6 bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tạo vận đơn GHN
        </Button>
      </div>
    </div>
  );
}

export function PackingItemTable({ items, pickedItems, scannedProductIds, togglePicked }) {
  const [lightboxState, setLightboxState] = useState(null);
  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] font-bold uppercase tracking-wider text-[#5f5f5f]">
              <th className="py-2.5 px-3 w-10 text-center">Lấy</th>
              <th className="py-2.5 px-3 w-14">Ảnh</th>
              <th className="py-2.5 px-3">Mã SKU</th>
              <th className="py-2.5 px-3">Sản phẩm</th>
              <th className="py-2.5 px-3">Cỡ</th>
              <th className="py-2.5 px-3 text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {items.map((item) => {
              const isPicked = !!pickedItems[item.productId];
              const isScanned = scannedProductIds.includes(item.productId);
              return (
                <tr key={item.productId} className={`hover:bg-[#fcfdfc] ${isScanned ? 'bg-[#F0F5EE]' : ''}`}>
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isPicked || isScanned}
                      disabled={isScanned}
                      onChange={() => togglePicked(item.productId)}
                      className="rounded disabled:opacity-60"
                      aria-label={`Đã lấy ${item.productId}`}
                    />
                  </td>
                  <td className="py-3 px-3">
                    {safeDocumentUrl(item.photoUrl) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxState({
                            images: [safeDocumentUrl(item.photoUrl)],
                            title: item.name || item.productId,
                          });
                        }}
                        className="w-10 h-12 rounded overflow-hidden border border-[#c4c4c4] block cursor-zoom-in hover:ring-2 hover:ring-[#006B2C]/40"
                        title="Phóng to ảnh sản phẩm"
                      >
                        <img
                          src={safeDocumentUrl(item.photoUrl)}
                          alt={item.name || item.productId}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-10 h-12 rounded border border-[#c4c4c4] bg-[#f4f4f4] flex items-center justify-center text-[10px] text-[#717971]">
                        Món
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-[#191C19]">
                    {item.productId}
                  </td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-[#191C19]">{item.name || item.productId}</p>
                    {(item.brand || item.condition) && (
                      <p className="text-[11px] text-[#717971]">{[item.brand, item.condition].filter(Boolean).join(' · ')}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium text-[#414942]">
                    {item.size || '—'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${isScanned ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]' : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'}`}>
                      {isScanned ? 'Đã khớp' : 'Chờ quét'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lightboxState && (
        <ImageLightbox
          isOpen={Boolean(lightboxState)}
          onClose={() => setLightboxState(null)}
          images={lightboxState?.images || []}
          initialIndex={0}
          title={lightboxState?.title || ''}
        />
      )}
    </div>
  );
}
