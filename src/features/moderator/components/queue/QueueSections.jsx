import React from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";

import { WORK_TYPES } from "../../pages/ConsignmentQueuePage.config.js";

export function QueueReleaseDialog({ releaseTarget, resource, setReleaseTarget, handleRelease }) {
  return (
    <Modal
      isOpen={!!releaseTarget}
      title="Nhả việc này về hàng đợi?"
      onClose={() => {
        if (!resource.busy) setReleaseTarget(null);
      }}
    >
      {releaseTarget && (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl border border-[#8a8a8a] bg-[#fafafa]">
            <p className="font-bold text-sm text-[#191C19]">
              {releaseTarget.typeLabel} · {releaseTarget.formId || releaseTarget.orderId || releaseTarget.queueId}
            </p>
            <p className="text-[#5f5f5f] mt-1">
              {releaseTarget.name || '—'} · bạn đang giữ {releaseTarget.hours} giờ
            </p>
          </div>
    
          <p className="text-[#4a4a4a] leading-relaxed">
            Việc quay lại hàng đợi ở trạng thái <strong>chưa ai nhận</strong> — Moderator khác (kể cả bạn) nhận lại được bình thường.
            Dùng khi nhận nhầm hoặc không đủ thông tin để xử lý tiếp.
          </p>
    
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 py-2.5"
              onClick={() => setReleaseTarget(null)}
            >
              Hủy
            </Button>
            <Button
              className="flex-1 py-2.5 bg-[#2b2b2b] text-white hover:bg-black font-semibold"
              loading={resource.busy}
              onClick={() => handleRelease(releaseTarget)}
            >
              Nhả việc
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function QueueTaskRow({ item, isSelected, toggleSelectRow, isMine, isClaimedByOther, resource, handleClaim, linkTarget, setFeedback, setReleaseTarget }) {
  return (
    <tr
      key={item.queueId}
      className={`transition-colors hover:bg-[#F9FAF9] ${
        item.isOverdue ? 'border-l-4 border-l-[#2b2b2b] bg-[#fafafa]' : ''
      } ${isSelected ? 'bg-[#F0F5EE]' : ''}`}
    >
      <td className="py-3 px-3.5 text-center">
        <input
          type="checkbox"
          aria-label={`Chọn việc ${item.queueId}`}
          checked={isSelected}
          onChange={() => toggleSelectRow(item.queueId)}
          className="rounded"
        />
      </td>
      <td className="py-3 px-3 font-semibold text-[#191C19]">
        {item.typeLabel}
      </td>
      <td className="py-3 px-3 font-medium text-[#191C19]">
        {item.formId || item.orderId || item.queueId}
      </td>
      <td className="py-3 px-3 text-[#414942]">
        {item.name || item.memberName || '—'}
      </td>
      <td className="py-3 px-3 text-[#5f5f5f]">
        {item.formattedTime}
      </td>
      <td className="py-3 px-3">
        <span className={`font-semibold ${item.isOverdue ? 'text-[#BA1A1A]' : 'text-[#191C19]'}`}>
          {item.hours >= 1 ? `${item.hours} giờ` : '< 1 giờ'}
        </span>
      </td>
      <td className="py-3 px-3 text-[#5f5f5f]">
        {isMine ? (
          <span className="font-bold text-[#006B2C]">bạn đang giữ</span>
        ) : isClaimedByOther ? (
          <span>người khác giữ</span>
        ) : (
          <span>chưa ai nhận</span>
        )}
      </td>
      <td className="py-3 px-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {!item.claimedBy && (
            <Button
              loading={resource.busy}
              onClick={() => handleClaim(item)}
              className="text-[11px] py-1.5 px-3 bg-[#2b2b2b] text-white hover:bg-black font-semibold rounded"
            >
              Nhận việc
            </Button>
          )}
          {isMine && (
            <>
              <Link
                to={linkTarget}
                className="px-3 py-1.5 rounded border border-[#8a8a8a] bg-white text-xs font-semibold text-[#191C19] hover:bg-[#F0F5EE]"
              >
                Mở
              </Link>
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setReleaseTarget(item);
                }}
                className="px-2 py-1 text-xs text-[#BA1A1A] hover:underline font-semibold"
              >
                Nhả việc
              </button>
            </>
          )}
          {isClaimedByOther && (
            <button
              type="button"
              disabled
              className="text-[11px] py-1.5 px-3 border border-[#c4c4c4] bg-[#efefef] text-[#9a9a9a] rounded font-semibold cursor-not-allowed"
            >
              Nhận việc
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export function QueueFilters({ statusFilter, changeFilter, claimParam, toggleOverdue, overdueOnly, filteredItems, rawItems }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Bộ lọc trạng thái */}
      <select
        value={statusFilter}
        onChange={(e) => changeFilter('status', e.target.value)}
        aria-label="Lọc trạng thái"
        className="rounded-lg border border-[#8a8a8a] bg-white px-3 py-1.5 text-xs font-semibold text-[#191C19] focus:border-[#006B2C] focus:outline-none"
      >
        <option value="">Mọi trạng thái</option>
        <option value="PENDING">Chờ duyệt (PENDING)</option>
        <option value="APPROVED">Đã duyệt (APPROVED)</option>
        <option value="INSPECTING">Đang kiểm định (INSPECTING)</option>
      </select>
    
      {/* Bộ lọc người nhận */}
      <select
        value={claimParam}
        onChange={(e) => changeFilter('claim', e.target.value)}
        aria-label="Lọc người nhận"
        className="rounded-lg border border-[#8a8a8a] bg-white px-3 py-1.5 text-xs font-semibold text-[#191C19] focus:border-[#006B2C] focus:outline-none"
      >
        <option value="">Mọi người nhận</option>
        <option value="mine">Việc của tôi</option>
        <option value="unclaimed">Chưa ai nhận</option>
      </select>
    
      {/* Nút toggle: Chỉ việc quá hạn (HQ-01) */}
      <button
        type="button"
        onClick={toggleOverdue}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
          overdueOnly
            ? 'border-2 border-[#2b2b2b] bg-[#2b2b2b] text-white'
            : 'border border-[#8a8a8a] bg-white text-[#191C19] hover:bg-[#F0F5EE]'
        }`}
      >
        <span>Chỉ việc quá hạn</span>
        {overdueOnly && <span>✕</span>}
      </button>
    
      <span className="ml-auto text-xs text-[#5f5f5f]">
        Hiển thị {filteredItems.length} / {rawItems.length} việc
      </span>
    </div>
  );
}

export function QueueTabs({ typeParam, changeFilter }) {
  return (
    <div role="tablist" aria-label="Loại công việc" className="flex flex-wrap gap-2">
      {WORK_TYPES.map((tab) => {
        if (tab.directUrl) {
          return (
            <Link
              key={tab.key}
              to={tab.directUrl}
              className="px-3.5 py-1.5 rounded-lg border border-[#a8a8a8] bg-white text-xs font-semibold text-[#4a4a4a] hover:bg-[#F0F5EE] hover:text-[#006B2C] transition-colors"
            >
              {tab.label}
            </Link>
          );
        }
        const isSelected = typeParam === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => changeFilter('type', tab.key === 'ALL' ? '' : tab.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isSelected
                ? 'border-[#2b2b2b] bg-[#2b2b2b] text-white shadow-sm'
                : 'border-[#a8a8a8] bg-white text-[#4a4a4a] hover:bg-[#F0F5EE]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
