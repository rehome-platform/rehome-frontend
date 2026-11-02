import React from 'react';
import Modal from '../../../components/common/Modal.jsx';
import Button from '../../../components/common/Button.jsx';
import { money } from '../components/WarehouseUi.jsx';

/**
 * KG-12 · Xác nhận giá mới (Mô phỏng app Member)
 * Tuân thủ cấu trúc wireframe docs/Wireframe/L-02/screens/KG-12-XacNhanGia.html
 */
export default function MemberReConsignConfirmModal({
  isOpen,
  onClose,
  product,
  proposedPrice,
  floorPrice,
  moderatorNote,
  onConfirm,
  onReject,
  loading,
}) {
  if (!isOpen || !product) return null;

  const newPrice = Number(proposedPrice || product.proposedPrice || product.agreedPrice || 0);
  const oldPrice = Number(product.currentPrice || product.agreedPrice || 0);
  const calculatedFloorPrice = Number(floorPrice || product.floorPrice || Math.round(newPrice * 0.5));
  const commission = Math.round(newPrice * 0.1);
  const memberEarnings = newPrice - commission;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mô phỏng Member App (Xác nhận giá mới)"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-[#2b2b2b] text-sm">
        {/* Header giả lập mobile app */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e0e0e0]">
          <div>
            <div className="text-base font-bold">{product.name}</div>
            <div className="text-xs text-[#7a7a7a]">
              SKU: {product.sku} · {product.brandName || product.brand || 'ReHome'}
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 bg-[#2b2b2b] text-white rounded">
            CẦN BẠN DUYỆT
          </span>
        </div>

        {/* Khung đề xuất giá */}
        <div className="border-2 border-[#2b2b2b] p-4 rounded-xl bg-white space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#5f5f5f]">
            Moderator đề xuất giá mới
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#006B2C]">{money(newPrice)}</span>
            {oldPrice > 0 && oldPrice !== newPrice && (
              <span className="text-xs text-[#8a8a8a] line-through">{money(oldPrice)}</span>
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#e0e0e0] text-xs">
            <span className="text-[#5f5f5f]">Giá sàn mới</span>
            <span className="font-bold">{money(calculatedFloorPrice)}</span>
          </div>
        </div>

        {/* Ghi chú của Moderator */}
        <div className="border border-[#c4c4c4] p-3.5 rounded-xl bg-[#fafafa] space-y-2">
          <div className="text-xs font-bold text-[#2b2b2b]">Ghi chú của Moderator</div>
          <p className="text-xs text-[#4a4a4a] leading-relaxed">
            {moderatorNote ||
              'Món hàng còn tốt, không có lỗi mới sau 90 ngày lưu kho. Đề xuất mức giá này giúp sản phẩm cạnh tranh và dễ bán hơn trên sàn ReHome.'}
          </p>
          <div className="text-[10px] text-[#7a7a7a] pt-1 border-t border-[#ececec]">
            Kiểm định viên kho · Hôm nay
          </div>
        </div>

        {/* Nếu bán được ở giá này */}
        <div className="border border-[#8a8a8a] bg-[#f4f4f4] p-3.5 rounded-xl space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#4a4a4a]">
            Nếu bán được ở giá này
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Giá bán</span>
              <span className="font-semibold">{money(newPrice)}</span>
            </div>
            <div className="flex justify-between text-[#5f5f5f]">
              <span>Hoa hồng Kỳ 1 (10%)</span>
              <span>- {money(commission)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#8a8a8a] text-sm font-bold">
              <span>Bạn nhận vào ví</span>
              <span className="text-[#006B2C]">{money(memberEarnings)}</span>
            </div>
          </div>
        </div>

        {/* Kỳ ký gửi mới */}
        <div className="border border-[#c4c4c4] p-3.5 rounded-xl space-y-2 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b6b]">
            Kỳ ký gửi mới
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[#5f5f5f]">Bắt đầu:</span>
              <span className="font-semibold">Ngay khi bạn xác nhận</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5f5f5f]">Thời hạn:</span>
              <span className="font-semibold">90 ngày, tính lại từ đầu</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5f5f5f]">Hoa hồng:</span>
              <span className="font-semibold">10% → 15% → 20%</span>
            </div>
          </div>
          <p className="text-[10px] text-[#5f5f5f] bg-[#f4f4f4] p-2 rounded border border-dashed border-[#a0a0a0] mt-2">
            Biên nhận mới thay thế biên nhận cũ. Hoa hồng quay về mức Kỳ 1 (10%), và bạn lại có 7 ngày đầu để rút hàng miễn phí.
          </p>
        </div>

        {/* Nút thao tác */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 py-3 text-xs"
            onClick={onReject}
            disabled={loading}
          >
            Từ chối giá
          </Button>
          <Button
            type="button"
            className="flex-[1.6] py-3 text-xs font-bold bg-[#2b2b2b] text-white hover:bg-black"
            onClick={onConfirm}
            loading={loading}
          >
            Đồng ý — xem biên nhận mới
          </Button>
        </div>
      </div>
    </Modal>
  );
}

