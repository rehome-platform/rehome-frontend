import React, { useState } from 'react';
import Button from '../../../../components/common/Button.jsx';

/**
 * Modal in phiếu vận đơn GHN theo các khổ in chuẩn Wireframe DG-04:
 * - Khổ A5 tiêu chuẩn
 * - Khổ decal 80 x 80mm
 * - Khổ decal 52 x 70mm
 */
export function WaybillPrintModal({ isOpen, onClose, order }) {
  const [printSize, setPrintSize] = useState('A5');

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#191C19]">In phiếu giao hàng GHN</h3>
            <p className="text-xs text-[#5f5f5f]">
              Đơn hàng: <strong>{order.orderNo || order.id}</strong> • Vận đơn: <strong>{order.ghnTrackingCode || 'GHN5LK9P2XQ'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Chọn khổ in */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#191C19]">Chọn khổ in tem vận đơn:</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'A5', label: 'Khổ A5', desc: 'Chuẩn phiếu gửi hàng' },
              { id: '80x80', label: '80 x 80mm', desc: 'Decal vuông máy in nhiệt' },
              { id: '52x70', label: '52 x 70mm', desc: 'Decal mini dán gói nhỏ' },
            ].map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => setPrintSize(size.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  printSize === size.id
                    ? 'border-[#006B2C] bg-[#F0F5EE] text-[#006B2C] font-bold shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-xs font-bold">{size.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{size.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Khung mô phỏng phiếu in */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3 text-xs font-mono">
          <div className="flex justify-between items-start border-b border-gray-200 pb-2">
            <div>
              <p className="font-bold text-sm text-[#006B2C]">GHN EXPRESS</p>
              <p className="text-[10px] text-gray-500">ReHome — Kho Quận 7</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-xs">{order.ghnTrackingCode || 'GHN5LK9P2XQ'}</p>
              <p className="text-[10px] text-gray-500">Khổ in: {printSize}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase font-sans">Người nhận:</p>
            <p className="font-bold text-sm font-sans text-gray-900">{order.recipientName || 'Ngô Hải F'}</p>
            <p className="text-gray-700">{order.recipientPhone || '0912 456 142'}</p>
            <p className="text-gray-700">{order.shippingAddress || '142 Nguyễn Thị Thập, P. Tân Phú, Q7, TP.HCM'}</p>
          </div>

          <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-[11px]">
            <span>Khối lượng: <strong>{order.packageWeight || 820}g</strong></span>
            <span>Tiền thu hộ COD: <strong>0đ (Đã thanh toán)</strong></span>
          </div>

          <div className="pt-1 text-[10px] text-gray-500 italic">
            Ghi chú: {order.shipperNote || order.buyerNote || 'Giao giờ hành chính, gọi trước khi tới.'}
          </div>
        </div>

        {/* Nút in & đóng */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-6 bg-[#2b2b2b] text-white hover:bg-black font-bold text-xs flex items-center gap-2"
          >
            <span>🖨️</span> In phiếu ({printSize})
          </Button>
        </div>
      </div>
    </div>
  );
}

