import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Button from '../../../../components/common/Button.jsx';

gsap.registerPlugin(useGSAP);

/**
 * Modal cảnh báo Quét Sai Món theo chuẩn Wireframe DG-03-SaiMon
 */
export function PackingWrongItemModal({ isOpen, onClose, wrongItem, currentOrderNo, targetItem }) {
  const dialogRef = useRef(null);

  useGSAP(
    () => {
      if (!isOpen || !wrongItem || !dialogRef.current) return;
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          dialogRef.current,
          { x: 0 },
          {
            keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 4 }, { x: 0 }],
            duration: 0.35,
            ease: 'power2.out',
            clearProps: 'transform',
          }
        );
      });
      return () => mm.revert();
    },
    { dependencies: [isOpen, wrongItem], scope: dialogRef, revertOnUpdate: true }
  );

  if (!isOpen || !wrongItem) return null;

  const wrongSummary = [wrongItem.name, wrongItem.brand, wrongItem.size].filter(Boolean).join(' — ');
  const wrongSubtitle = [wrongItem.name, wrongItem.brand].filter(Boolean).join(' — ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border-2 border-[#BA1A1A] space-y-5"
      >
        {/* Tiêu đề lỗi */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 text-[#BA1A1A] flex items-center justify-center font-bold text-lg">
              ✕
            </div>
            <div>
              <h3 className="text-base font-bold text-[#BA1A1A]">
                {currentOrderNo ? `Món này không thuộc đơn ${currentOrderNo}` : 'Món này không thuộc đơn hiện tại'}
              </h3>
              <p className="text-xs text-[#5f5f5f]">
                Phát hiện quét sai Mã hàng hóa sản phẩm trong khâu đối chiếu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Thông báo chi tiết món quét sai */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2 text-xs text-[#414942]">
          <p className="font-semibold text-red-900 leading-relaxed">
            Mã <span className="font-mono font-bold text-[#BA1A1A]">{wrongItem.productId}</span>
            {wrongSummary ? (
              <>
                {' '}là <strong>{wrongSummary}</strong>
              </>
            ) : (
              ' không thuộc đơn hàng này'
            )}
            {wrongItem.belongsToOrderNo ? (
              <>
                {' '}và thuộc đơn <strong className="underline text-primary font-bold">{wrongItem.belongsToOrderNo}</strong>
              </>
            ) : null}
            .
          </p>
          <p className="font-bold text-[#BA1A1A]">
            Trả lại món này rồi lấy đúng món còn thiếu bên dưới.
          </p>
        </div>

        {/* Đối chiếu so sánh */}
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-[#c4c4c4] bg-[#fcfdfc] p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#BA1A1A] block">
              Bạn vừa nhập (Sai món)
            </span>
            <p className="font-mono font-bold text-[#191C19]">{wrongItem.productId}</p>
            {wrongSubtitle && <p className="text-[#5f5f5f]">{wrongSubtitle}</p>}
            {wrongItem.size && (
              <p className="text-[11px] text-[#414942]">
                Cỡ: <strong>{wrongItem.size}</strong>
              </p>
            )}
          </div>

          <div className="rounded-xl border-2 border-[#006B2C] bg-[#F0F5EE] p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#006B2C] block">
              Món đơn này cần (Chưa quét)
            </span>
            {targetItem ? (
              <>
                <p className="font-mono font-bold text-[#191C19]">{targetItem.productId}</p>
                <p className="text-[#5f5f5f]">
                  {[targetItem.name, targetItem.brand].filter(Boolean).join(' — ') || 'Sản phẩm cần đóng gói'}
                </p>
                {targetItem.size && (
                  <p className="text-[11px] text-[#414942]">
                    Cỡ: <strong>{targetItem.size}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="text-[#5f5f5f]">Kiểm tra lại danh sách sản phẩm chưa quét trong đơn.</p>
            )}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold"
          >
            Đã hiểu — Xoá và nhập lại mã món đúng
          </Button>
        </div>
      </div>
    </div>
  );
}

