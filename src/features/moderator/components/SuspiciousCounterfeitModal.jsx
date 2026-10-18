import React, { useState } from 'react';
import { Modal, Button, Input } from '../../../components/common/index.js';

/**
 * Modal Quy Trình Thẩm Định Hàng Nghi Giả 2 Moderator (F-134, F-135, UC-68)
 * Ràng buộc hệ thống: Khi phát hiện hàng nghi giả bị trả về kho, bắt buộc Moderator thứ hai
 * độc lập kiểm định chéo và cùng xác nhận trước khi kết luận tiêu hủy và hoàn tiền người mua.
 */
export default function SuspiciousCounterfeitModal({ isOpen, onClose, returnItem, onConfirmVerdict }) {
  const [secondModeratorCode, setSecondModeratorCode] = useState('MOD-07-005');
  const [secondModeratorNote, setSecondModeratorNote] = useState('');
  const [verdict, setVerdict] = useState('COUNTERFEIT'); // 'COUNTERFEIT' | 'GENUINE'
  const [submitting, setSubmitting] = useState(false);

  if (!returnItem) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (onConfirmVerdict) {
        onConfirmVerdict({
          itemId: returnItem.id,
          verdict,
          firstModerator: 'MOD-07-003',
          secondModerator: secondModeratorCode,
          note: secondModeratorNote,
        });
      }
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hội Chẩn Hàng Nghi Giả 2 Moderator"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-[#FFF3E0] border border-[#FED7AA] rounded-xl text-xs text-[#B45309] leading-relaxed">
          <strong>⚠️ Quy tắc nghiệp vụ:</strong> Để bảo đảm tính khách quan và công bằng, mọi sản phẩm bị nghi ngờ hàng giả bắt buộc phải có ý kiến độc lập của Moderator thứ hai tại kho trước khi đưa ra phán quyết cuối cùng.
        </div>

        <div className="p-3 bg-[#F8FAF8] rounded-xl border border-[#E2E8E0] text-xs space-y-1">
          <p><strong>Mã vận đơn trả:</strong> {returnItem.returnCode || 'RET-3012'}</p>
          <p><strong>Sản phẩm:</strong> {returnItem.itemName} ({returnItem.brand})</p>
          <p><strong>SKU:</strong> <span className="font-mono text-[#006B2C] font-bold">{returnItem.sku}</span></p>
          <p><strong>Ý kiến Moderator 1 (Người tiếp nhận):</strong> {returnItem.firstModNote || 'Đường may cẩu thả, logo thêu lệch 3mm so với hàng chính hãng'}</p>
        </div>

        <div className="space-y-3 pt-1">
          <Input
            label="Mã định danh Moderator thứ hai (Đồng kiểm định)"
            required
            value={secondModeratorCode}
            onChange={(e) => setSecondModeratorCode(e.target.value)}
            helperText="Nhập mã nhân viên Moderator đồng kiểm định tại quầy"
          />

          <div>
            <label className="block text-xs font-semibold text-[#191C19] mb-1.5">
              Kết luận thẩm định chung:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerdict('COUNTERFEIT')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  verdict === 'COUNTERFEIT'
                    ? 'border-[#BA1A1A] bg-[#FFDAD6]/30 text-[#BA1A1A] font-bold'
                    : 'border-[#DDE5D9] text-[#414942]'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">gavel</span>
                  <span>Xác nhận HÀNG GIẢ</span>
                </div>
                <p className="text-[10px] opacity-80">Hoàn tiền người mua, tiêu hủy món hàng, không phạt người bán nếu khai trung thực.</p>
              </button>

              <button
                type="button"
                onClick={() => setVerdict('GENUINE')}
                className={`p-3 rounded-xl border text-left text-xs transition-all ${
                  verdict === 'GENUINE'
                    ? 'border-[#006B2C] bg-[#E8F5E9] text-[#006B2C] font-bold'
                    : 'border-[#DDE5D9] text-[#414942]'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Xác nhận CHÍNH HÃNG</span>
                </div>
                <p className="text-[10px] opacity-80">Bác bỏ khiếu nại trả hàng giả, đưa sản phẩm về quy trình trả hàng thông thường.</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#191C19] mb-1">
              Ghi chú thẩm định chi tiết của Moderator 2:
            </label>
            <textarea
              required
              rows={3}
              value={secondModeratorNote}
              onChange={(e) => setSecondModeratorNote(e.target.value)}
              placeholder="Ghi rõ chi tiết đối chiếu chất liệu vải, tem tag, phông chữ, mã code..."
              className="w-full p-2.5 rounded-xl border border-[#DDE5D9] bg-white text-xs text-[#191C19] focus:outline-none focus:border-[#006B2C]"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-[#DDE5D9]">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            type="submit"
            loading={submitting}
            className={verdict === 'COUNTERFEIT' ? 'bg-[#BA1A1A] text-white' : 'bg-[#006B2C] text-white'}
          >
            Lưu biên bản & Thực thi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
