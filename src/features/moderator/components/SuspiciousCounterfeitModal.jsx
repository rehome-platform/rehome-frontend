import React, { useState, useEffect, useId } from 'react';
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
  const noteId = useId();
  const [moderatorNote, setModeratorNote] = useState('');
  const [verdict, setVerdict] = useState('COUNTERFEIT'); // 'COUNTERFEIT' | 'GENUINE'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setModeratorNote('');
      setVerdict('COUNTERFEIT');
      setSubmitting(false);
    }
  }, [isOpen, returnItem?.id]);

  if (!returnItem) return null;

  const handleClose = () => {
    if (!submitting) onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !moderatorNote.trim()) return;
    setSubmitting(true);
    try {
      if (onConfirmVerdict) {
        const result = await onConfirmVerdict({
          itemId: returnItem.id,
          verdict,
          conclusion: verdict,
          moderator: user?.accountId || user?.id || 'MODERATOR',
          note: moderatorNote.trim(),
        });
        if (result === false) return;
      }
      onClose?.();
    } catch {
      // Giữ nguyên modal và nội dung ghi chú để Moderator thử lại khi API lỗi
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
            <span className="block font-bold text-text mb-1.5">
              Kết luận thẩm định:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={verdict === 'COUNTERFEIT'}
                disabled={submitting}
                onClick={() => setVerdict('COUNTERFEIT')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  verdict === 'COUNTERFEIT'
                    ? 'border-error bg-error-light text-error font-bold shadow-sm'
                    : 'border-neutral text-textSecondary bg-surface hover:bg-background'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1 font-bold">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">gavel</span>
                  <span>Xác nhận HÀNG GIẢ</span>
                </div>
                <p className="text-[10px] opacity-85">Hoàn tiền người mua, tiêu hủy món hàng, không giải ngân người bán.</p>
              </button>

              <button
                type="button"
                aria-pressed={verdict === 'GENUINE'}
                disabled={submitting}
                onClick={() => setVerdict('GENUINE')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  verdict === 'GENUINE'
                    ? 'border-primary bg-success-light text-primary font-bold shadow-sm'
                    : 'border-neutral text-textSecondary bg-surface hover:bg-background'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1 font-bold">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">verified</span>
                  <span>Xác nhận CHÍNH HÃNG</span>
                </div>
                <p className="text-[10px] opacity-85">Bác bỏ khiếu nại hàng giả, tiếp tục quy trình kiểm định thông thường.</p>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor={noteId} className="block font-bold text-text mb-1">
              Ghi chú thẩm định chi tiết của Moderator <span className="text-error">*</span>
            </label>
            <textarea
              id={noteId}
              required
              disabled={submitting}
              rows={3}
              value={moderatorNote}
              onChange={(e) => setModeratorNote(e.target.value)}
              placeholder="Ghi rõ chi tiết đối chiếu chất liệu vải, tem tag, phông chữ, mã code..."
              className="w-full p-2.5 rounded-xl border border-neutral bg-surface text-xs text-text focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-neutral">
          <Button variant="outline" disabled={submitting} className="rounded-xl border-neutral" onClick={handleClose}>Hủy</Button>
          <Button
            type="submit"
            variant={verdict === 'COUNTERFEIT' ? 'danger' : 'primary'}
            loading={submitting}
            disabled={submitting || !moderatorNote.trim()}
            className="rounded-xl px-4 font-bold"
          >
            Lưu kết luận & Thực thi
          </Button>
        </div>
      </form>
    </Modal>
  );
}
