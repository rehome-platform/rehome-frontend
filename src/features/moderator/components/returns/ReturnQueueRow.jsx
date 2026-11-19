import React from "react";
import { needsItemAction } from "../../services/returnApi.js";

export function ReturnQueueRow({
  r,
  isOverdueItem,
  handleOpenReview,
  handleOpenInspect,
  handleMarkLost,
  handleOpenDegradedCaseView,
  handleOpenOutcomeModal,
  handleOpenQuickDetail,
}) {
  const pendingItemAction = needsItemAction(r);
  const actionBtnBase =
    'inline-flex items-center justify-center text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap cursor-pointer';

  return (
    <tr
      key={r.id}
      className={`hover:bg-background transition-colors font-sans ${
        isOverdueItem ? 'border-l-4 border-l-secondary bg-[#FFFDF5]' : ''
      }`}
    >
      <td className="py-3 px-3.5 font-medium text-text whitespace-nowrap">{r.buyerName || '—'}</td>
      <td className="py-3 px-3.5 text-textSecondary whitespace-nowrap">{r.itemCount ?? 1} món</td>
      <td className="py-3 px-3.5 text-textSecondary whitespace-nowrap">{r.submittedAt || '—'}</td>
      <td className={`py-3 px-3.5 whitespace-nowrap ${isOverdueItem ? 'font-bold text-error' : 'text-textSecondary'}`}>
        {r.waitTime || '—'}
      </td>
      <td className="py-3 px-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text">
            {r.status === 'PENDING_APPROVAL' && 'Chờ duyệt'}
            {r.status === 'WAITING_BUYER_DISPATCH' && 'Chờ người mua gửi'}
            {r.status === 'RETURNING' && 'Đang về kho'}
            {r.status === 'RECEIVED_INSPECT' && 'Hàng đã về, chờ kiểm'}
            {r.status === 'RESOLVED' && (pendingItemAction ? 'Đã hoàn tiền · Chờ xử lý món' : 'Đã xong')}
          </span>
          {r.ghnFallbackUsed && (r.status === 'WAITING_BUYER_DISPATCH' || r.status === 'RETURNING') && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"
              title={r.ghnReturnTrackingCode || 'Mã thu hồi nội bộ'}
            >
              GHN fallback
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => (handleOpenQuickDetail ? handleOpenQuickDetail(r) : handleOpenReview(r))}
            className={`${actionBtnBase} border border-neutral bg-white text-text hover:bg-background`}
          >
            Chi tiết
          </button>
          {r.status === 'PENDING_APPROVAL' && (
            <button
              type="button"
              onClick={() => handleOpenReview(r)}
              className={`${actionBtnBase} bg-primary text-white hover:bg-primary-hover shadow-sm`}
            >
              Duyệt yêu cầu
            </button>
          )}
          {r.status === 'RECEIVED_INSPECT' && (
            <button
              type="button"
              onClick={() => handleOpenInspect(r)}
              className={`${actionBtnBase} border border-primary text-primary bg-white hover:bg-primary hover:text-white`}
            >
              Kiểm tra hàng
            </button>
          )}
          {(r.status === 'RETURNING' || r.status === 'WAITING_BUYER_DISPATCH') && (
            <>
              {r.status === 'RETURNING' && (
                <button
                  type="button"
                  onClick={() => handleOpenInspect(r)}
                  className={`${actionBtnBase} border border-primary text-primary bg-white hover:bg-primary hover:text-white`}
                >
                  Kiểm tra hàng
                </button>
              )}
              <button
                type="button"
                onClick={() => handleOpenReview(r)}
                className={`${actionBtnBase} border border-neutral bg-white text-textSecondary hover:bg-background`}
              >
                Theo dõi
              </button>
              {handleMarkLost && (
                <button
                  type="button"
                  onClick={() => handleMarkLost(r)}
                  className={`${actionBtnBase} border border-error bg-white text-error hover:bg-error-light`}
                  title="Báo bưu kiện thất lạc bởi đơn vị giao vận"
                >
                  Báo thất lạc
                </button>
              )}
            </>
          )}
          {r.status === 'RESOLVED' && (
            <>
              {pendingItemAction && handleOpenOutcomeModal && (
                <button
                  type="button"
                  onClick={() => handleOpenOutcomeModal(r)}
                  className={`${actionBtnBase} bg-primary text-white hover:bg-primary-hover shadow-sm`}
                  title="Chọn phương án xử lý món hàng"
                >
                  Chọn xử lý món
                </button>
              )}
              {(r.degraded || r.degradedCase) && (
                <button
                  type="button"
                  onClick={() => (handleOpenDegradedCaseView ? handleOpenDegradedCaseView(r) : handleOpenReview(r))}
                  className={`${actionBtnBase} border border-[#FEDF89] bg-[#FFFAEB] text-[#B54708] hover:bg-[#FEF0C7]`}
                  title="Xem kết luận hàng xuống cấp"
                >
                  Biên bản xuống cấp
                </button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
