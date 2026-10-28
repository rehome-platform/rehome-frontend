import React from "react";

export function ReturnQueueRow({ r, isOverdueItem, handleOpenReview, handleOpenInspect }) {
  return (
    <tr
      key={r.id}
      className={`hover:bg-[#F8FAF8] transition-colors ${
        isOverdueItem ? 'border-l-4 border-l-[#2b2b2b] bg-[#fafafa]' : ''
      }`}
    >
      <td className="py-3 px-3 font-bold text-[#191C19]">{r.code}</td>
      <td className="py-3 px-3">{r.buyerName}</td>
      <td className="py-3 px-3">{r.itemCount} món</td>
      <td className="py-3 px-3 text-[#4a4a4a] max-w-[200px] truncate" title={r.reason}>
        {r.reason}
      </td>
      <td className="py-3 px-3 text-[#5f5f5f]">{r.submittedAt}</td>
      <td className={`py-3 px-3 ${isOverdueItem ? 'font-bold text-[#BA1A1A]' : 'text-[#5f5f5f]'}`}>
        {r.waitTime}
      </td>
      <td className="py-3 px-3">
        <span className="font-semibold text-[#191C19]">
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
            className="text-[10px] font-bold px-3 py-1.5 rounded bg-[#2b2b2b] text-white hover:bg-black transition-colors"
          >
            Duyệt yêu cầu
          </button>
        )}
        {r.status === 'RECEIVED_INSPECT' && (
          <button
            type="button"
            onClick={() => handleOpenInspect(r)}
            className="text-[10px] font-bold px-3 py-1.5 rounded border border-[#2b2b2b] text-[#2b2b2b] hover:bg-[#2b2b2b] hover:text-white transition-colors"
          >
            Kiểm tra hàng
          </button>
        )}
        {(r.status === 'RETURNING' || r.status === 'WAITING_BUYER_DISPATCH') && (
          <button
            type="button"
            onClick={() => handleOpenReview(r)}
            className="text-[10px] px-3 py-1.5 rounded border border-[#8a8a8a] text-[#4a4a4a] hover:bg-[#f4f4f4] transition-colors"
          >
            Theo dõi
          </button>
        )}
        {r.status === 'RESOLVED' && (
          <button
            type="button"
            onClick={() => handleOpenReview(r)}
            className="text-[10px] px-2.5 py-1 rounded border border-[#c4c4c4] text-[#717971]"
          >
            Chi tiết
          </button>
        )}
      </td>
    </tr>
  );
}
