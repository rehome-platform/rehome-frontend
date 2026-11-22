import React from "react";
import { needsItemAction } from "../../services/returnApi.js";
import Button from "../../../../components/common/Button.jsx";
import TableActionButton from "../../../../components/common/TableActionButton.jsx";

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
          {r.status === 'PENDING_APPROVAL' && <span className="font-semibold text-text">Chờ duyệt</span>}
          {r.status === 'WAITING_BUYER_DISPATCH' && <span className="font-semibold text-text">Chờ người mua gửi</span>}
          {r.status === 'RETURNING' && <span className="font-semibold text-text">Đang về kho</span>}
          {r.status === 'RECEIVED_INSPECT' && <span className="font-semibold text-text">Hàng đã về, chờ kiểm</span>}
          {r.status === 'RESOLVED' && (
            pendingItemAction ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]">
                  Đã hoàn tiền
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
                  Chờ chọn phương án xử lý
                </span>
              </div>
            ) : (
              <span className="font-semibold text-text">Đã xong</span>
            )
          )}
          {r.ghnFallbackUsed && (r.status === 'WAITING_BUYER_DISPATCH' || r.status === 'RETURNING') && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"
              title={r.ghnReturnTrackingCode || 'Mã thu hồi nội bộ'}
            >
              Giao hàng dự phòng
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <TableActionButton
            action="view"
            onClick={() => (handleOpenQuickDetail ? handleOpenQuickDetail(r) : handleOpenReview(r))}
          />
          {r.status === 'PENDING_APPROVAL' && (
            <Button
              size="sm"
              variant="primary"
              className="whitespace-nowrap"
              onClick={() => handleOpenReview(r)}
            >
              Duyệt yêu cầu
            </Button>
          )}
          {r.status === 'RECEIVED_INSPECT' && (
            <Button
              size="sm"
              variant="outline"
              className="border-[#006B2C] text-[#006B2C] hover:bg-[#E8F5E9] hover:text-[#006B2C] whitespace-nowrap"
              onClick={() => handleOpenInspect(r)}
            >
              Kiểm tra hàng
            </Button>
          )}
          {(r.status === 'RETURNING' || r.status === 'WAITING_BUYER_DISPATCH') && (
            <>
              {r.status === 'RETURNING' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#006B2C] text-[#006B2C] hover:bg-[#E8F5E9] hover:text-[#006B2C] whitespace-nowrap"
                  onClick={() => handleOpenInspect(r)}
                >
                  Kiểm tra hàng
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="whitespace-nowrap"
                onClick={() => handleOpenReview(r)}
              >
                Theo dõi
              </Button>
              {handleMarkLost && (
                <Button
                  size="sm"
                  variant="danger-outline"
                  className="whitespace-nowrap"
                  onClick={() => handleMarkLost(r)}
                  title="Báo bưu kiện thất lạc bởi đơn vị giao vận"
                >
                  Báo thất lạc
                </Button>
              )}
            </>
          )}
          {r.status === 'RESOLVED' && (
            <>
              {pendingItemAction && handleOpenOutcomeModal && (
                <Button
                  size="sm"
                  variant="primary"
                  className="whitespace-nowrap"
                  onClick={() => handleOpenOutcomeModal(r)}
                  title="Chọn phương án xử lý món hàng"
                >
                  Chọn xử lý món
                </Button>
              )}
              {(r.degraded || r.degradedCase) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#FEDF89] bg-[#FFFAEB] text-[#B54708] hover:bg-[#FEF0C7] hover:border-[#F79009] hover:text-[#B54708] whitespace-nowrap"
                  onClick={() => (handleOpenDegradedCaseView ? handleOpenDegradedCaseView(r) : handleOpenReview(r))}
                  title="Xem kết luận hàng xuống cấp"
                >
                  Biên bản xuống cấp
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
