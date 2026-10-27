import React from "react";

import Button from "../../../../components/common/Button.jsx";

export function PackingQueueItem({ item, targetOrderId, isMine, setSearch, page, queue, handleClaim, handleRelease }) {
  return (
    <div
      key={item.queueId}
      className="rounded-2xl border border-[#8a8a8a] bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm"
    >
      <div>
        <h3 className="text-base font-bold text-[#191C19]">
          Đơn hàng: {targetOrderId}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#5B6776]">
            {item.name || 'Người mua ReHome'}
          </span>
          <span className="text-xs text-[#5B6776]">·</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
              isMine
                ? 'bg-[#E8F5E9] text-[#006B2C]'
                : item.claimedBy
                ? 'bg-[#FFF3E0] text-[#D97706]'
                : 'bg-[#F5F5F5] text-[#616161]'
            }`}
          >
            {isMine ? 'Bạn đang xử lý' : item.claimedBy ? 'Người khác đang xử lý' : 'Chưa nhận việc'}
          </span>
        </div>
      </div>
    
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="text-xs font-semibold"
          onClick={() => setSearch({ page: String(page), orderId: targetOrderId })}
        >
          Xem chi tiết đóng gói
        </Button>
    
        {!item.claimedBy && (
          <Button
            disabled={queue.busy}
            onClick={() => handleClaim(item.queueId)}
            className="text-xs bg-[#2b2b2b] text-white hover:bg-black font-bold"
          >
            Nhận việc
          </Button>
        )}
    
        {isMine && (
          <Button
            variant="outline"
            disabled={queue.busy}
            onClick={() => handleRelease(item.queueId)}
            className="text-xs text-[#BA1A1A]"
          >
            Nhả việc
          </Button>
        )}
      </div>
    </div>
  );
}
