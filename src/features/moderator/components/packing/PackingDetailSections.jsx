import React from "react";

import Button from "../../../../components/common/Button.jsx";

import { safeDocumentUrl } from "../../models/warehouseModel.js";

import { canPack, canShip } from "../../models/packingModel.js";
import { operationReady } from "../../config/packingContract.js";

export function PackingIncidentDialog({ setIncidentOpen, setIncidentNote, incidentNote }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-[#191C19]">Báo sự cố đóng gói đơn hàng</h3>
          <button
            type="button"
            onClick={() => setIncidentOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>
        <form
          className="space-y-4 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            alert('Đã ghi nhận báo cáo sự cố đóng gói. Quản lý kho sẽ kiểm tra.');
            setIncidentOpen(false);
            setIncidentNote('');
          }}
        >
          <p className="text-gray-600">
            Ghi nhận tình trạng thiếu món hoặc sản phẩm rách hỏng trong khâu gom hàng:
          </p>
          <div>
            <label className="block font-bold text-[#191C19] mb-1">Mô tả sự cố</label>
            <textarea
              value={incidentNote}
              onChange={(e) => setIncidentNote(e.target.value)}
              placeholder="Ghi rõ vị trí kệ hoặc mã sản phẩm gặp sự cố..."
              rows={3}
              className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-[#006B2C] focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIncidentOpen(false)}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="text-xs font-bold bg-[#BA1A1A] text-white hover:bg-red-700"
            >
              Gửi báo sự cố
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PackingRecipientPanel({ order, scanLogs }) {
  return (
    <div className="space-y-5">
      {/* Người nhận hàng */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-2 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Người nhận hàng</p>
        <p className="text-sm font-bold text-[#191C19]">{order.recipientName || 'Ngô Hải F'}</p>
        <p className="text-[#5B6776]">{order.recipientPhone || '0912 ••• 456'}</p>
        <p className="text-[#5B6776] leading-relaxed">
          {order.shippingAddress || '142 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM'}
        </p>
      </div>
    
      {/* Thanh toán & Vận chuyển */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-5 shadow-sm space-y-3 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Thanh toán</p>
        <div className="flex justify-between text-[#5f5f5f]">
          <span>Tiền hàng</span>
          <span className="font-semibold text-[#191C19]">425.000đ</span>
        </div>
        <div className="flex justify-between text-[#5f5f5f]">
          <span>Phí vận chuyển</span>
          <span className="font-semibold text-[#191C19]">32.000đ</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-[#191C19] pt-2 border-t border-[#E2E8E0]">
          <span>Đã thu qua MoMo</span>
          <span>457.000đ</span>
        </div>
        <p className="text-[10px] text-[#7a7a7a]">
          Lúc hôm nay 06:48 · MOMO-8842199
        </p>
    
        <div className="pt-3 border-t border-[#E2E8E0] flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Đơn vị vận chuyển</span>
          <span className="font-bold text-[#006B2C]">GHN Express</span>
        </div>
      </div>
    
      {/* Phí GHN báo về (DG-04) */}
      <div className="rounded-2xl border border-[#8a8a8a] bg-white p-4 shadow-sm space-y-2 text-xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Phí GHN báo về</p>
        <div className="flex justify-between text-[#5f5f5f]">
          <span>Phí theo 820g · Q7 → Q7</span>
          <span>30.000đ</span>
        </div>
        <div className="flex justify-between text-[#5f5f5f]">
          <span>Người mua đã trả</span>
          <span>32.000đ</span>
        </div>
        <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-[#E2E8E0]">
          <span>Chênh lệch kho chịu</span>
          <span>0đ</span>
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
                <p className={log.matched ? 'text-[#006B2C]' : 'text-[#BA1A1A]'}>{log.status}</p>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-dashed border-[#9a9a9a] p-3 text-[11px] text-[#5f5f5f] leading-relaxed">
          Mã SKU không dùng chữ I, O, số 0 và số 1 để tránh đọc nhầm khi nhập tay.
        </div>
      </div>
    </div>
  );
}

export function PackingShipmentPanel({ order }) {
  return (
    <div className="rounded-2xl border-2 border-[#006B2C] bg-white p-5 space-y-4 shadow-sm">
      <div>
        <h3 className="text-base font-bold text-[#006B2C]">Vận đơn đã tạo thành công</h3>
        <p className="text-xs text-[#5B6776] mt-0.5">
          GHN đã nhận đơn lúc 09:31 · chờ shipper tới lấy
        </p>
      </div>
    
      <div className="p-4 rounded-xl border border-[#2b2b2b] bg-[#f9faf9] space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#717971]">Mã vận đơn GHN</p>
        <p className="text-2xl font-mono font-extrabold text-[#191C19] tracking-wider">
          {order.ghnTrackingCode}
        </p>
        <div className="flex justify-between text-xs text-[#5f5f5f] pt-1 border-t border-[#e0e0e0]">
          <span>Dự kiến lấy hàng:</span>
          <span className="font-semibold text-[#191C19]">hôm nay 14:00 – 17:00</span>
        </div>
        <div className="flex justify-between text-xs text-[#5f5f5f]">
          <span>Dự kiến giao:</span>
          <span className="font-semibold text-[#191C19]">12/10 – 13/10</span>
        </div>
      </div>
    
      {/* In phiếu giao hàng (DG-04) */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[#191C19]">In phiếu giao hàng</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded bg-[#2b2b2b] text-white text-xs font-bold hover:bg-black"
          >
            In khổ A5
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded border border-[#8a8a8a] bg-white text-xs font-semibold hover:bg-[#F0F5EE]"
          >
            80 × 80mm
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded border border-[#8a8a8a] bg-white text-xs font-semibold hover:bg-[#F0F5EE]"
          >
            52 × 70mm
          </button>
        </div>
      </div>
    
      {/* Khi shipper đã lấy hàng */}
      <div className="p-4 rounded-xl border border-[#8a8a8a] bg-[#fafafa] space-y-3">
        <p className="text-xs font-bold text-[#191C19]">Khi shipper đã lấy hàng</p>
        <p className="text-xs text-[#5f5f5f] leading-relaxed">
          Bấm xác nhận để đơn chuyển sang <strong>Đang giao</strong> và người mua nhận thông báo kèm mã vận đơn.
        </p>
        <Button variant="outline" className="text-xs font-bold py-2 border-[#2b2b2b]">
          Đã bàn giao cho GHN
        </Button>
      </div>
    </div>
  );
}

export function PackingScanPanel({ totalCount, order, scope, now, scan, sku, input, setSku, uncertain, resource, setCamera, message, create, setIncidentOpen }) {
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
          scan(sku);
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
            placeholder="Nhập mã SKU trên tem sản phẩm..."
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
          className={`text-xs font-bold p-2.5 rounded-lg border ${
            message.includes('không') ? 'bg-red-50 text-[#BA1A1A] border-red-200' : 'bg-green-50 text-[#006B2C] border-green-200'
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
          onClick={create}
          className="py-3 px-6 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs"
        >
          Tạo vận đơn GHN
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIncidentOpen(true)}
          className="py-3 px-4 text-xs font-semibold"
        >
          Không tìm thấy món · báo sự cố
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
              <th className="py-2.5 px-3">Vị trí kệ</th>
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
                    <p className="text-[11px] text-[#717971]">{item.brand || 'ReHome'} · Tốt</p>
                  </td>
                  <td className="py-3 px-3 font-medium text-[#414942]">
                    {item.size || 'M'}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#006B2C]">
                    {item.shelfLocation || 'Chưa có kệ'}
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
