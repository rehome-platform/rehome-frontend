import React, { useState } from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Modal Thẩm Định Hàng Nghi Giả (F-134, F-135, UC-68)
 * Moderator trực tiếp kiểm tra, đối chiếu và đưa ra phán quyết hàng giả hoặc chính hãng.
 */
export default function SuspiciousCounterfeitModal({ isOpen, onClose, returnItem, onConfirmVerdict }) {
  let user = null;
  try {
    const auth = useAuth?.();
    user = auth?.user || null;
  } catch {
    user = null;
  }
  const [moderatorNote, setModeratorNote] = useState('');
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
          moderator: user?.accountId || user?.id || 'MODERATOR',
          note: moderatorNote,
        });
      }
      onClose();
    }, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thẩm Định Hàng Nghi Giả"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        <div className="p-3 bg-background rounded-xl border border-neutral space-y-1">
          <p><strong className="text-text">Mã vận đơn trả:</strong> {returnItem.code || returnItem.returnCode || 'RET-3012'}</p>
          <p><strong className="text-text">Sản phẩm:</strong> {returnItem.itemName || returnItem.productName} ({returnItem.brand || 'Chưa rõ thương hiệu'})</p>
          <p><strong className="text-text">SKU:</strong> <span className="font-mono text-primary font-bold">{returnItem.sku || '—'}</span></p>
          <p><strong className="text-text">Ghi chú tình trạng ban đầu:</strong> {returnItem.conditionNote || returnItem.firstModNote || 'Khách báo hàng không đúng mô tả hoặc nghi ngờ chất lượng'}</p>
        </div>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block font-bold text-text mb-1.5">
              Kết luận thẩm định:
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
                <p className="text-[10px] opacity-85">Hoàn tiền người mua, tiêu hủy món hàng, không giải ngân người bán.</p>
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
                <p className="text-[10px] opacity-85">Bác bỏ khiếu nại hàng giả, tiếp tục quy trình kiểm định thông thường.</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-text mb-1">
              Ghi chú thẩm định chi tiết của Moderator:
            </label>
            <textarea
              required
              rows={3}
              value={moderatorNote}
              onChange={(e) => setModeratorNote(e.target.value)}
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
            Lưu kết luận & Thực thi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
