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
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E8F5E9] text-[#006B2C]">
            Bạn đang giữ
          </span>
        ) : isClaimedByOther ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF3E0] text-[#D97706]">
            {item.claimedByName || 'Người khác giữ'}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-[#5f5f5f]">
            chưa ai nhận
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
