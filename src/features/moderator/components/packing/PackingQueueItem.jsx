import React from "react";
import Button from "../../../../components/common/Button.jsx";

/**
 * Dòng dữ liệu hàng đợi đóng gói theo chuẩn bảng 8 cột Wireframe DG-01-HangDoi
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
        {item.buyerName || item.name || 'Người mua ReHome'}
      </td>

      {/* 3. Số món */}
      <td className="py-3 px-3 text-[#414942]">
        {item.itemCount ? `${item.itemCount} món` : '2 món'}
      </td>

      {/* 4. Vị trí kệ gom hàng */}
      <td className="py-3 px-3 font-mono font-bold text-[#006B2C]">
        {item.shelfLocations || 'B1-18, B1-22'}
      </td>

      {/* 5. Thời gian đặt */}
      <td className="py-3 px-3 text-[#5f5f5f]">
        {item.orderTime || 'hôm nay 06:48'}
      </td>

      {/* 6. Thời gian chờ */}
      <td className="py-3 px-3 font-semibold text-[#191C19]">
        {item.waitingTime || '3 giờ'}
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
                className="text-xs bg-[#2b2b2b] text-white hover:bg-black font-bold py-1.5 px-3.5 shadow-sm"
                onClick={() => setSearch({ page: String(page), orderId: targetOrderId })}
              >
                Mở đơn
              </Button>
              <Button
                variant="outline"
                disabled={queue.busy}
                onClick={() => handleRelease(item.queueId || targetOrderId)}
                className="text-xs text-[#BA1A1A] py-1.5 px-2 hover:bg-red-50 border-gray-300"
                title="Nhả đơn để người khác nhận"
              >
                Nhả
              </Button>
            </>
          ) : !item.claimedBy ? (
            <Button
              disabled={queue.busy}
              onClick={() => handleClaim(item.queueId || targetOrderId)}
              className="text-xs bg-[#2b2b2b] text-white hover:bg-black font-bold py-1.5 px-3.5"
            >
              Nhận việc
            </Button>
          ) : (
            <Button
              disabled
              className="text-xs bg-[#efefef] text-[#9a9a9a] border border-[#c4c4c4] py-1.5 px-3.5 cursor-not-allowed"
            >
              Nhận việc
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
