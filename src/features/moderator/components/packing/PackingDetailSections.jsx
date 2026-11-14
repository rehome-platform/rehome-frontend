import React from "react";
import { safeDocumentUrl } from "../../models/warehouseModel.js";
import { warehouseDateTime } from "../../models/warehouseTime.js";
import Button from "../../../../components/common/Button.jsx";
import { canPack, canShip } from "../../models/packingModel.js";
import { operationReady } from "../../config/packingContract.js";
import { useToast } from "../../../../context/ToastContext.jsx";
import { formatDeadlineWithCountdown } from "../WarehouseUi.jsx";

export function PackingRecipientPanel({ order, scanLogs }) {
  const recipientName = order.shippingRecipientName || order.recipientName || '—';
  const recipientPhone = order.shippingPhone || order.recipientPhone || '—';
  const shippingAddress = order.shippingAddress || '—';
  const subtotalStr = order.subtotal != null ? `${Number(order.subtotal).toLocaleString('vi-VN')}đ` : '—';
  const shippingFeeStr = order.shippingFee != null ? `${Number(order.shippingFee).toLocaleString('vi-VN')}đ` : '—';
  const totalAmountStr = order.totalAmount != null ? `${Number(order.totalAmount).toLocaleString('vi-VN')}đ` : '—';
  const paymentMethodStr = order.paymentMethod ? `Đã thu qua ${order.paymentMethod}` : 'Đã thanh toán';
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

export function PackingShipmentPanel({ order, onOpenPrintModal }) {
  const toast = useToast();
  return (
    <div className="rounded-2xl border-2 border-[#006B2C] bg-white p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
      <div>
        <h3 className="text-base font-bold text-[#006B2C]">Vận đơn đã tạo thành công</h3>
        <p className="text-xs text-[#5B6776] mt-0.5">
          Thời điểm tạo vận đơn: {warehouseDateTime(order.shipmentCreatedAt)}
        </p>
      </div>

      <div className="p-4 rounded-xl border border-[#2b2b2b] bg-[#f9faf9] space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Mã vận đơn GHN</p>
        <p className="text-2xl font-mono font-extrabold text-[#191C19] tracking-wider">
          {order.ghnTrackingCode || 'Chưa có thông tin'}
        </p>
        <div className="flex justify-between text-xs text-[#5f5f5f] pt-1 border-t border-[#e0e0e0]">
          <span>Dự kiến lấy hàng:</span>
          <span className="font-semibold text-[#191C19]">Chưa có thông tin</span>
        </div>
        <div className="flex justify-between text-xs text-[#5f5f5f]">
          <span>Dự kiến giao:</span>
          <span className="font-semibold text-[#191C19]">{warehouseDateTime(order.expectedDeliveryDate)}</span>
        </div>
      </div>

      <Button onClick={onOpenPrintModal} disabled={!order.ghnTrackingCode}>In vận đơn A5</Button>

      {/* Khi shipper đã lấy hàng */}
      <div className="p-4 rounded-xl border border-[#8a8a8a] bg-[#fafafa] space-y-3">
        <p className="text-xs font-bold text-[#191C19]">Khi shipper đã lấy hàng</p>
        <p className="text-xs text-[#5f5f5f] leading-relaxed">
          Bấm xác nhận để đơn chuyển sang <strong>Đang giao</strong> và người mua nhận thông báo kèm mã vận đơn.
        </p>
        <Button
          variant="outline"
          className="text-xs font-bold py-2 border-[#2b2b2b] text-[#006B2C] hover:bg-[#F0F5EE]"
          onClick={() => toast.success('Đã xác nhận bàn giao hàng cho shipper GHN!')}
        >
          ✓ Đã bàn giao cho GHN
        </Button>
      </div>
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

      {!canPack(order, scope, now) && (
        <p role="status" className="text-xs text-[#BA1A1A] font-semibold">
          Đơn chưa cho phép thao tác hoặc bạn không còn claim hợp lệ. Hãy kiểm tra lại hàng đợi.
        </p>
      )}

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
          className={`text-xs font-bold p-2.5 rounded-lg border ${message.includes('không') ? 'bg-red-50 text-[#BA1A1A] border-red-200' : 'bg-green-50 text-[#006B2C] border-green-200'
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
                      onChange={() => togglePicked(item.productId)}
                      className="rounded"
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
                    <p className="text-[11px] text-[#717971]">{item.brand || 'ReHome'} · {item.condition || 'Tốt'}</p>
                  </td>
                  <td className="py-3 px-3 font-medium text-[#414942]">
                    {item.size || 'M'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isScanned ? 'bg-[#E8F5E9] text-[#006B2C]' : 'bg-[#FFF3E0] text-[#D97706]'}`}>
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
