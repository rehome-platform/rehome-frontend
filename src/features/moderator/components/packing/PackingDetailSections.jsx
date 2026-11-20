import React, { useRef, useState } from "react";
import { safeDocumentUrl } from "../../models/warehouseModel.js";
import { warehouseDateTime } from "../../models/warehouseTime.js";
import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";
import { canPack, canShip, canHandoverToGhn } from "../../models/packingModel.js";
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
  const [previewUrl, setPreviewUrl] = useState(null);
  const busy = uploading || saving;
  const remaining = Math.max(0, 5 - photos.length);

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (selected.length > 0 && onUpload) {
      onUpload(selected);
    }
  };

  return (
    <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[#191C19]">Ảnh đóng gói đơn hàng</h3>
          <p className="text-[11px] text-[#5B6776] mt-0.5">
            Chụp tối đa 5 ảnh trước khi bàn giao GHN để làm bằng chứng đối chiếu nếu phát sinh trả hàng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0F5EE] text-[#006B2C]">
            {photos.length} / 5 ảnh
          </span>
          {lockedByShipment && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#f4f4f4] text-[#5B6776] border border-[#d4d4d4]">
              Đã khóa sau khi tạo vận đơn
            </span>
          )}
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {photos.map((url, index) => {
            const safeUrl = safeDocumentUrl(url);
            if (!safeUrl) return null;
            return (
              <div
                key={`${url}-${index}`}
                className="relative group w-24 h-24 rounded-xl overflow-hidden border border-[#c4c4c4] bg-[#f9faf9]"
              >
                <button
                  type="button"
                  onClick={() => setPreviewUrl(safeUrl)}
                  className="w-full h-full block cursor-pointer"
                  title="Phóng to ảnh đóng gói"
                >
                  <img
                    src={safeUrl}
                    alt={`Ảnh đóng gói ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
                {canEdit && !lockedByShipment && (
                  <button
                    type="button"
                    aria-label={`Xóa ảnh đóng gói ${index + 1}`}
                    disabled={busy}
                    onClick={() => onRemove?.(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-bold flex items-center justify-center hover:bg-[#BA1A1A] disabled:opacity-50 cursor-pointer"
                    title="Xóa ảnh"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[#717971]">
          {lockedByShipment
            ? 'Đơn hàng này không có ảnh đóng gói được lưu.'
            : 'Chưa có ảnh đóng gói. Bạn có thể tải ảnh kiện hàng trước khi tạo vận đơn GHN.'}
        </p>
      )}

      {canEdit && !lockedByShipment && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
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
          <Button
            type="button"
            variant="outline"
            disabled={busy || remaining === 0}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-semibold py-2 px-3.5"
          >
            {uploading ? 'Đang tải ảnh lên...' : saving ? 'Đang lưu ảnh...' : `Chọn ảnh (${remaining} còn lại)`}
          </Button>
          {busy && (
            <span role="status" className="text-xs text-[#5B6776]">
              {uploading ? 'Đang tải ảnh lên máy chủ...' : 'Đang lưu danh sách ảnh đóng gói...'}
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-semibold text-[#BA1A1A] bg-red-50 border border-red-200 rounded-lg p-2.5">
          {error}
        </p>
      )}

      {previewUrl && (
        <Modal
          isOpen={Boolean(previewUrl)}
          onClose={() => setPreviewUrl(null)}
          title="Xem ảnh đóng gói"
          size="lg"
        >
          <div className="flex flex-col items-center space-y-3">
            <img
              src={previewUrl}
              alt="Xem trước ảnh đóng gói"
              className="max-h-[70vh] max-w-full object-contain rounded-xl border border-neutral"
            />
            <div className="w-full flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewUrl(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
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
}) {

  return (
    <div className="rounded-2xl border-2 border-[#2b2b2b] bg-white p-5 space-y-4 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-[#191C19]">Quét đối chiếu mã SKU</h3>
        <span className="text-xs text-[#717971]">
          Chỉ tạo được vận đơn khi đủ {totalCount} / {totalCount} món khớp mã
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

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          disabled={!operationReady('shipment') || resource.busy || resource.loading || uncertain || !canShip(order, scope, now)}
          onClick={() => create()}
          className="py-3 px-6 bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl font-bold text-xs"
        >
          Tạo vận đơn GHN
        </Button>
      </div>
    </div>
  );
}

export function PackingItemTable({ items, pickedItems, scannedProductIds, togglePicked }) {
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
                      <img
                        src={safeDocumentUrl(item.photoUrl)}
                        alt={item.name || item.productId}
                        className="w-10 h-12 object-cover rounded border border-[#c4c4c4]"
                      />
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
    </div>
  );
}
