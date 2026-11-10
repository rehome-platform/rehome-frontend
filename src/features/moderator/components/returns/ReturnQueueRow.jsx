import React from "react";

export function ReturnQueueRow({
  r,
  isOverdueItem,
  handleOpenReview,
  handleOpenInspect,
  handleMarkLost,
  handleOpenDegradedCaseView,
}) {
  return (
    <tr
      key={r.id}
      className={`hover:bg-background transition-colors font-sans ${
        isOverdueItem ? 'border-l-4 border-l-secondary bg-[#FFFDF5]' : ''
      }`}
    >
      <td className="py-3 px-3 font-bold text-text">{r.code}</td>
      <td className="py-3 px-3 text-text">{r.buyerName}</td>
      <td className="py-3 px-3 text-textSecondary">{r.itemCount} món</td>
      <td className="py-3 px-3 text-textSecondary max-w-[200px] truncate" title={r.reason}>
        {r.reason}
      </td>
      <td className="py-3 px-3 text-textSecondary">{r.submittedAt}</td>
      <td className={`py-3 px-3 ${isOverdueItem ? 'font-bold text-error' : 'text-textSecondary'}`}>
        {r.waitTime}
      </td>
      <td className="py-3 px-3">
        <span className="font-semibold text-text">
          {r.status === 'PENDING_APPROVAL' && 'Chờ duyệt'}
          {r.status === 'WAITING_BUYER_DISPATCH' && 'Chờ người mua gửi'}
          {r.status === 'RETURNING' && 'Đang về kho'}
          {r.status === 'RECEIVED_INSPECT' && 'Hàng đã về, chờ kiểm'}
          {r.status === 'RESOLVED' && 'Đã xong'}
        </span>
      </td>
      <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
        {r.status === 'PENDING_APPROVAL' && (
          <button
            type="button"
            onClick={() => handleOpenReview(r)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-primary text-white hover:bg-primary-hover shadow-sm transition-colors"
          >
            Duyệt yêu cầu
          </button>
        )}
        {r.status === 'RECEIVED_INSPECT' && (
          <button
            type="button"
            onClick={() => handleOpenInspect(r)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-xl border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
          >
            Kiểm tra hàng
          </button>
        )}
        {(r.status === 'RETURNING' || r.status === 'WAITING_BUYER_DISPATCH') && (
          <>
            <button
              type="button"
              onClick={() => handleOpenReview(r)}
              className="text-[11px] px-3 py-1.5 rounded-xl border border-neutral text-textSecondary hover:bg-background transition-colors"
            >
              Theo dõi
            </button>
            {handleMarkLost && (
              <button
                type="button"
                onClick={() => handleMarkLost(r)}
                className="text-[11px] px-2.5 py-1.5 rounded-xl border border-error text-error hover:bg-error-light transition-colors"
                title="Báo bưu kiện thất lạc bởi đơn vị giao vận (TH-08)"
              >
                Báo thất lạc
              </button>
            )}
          </>
        )}
        {r.status === 'RESOLVED' && (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenReview(r)}
              className="text-[11px] px-2.5 py-1.5 rounded-xl border border-neutral text-textSecondary hover:bg-background transition-colors"
            >
              Chi tiết
            </button>
            {(r.degraded || r.degradedCase) && (
              <button
                type="button"
                onClick={() => (handleOpenDegradedCaseView ? handleOpenDegradedCaseView(r) : handleOpenReview(r))}
                className="text-[11px] px-2.5 py-1.5 rounded-xl border border-amber-600 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition-colors"
                title="Xem kết luận hàng xuống cấp (TH-07)"
              >
                TH-07
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
