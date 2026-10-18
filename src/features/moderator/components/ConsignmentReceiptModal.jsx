import React from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';

/**
 * Modal hiển thị & in Mẫu Biên Nhận Ký Gửi Hàng Hóa ReHome
 * Chuẩn hóa 100% theo Mục 12: "Mẫu biên nhận ký gửi" trong Tài liệu tổng quan hệ thống (sau Review 1)
 */
export default function ConsignmentReceiptModal({ isOpen, onClose, receipt }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Biên Nhận Ký Gửi Hàng Hóa (Mục 12)"
    >
      <div className="space-y-6 text-[#191C19] max-h-[75vh] overflow-y-auto pr-2 select-text font-serif">
        {/* Header Quốc hiệu */}
        <div className="text-center space-y-1 border-b border-[#DDE5D9] pb-4 font-sans">
          <p className="text-xs font-bold uppercase tracking-wider text-[#191C19]">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="text-xs font-semibold text-[#414942]">Độc lập – Tự do – Hạnh phúc</p>
          <div className="w-24 h-0.5 bg-[#191C19] mx-auto my-1.5"></div>
          <h2 className="text-lg font-black font-heading text-[#006B2C] pt-2">
            BIÊN NHẬN KÝ GỬI HÀNG HÓA
          </h2>
          <p className="text-xs font-mono font-bold text-[#717971]">
            Số: {receipt.receiptCode || 'KG-2026-000123'}
          </p>
          <p className="text-[11px] text-[#717971] italic">
            Hôm nay, ngày {receipt.date || '15 tháng 10 năm 2026'}, tại {receipt.warehouseName || 'Kho Quận 7 – ReHome'}
          </p>
        </div>

        {/* Các bên tham gia */}
        <div className="space-y-3 text-xs font-sans">
          <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#E2E8E0]">
            <p className="font-bold text-[#006B2C] uppercase mb-1">BÊN A – BÊN NHẬN KÝ GỬI (NỀN TẢNG REHOME)</p>
            <p><strong>Chi nhánh kho:</strong> {receipt.warehouseName || 'Kho Quận 7 – số 12 Nguyễn Thị Thập, P. Tân Phú, Q. 7, TP.HCM'}</p>
            <p><strong>Người tiếp nhận:</strong> {receipt.moderatorName || 'Nguyễn Văn A'} – Moderator, mã {receipt.moderatorCode || 'MOD-07-003'}</p>
            <p><strong>Hotline kho:</strong> 1900 xxxx</p>
          </div>

          <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#E2E8E0]">
            <p className="font-bold text-[#006B2C] uppercase mb-1">BÊN B – BÊN KÝ GỬI (THÀNH VIÊN REHOME)</p>
            <p><strong>Họ và tên:</strong> {receipt.memberName || 'Trần Thị B'}</p>
            <p><strong>Mã Member:</strong> {receipt.memberCode || 'MB-0098231'}</p>
            <p><strong>Điện thoại:</strong> {receipt.memberPhone || '09xx xxx xxx'}</p>
            <p><strong>Email:</strong> {receipt.memberEmail || 'member@example.com'}</p>
          </div>
        </div>

        {/* Điều 1: Thông tin hàng hóa */}
        <div className="space-y-2 text-xs font-sans">
          <h4 className="font-bold text-[#191C19] border-b border-[#DDE5D9] pb-1">
            ĐIỀU 1. THÔNG TIN HÀNG HÓA KÝ GỬI
          </h4>
          <table className="w-full border-collapse border border-[#DDE5D9] text-left">
            <tbody>
              <tr className="border-b border-[#DDE5D9]">
                <td className="p-2 bg-[#F6F9F4] font-semibold w-1/3">Tên sản phẩm</td>
                <td className="p-2 font-bold">{receipt.itemName || 'Áo khoác dạ nữ'}</td>
              </tr>
              <tr className="border-b border-[#DDE5D9]">
                <td className="p-2 bg-[#F6F9F4] font-semibold">Thương hiệu / Danh mục</td>
                <td className="p-2">{receipt.brand || 'Uniqlo'} • {receipt.category || 'Áo khoác'}</td>
              </tr>
              <tr className="border-b border-[#DDE5D9]">
                <td className="p-2 bg-[#F6F9F4] font-semibold">Kích cỡ (Size)</td>
                <td className="p-2 font-mono">{receipt.size || 'M'}</td>
              </tr>
              <tr className="border-b border-[#DDE5D9]">
                <td className="p-2 bg-[#F6F9F4] font-semibold">Mã SKU kho gán</td>
                <td className="p-2 font-mono font-bold text-[#006B2C]">{receipt.sku || 'Q7-AK-000845'}</td>
              </tr>
              <tr className="border-b border-[#DDE5D9]">
                <td className="p-2 bg-[#F6F9F4] font-semibold">Tình trạng kiểm định</td>
                <td className="p-2">{receipt.conditionDetail || 'Như mới (99%), không lỗi, đường chỉ nguyên vẹn'}</td>
              </tr>
              <tr>
                <td className="p-2 bg-[#F6F9F4] font-semibold">Kết luận kiểm định</td>
                <td className="p-2 font-bold text-[#006B2C]">Hàng chính hãng, đủ điều kiện đăng bán</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Điều 2: Giá bán và hoa hồng */}
        <div className="space-y-2 text-xs font-sans">
          <h4 className="font-bold text-[#191C19] border-b border-[#DDE5D9] pb-1">
            ĐIỀU 2. GIÁ BÁN VÀ HOA HỒNG
          </h4>
          <p>
            <strong>2.1. Giá bán niêm yết:</strong> <span className="font-bold text-[#006B2C]">{formatCurrencyVND(receipt.sellingPrice || 1000000)}</span>.
          </p>
          <p>
            <strong>2.2. Giá sàn:</strong> <span className="font-bold text-[#BA1A1A]">{formatCurrencyVND((receipt.sellingPrice || 1000000) * 0.5)}</span> (50% giá chốt). Bên B được giảm giá trong app nhưng không được dưới giá sàn và không được tăng giá, tối đa 1 lần/ngày.
          </p>
          <p><strong>2.3. Tỷ lệ hoa hồng lũy tiến Bên A được hưởng theo kỳ lúc đặt đơn:</strong></p>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] my-1">
            <div className="p-2 rounded-lg bg-[#E8F5E9] border border-[#C8E6C9]">
              <p className="font-bold text-[#006B2C]">Kỳ 1 (Ngày 0 - 30)</p>
              <p className="text-xs font-black mt-0.5">10%</p>
            </div>
            <div className="p-2 rounded-lg bg-[#FFF3E0] border border-[#FED7AA]">
              <p className="font-bold text-[#D97706]">Kỳ 2 (Ngày 31 - 60)</p>
              <p className="text-xs font-black mt-0.5">15%</p>
            </div>
            <div className="p-2 rounded-lg bg-[#FEE2E2] border border-[#FECACA]">
              <p className="font-bold text-[#DC2626]">Kỳ 3 (Ngày 61 - 90)</p>
              <p className="text-xs font-black mt-0.5">20%</p>
            </div>
          </div>
        </div>

        {/* Điều 3 & Điều 7: Rút hàng & Xử lý cuối kỳ */}
        <div className="space-y-1.5 text-xs font-sans text-[#414942]">
          <h4 className="font-bold text-[#191C19] border-b border-[#DDE5D9] pb-1">
            ĐIỀU 3 & 7. RÚT LẠI HÀNG & XỬ LÝ CUỐI KỲ
          </h4>
          <p>• <strong>Cửa sổ rút hàng miễn phí:</strong> 07 ngày đầu mỗi kỳ được rút không mất phí. Ngoài thời gian này, phí rút là 50.000 đ.</p>
          <p>• <strong>Hạn nhận hàng:</strong> Bên B đến kho nhận đồ trong 07 ngày kể từ khi yêu cầu được duyệt.</p>
          <p>• <strong>Cuối kỳ 90 ngày:</strong> Hết 90 ngày chưa bán được, gỡ sàn. Bên B có 30 ngày để nhận lại đồ hoặc ký gửi lại. Quá 30 ngày không phản hồi, hàng hóa xem là vô thừa nhận và chuyển tặng tổ chức từ thiện đối tác.</p>
        </div>

        {/* Chữ ký điện tử */}
        <div className="grid grid-cols-2 gap-4 text-xs font-sans pt-3 border-t border-[#DDE5D9] text-center">
          <div className="space-y-1">
            <p className="font-bold uppercase text-[#006B2C]">BÊN A (REHOME)</p>
            <p className="text-[11px] text-[#717971]">Nguyễn Văn A – MOD-07-003</p>
            <p className="text-[10px] text-[#00685F] font-semibold">✓ Đã lập & in tem SKU tại kho</p>
          </div>
          <div className="space-y-1">
            <p className="font-bold uppercase text-[#006B2C]">BÊN B (MEMBER KÝ GỬI)</p>
            <p className="text-[11px] text-[#717971]">{receipt.memberName || 'Trần Thị B'} – {receipt.memberCode || 'MB-0098231'}</p>
            <p className="text-[10px] text-[#00685F] font-semibold">✓ Đã xác nhận điện tử trên ứng dụng</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#DDE5D9]">
        <span className="text-[11px] text-[#717971]">Biên nhận có giá trị pháp lý điện tử lưu trong Audit Log</span>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
          <Button size="sm" onClick={handlePrint} className="bg-[#006B2C] text-white">
            <span className="material-symbols-outlined text-sm mr-1">print</span>
            In biên nhận PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
