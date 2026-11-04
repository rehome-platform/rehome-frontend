import React, { useState } from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Modal Quy Trình Thẩm Định Hàng Nghi Giả 2 Moderator (F-134, F-135, UC-68)
 * Ràng buộc hệ thống: Khi phát hiện hàng nghi giả bị trả về kho, bắt buộc Moderator thứ hai
 * độc lập kiểm định chéo và cùng xác nhận trước khi kết luận tiêu hủy và hoàn tiền người mua.
 */
export default function SuspiciousCounterfeitModal({ isOpen, onClose, returnItem, onConfirmVerdict }) {
  let user = null;
  try {
    const auth = useAuth?.();
    user = auth?.user || null;
  } catch {
    user = null;
  }
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
          conclusion: verdict,
          firstModerator: returnItem.firstModerator || 'MOD-01',
          secondModerator: user?.accountId || user?.id || 'MOD-02',
          note: secondModeratorNote,
        });
      }
      onClose();
    }, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hội Chẩn Hàng Nghi Giả 2 Moderator"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        <div className="p-3 bg-[#FFFDF5] border border-secondary rounded-xl text-text leading-relaxed">
          <strong className="text-secondary font-bold">⚠️ Quy tắc nghiệp vụ:</strong> Để bảo đảm tính khách quan và công bằng, mọi sản phẩm bị nghi ngờ hàng giả bắt buộc phải có ý kiến độc lập của Moderator thứ hai tại kho trước khi đưa ra phán quyết cuối cùng.
        </div>

        <div className="p-3 bg-background rounded-xl border border-neutral space-y-1">
          <p><strong className="text-text">Mã vận đơn trả:</strong> {returnItem.code || returnItem.returnCode || 'RET-3012'}</p>
          <p><strong className="text-text">Sản phẩm:</strong> {returnItem.itemName} ({returnItem.brand || 'Chưa rõ thương hiệu'})</p>
          <p><strong className="text-text">SKU:</strong> <span className="font-mono text-primary font-bold">{returnItem.sku || '—'}</span></p>
          <p><strong className="text-text">Ý kiến Moderator 1 (Người tiếp nhận):</strong> {returnItem.firstModNote || returnItem.conditionNote || 'Đường may cẩu thả, logo thêu lệch 3mm so với hàng chính hãng'}</p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Moderator đồng kiểm định (dựa trên phiên đăng nhập, không nhập mã tùy tiện) */}
          <div className="p-3 bg-surface rounded-xl border border-neutral space-y-1">
            <span className="text-textSecondary block text-[11px] font-medium">Moderator đồng kiểm định tại kho:</span>
            <div className="flex items-center justify-between">
              <span className="font-bold text-text text-sm">
                {user?.fullName || user?.name || user?.email || user?.accountId || 'Moderator thứ hai (phiên hiện tại)'}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-success-light text-primary font-bold">
                Phiên xác thực
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-text mb-1.5">
              Kết luận thẩm định chung:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerdict('COUNTERFEIT')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  verdict === 'COUNTERFEIT'
                    ? 'border-error bg-error-light text-error font-bold shadow-sm'
                    : 'border-neutral text-textSecondary bg-surface hover:bg-background'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1 font-bold">
                  <span className="material-symbols-outlined text-sm">gavel</span>
                  <span>Xác nhận HÀNG GIẢ</span>
                </div>
                <p className="text-[10px] opacity-85">Hoàn tiền người mua, tiêu hủy món hàng, không phạt người bán nếu khai trung thực.</p>
              </button>

              <button
                type="button"
                onClick={() => setVerdict('GENUINE')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  verdict === 'GENUINE'
                    ? 'border-primary bg-success-light text-primary font-bold shadow-sm'
                    : 'border-neutral text-textSecondary bg-surface hover:bg-background'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1 font-bold">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Xác nhận CHÍNH HÃNG</span>
                </div>
                <p className="text-[10px] opacity-85">Bác bỏ khiếu nại trả hàng giả, đưa sản phẩm về quy trình trả hàng thông thường.</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-text mb-1">
              Ghi chú thẩm định chi tiết của Moderator 2:
            </label>
            <textarea
              required
              rows={3}
              value={secondModeratorNote}
              onChange={(e) => setSecondModeratorNote(e.target.value)}
              placeholder="Ghi rõ chi tiết đối chiếu chất liệu vải, tem tag, phông chữ, mã code..."
              className="w-full p-2.5 rounded-xl border border-neutral bg-surface text-xs text-text focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-neutral">
          <Button variant="outline" className="rounded-xl border-neutral" onClick={onClose}>Hủy</Button>
          <Button
            type="submit"
            loading={submitting}
            className={`rounded-xl px-4 font-bold text-white ${
              verdict === 'COUNTERFEIT' ? 'bg-error hover:bg-red-700' : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            Lưu biên bản & Thực thi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
