import React from "react";
import { warehouseDateTime, waitingDuration } from "../../models/warehouseTime.js";
import Button from "../../../../components/common/Button.jsx";

/**
 * Dòng dữ liệu hàng đợi đóng gói theo chuẩn bảng Wireframe DG-01-HangDoi
 */
export function PackingQueueItem({
  item,
  targetOrderId,
  isMine,
  setSearch,
  page,
  queue,
  handleClaim,
  handleRelease,
}) {
  const isClaimedByOther = item.claimedBy && !isMine;

  return (
    <tr
      key={item.queueId || targetOrderId}
      className={`border-b border-[#e0e0e0] hover:bg-[#fafafa] transition-colors text-xs ${
        isMine ? 'bg-[#F0F5EE]/40 font-medium' : ''
      }`}
    >
      {/* 1. Mã đơn */}
      <td className="py-3 px-3 font-mono font-bold text-[#191C19]">
        {item.orderNo || targetOrderId}
      </td>

      {/* 2. Người mua */}
      <td className="py-3 px-3 text-[#191C19]">
        {item.buyerName || item.recipientName || item.memberName || 'Chưa có thông tin'}
      </td>

      {/* 3. Số món */}
      <td className="py-3 px-3 text-[#414942]">
        {item.itemCount != null ? `${item.itemCount} món` : 'Chưa có thông tin'}
      </td>

      {/* 4. Thời gian đặt */}
      <td className="py-3 px-3 text-[#5f5f5f]">
        {warehouseDateTime(item.orderCreatedAt)}
      </td>

      {/* 6. Thời gian chờ */}
      <td className="py-3 px-3 font-semibold text-[#191C19]">
        {waitingDuration(item.waitingMinutes)}
      </td>

      {/* 7. Trạng thái người giữ */}
      <td className="py-3 px-3">
        {isMine ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
            Bạn đang giữ
          </span>
        ) : isClaimedByOther ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#F79009]" />
            {item.claimedByName || 'Người khác giữ'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#667085]" />
            Chưa ai nhận
          </span>
        )}
      </td>

      {/* 8. Thao tác */}
      <td className="py-3 px-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {isMine ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setSearch({ page: String(page), orderId: targetOrderId })}
              >
                Mở đơn
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={queue.busy}
                onClick={() => handleRelease(item.queueId || targetOrderId)}
                className="text-xs text-[#BA1A1A] hover:bg-red-50"
                title="Nhả đơn để người khác nhận"
              >
                Nhả
              </Button>
            </>
          ) : !item.claimedBy ? (
            <Button
              size="sm"
              variant="primary"
              disabled={queue.busy}
              onClick={() => handleClaim(item.queueId || targetOrderId)}
            >
              Nhận việc
            </Button>
          ) : (
            <Button
              size="sm"
              disabled
              variant="outline"
              className="opacity-50 cursor-not-allowed"
            >
              Đã có người nhận
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
