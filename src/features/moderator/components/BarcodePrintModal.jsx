import React from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';

/**
 * Modal In Tem Nhãn SKU Dán Lên Sản Phẩm (F-122, UC-62)
 * In tem barcode/QR để dán vào quần áo trước khi xếp lên kệ kho
 */
export default function BarcodePrintModal({ isOpen, onClose, item }) {
  if (!item) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="In Tem Nhãn SKU Kho (F-122)"
    >
      <div className="space-y-6">
        <p className="text-xs text-[#717971]">
          Tem nhãn SKU được dán trực tiếp lên bọc bảo quản sản phẩm để nhân viên kho quét QR định vị kệ và đóng gói.
        </p>

        {/* Mẫu tem nhãn SKU chuẩn */}
        <div className="max-w-xs mx-auto p-4 bg-white border-2 border-dashed border-[#191C19] rounded-xl shadow-sm text-center space-y-2 select-all">
          <div className="flex items-center justify-between border-b border-[#DDE5D9] pb-1.5 text-[11px] font-bold text-[#006B2C]">
            <span>REHOME KHO Q7</span>
            <span>KÝ GỬI</span>
          </div>

          <h3 className="font-extrabold text-sm text-[#191C19] line-clamp-1">
            {item.itemName || item.name}
          </h3>

          <div className="flex justify-center items-center py-2">
            {/* Giả lập Barcode SVG */}
            <div className="flex flex-col items-center">
              <div className="flex items-end h-12 space-x-0.5">
                {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2].map((w, i) => (
                  <div key={i} className={`bg-black h-full ${w === 1 ? 'w-0.5' : w === 2 ? 'w-1' : w === 3 ? 'w-1.5' : 'w-2'}`}></div>
                ))}
              </div>
              <span className="font-mono font-bold text-xs tracking-widest mt-1 text-[#191C19]">
                {item.sku || 'Q7-AK-000845'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-left text-[11px] border-t border-[#DDE5D9] pt-2">
            <div>
              <span className="text-[#717971] block text-[9px] uppercase">Thương hiệu</span>
              <span className="font-bold">{item.brand || 'Uniqlo'}</span>
            </div>
            <div>
              <span className="text-[#717971] block text-[9px] uppercase">Size / Tình trạng</span>
              <span className="font-bold">{item.size || 'M'} • Độ mới 99%</span>
            </div>
          </div>

          <div className="bg-[#F6F9F4] p-1.5 rounded-lg border border-[#DDE5D9] flex items-center justify-between">
            <span className="text-[10px] text-[#717971]">Giá niêm yết:</span>
            <span className="font-black text-sm text-[#006B2C]">
              {formatCurrencyVND(item.price || item.sellingPrice || 1000000)}
            </span>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2 border-t border-[#DDE5D9]">
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button
            onClick={() => {
              window.print();
              onClose();
            }}
            className="bg-[#006B2C] text-white"
          >
            <span className="material-symbols-outlined text-sm mr-1">print</span>
            Xác nhận in tem nhãn
          </Button>
        </div>
      </div>
    </Modal>
  );
}
