import React from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";

import { WORK_TYPES } from "../../pages/ConsignmentQueuePage.config.js";
import { formatElapsedHours } from '../../models/queueModel.js';

export function QueueClaimDialog({ claimTarget, resource, setClaimTarget, handleClaim }) {
  return (
    <Modal
      isOpen={!!claimTarget}
      title="Nhận việc này?"
      onClose={() => {
        if (!resource?.busy) setClaimTarget(null);
      }}
      size="sm"
    >
      {claimTarget && (
        <div className="space-y-4 text-sm text-textSecondary">
          <div className="p-3.5 rounded-xl border border-neutral bg-[#F6F9F4]">
            <p className="font-bold text-sm text-text">
              {claimTarget.typeLabel || claimTarget.kindLabel} · {claimTarget.formId || claimTarget.orderId || claimTarget.queueId}
            </p>
            <p className="text-xs text-textSecondary mt-1">
              {claimTarget.targetName || claimTarget.name || claimTarget.memberName || '—'} · chờ {formatElapsedHours(claimTarget.hours ?? 0)}
            </p>
          </div>

          <p className="text-xs text-textSecondary leading-relaxed">
            Nhận xong thì <strong className="text-text">chỉ bạn xử lý được</strong> việc này — Moderator khác không nhận được nữa.
            Không giới hạn thời gian giữ, nhưng quá 48 giờ không xử lý sẽ tự nhả về hàng đợi và báo Admin.
          </p>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 py-2 text-sm"
              onClick={() => setClaimTarget(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-2 text-sm font-semibold"
              loading={resource?.busy}
              onClick={() => handleClaim(claimTarget)}
            >
              Nhận việc
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function QueueReleaseDialog({ releaseTarget, resource, setReleaseTarget, handleRelease }) {
  const claimedTime = releaseTarget?.claimedAt ? new Date(releaseTarget.claimedAt).getTime() : NaN;
  const heldHours = Number.isFinite(claimedTime)
    ? (Date.now() - claimedTime) / 3600000
    : releaseTarget?.hours ?? 0;
  return (
    <Modal
      isOpen={!!releaseTarget}
      title="Nhả việc này về hàng đợi?"
      onClose={() => {
        if (!resource?.busy) setReleaseTarget(null);
      }}
      size="sm"
    >
      {releaseTarget && (
        <div className="space-y-4 text-sm text-textSecondary">
          <div className="p-3.5 rounded-xl border border-neutral bg-[#F6F9F4]">
            <p className="font-bold text-sm text-text">
              {releaseTarget.typeLabel || releaseTarget.kindLabel} · {releaseTarget.formId || releaseTarget.orderId || releaseTarget.queueId}
            </p>
            <p className="text-xs text-textSecondary mt-1">
              {releaseTarget.targetName || releaseTarget.name || releaseTarget.memberName || '—'} · Bạn đang nhận việc này {formatElapsedHours(heldHours)}
            </p>
          </div>
    
          <p className="text-xs text-textSecondary leading-relaxed">
            Việc quay lại hàng đợi ở trạng thái <strong className="text-text">chưa ai nhận</strong> — Moderator khác (kể cả bạn) nhận lại được bình thường.
            Dùng khi nhận nhầm hoặc không đủ thông tin để xử lý tiếp.
          </p>
    
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 py-2 text-sm"
              onClick={() => setReleaseTarget(null)}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              className="flex-1 py-2 text-sm font-semibold"
              loading={resource?.busy}
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

export function QueueTaskRow({ item, isFocused, isMine, isClaimedByOther, resource, handleClaim, setClaimTarget, linkTarget, setFeedback, setReleaseTarget }) {
  const rowRef = React.useRef(null);
  React.useEffect(() => {
    if (isFocused && !resource.loading) {
      rowRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [isFocused, resource.loading]);

  return (
    <tr
      ref={rowRef}
      key={item.queueId}
      className={`transition-colors hover:bg-[#F6F9F4] ${
        item.isOverdue ? 'border-l-4 border-l-[#006B2C] bg-[#F6F9F4]' : ''
      } ${isFocused ? 'bg-[#EBF1E8] ring-2 ring-inset ring-primary' : ''}`}
    >
      <td className="py-3 px-4 font-semibold text-text">
        {item.typeLabel}
      </td>
      <td className="py-3 px-3 font-medium text-text">
        {isMine && linkTarget ? (
          <Link to={linkTarget} className="text-[#006B2C] hover:underline font-bold">
            {item.targetName || item.orgName || item.productName || item.orderNo || item.name || item.formId || item.orderId || item.queueId}
          </Link>
        ) : (
          <span>
            {item.targetName || item.orgName || item.productName || item.orderNo || item.name || item.formId || item.orderId || item.queueId}
          </span>
        )}
        {isFocused && <span className="ml-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] text-white font-medium">Việc vừa mở</span>}
      </td>
      <td className="py-3 px-3 text-textSecondary">
        {item.subjectSubtitle || item.fieldChanged || item.buyerName || item.memberName || item.sellerName || item.memberCode || '—'}
      </td>
      <td className="py-3 px-3 text-textSecondary">
        {item.formattedTime}
      </td>
      <td className="py-3 px-3">
        <span className={`font-semibold ${item.isOverdue ? 'text-error' : 'text-text'}`}>
          {item.waitTimeFormatted || formatElapsedHours(item.hours ?? 0)}
        </span>
      </td>
      <td className="py-3 px-3 text-textSecondary">
        {isMine ? (
          <span className="font-bold text-[#006B2C]">Bạn đang nhận việc này</span>
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
              size="sm"
              variant="primary"
              loading={resource.busy}
              onClick={() => (setClaimTarget ? setClaimTarget(item) : handleClaim(item))}
            >
              Nhận việc
            </Button>
          )}
          {isMine && (
            <>
              {linkTarget && (
                <Link
                  to={linkTarget}
                  className="text-xs py-1.5 px-3 bg-[#006B2C] text-white hover:bg-[#005523] hover:text-white font-semibold rounded-xl inline-flex items-center gap-1 shadow-sm transition-colors"
                >
                  {item.type === 'PACKING' ? 'Đóng gói →' : 'Mở việc'}
                </Link>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFeedback?.(null);
                  setReleaseTarget(item);
                }}
              >
                Nhả việc
              </Button>
            </>
          )}
          {isClaimedByOther && (
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

export function QueueFilters({ statusFilter, changeFilter, claimParam, toggleOverdue, overdueOnly, filteredItems, rawItems }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Bộ lọc trạng thái */}
      <select
        value={statusFilter}
        onChange={(e) => changeFilter('status', e.target.value)}
        aria-label="Lọc trạng thái"
        className="rounded-xl border border-neutral bg-white px-3 py-1.5 text-xs font-semibold text-text focus:border-[#006B2C] focus:outline-none"
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
        className="rounded-xl border border-neutral bg-white px-3 py-1.5 text-xs font-semibold text-text focus:border-[#006B2C] focus:outline-none"
      >
        <option value="">Mọi người nhận</option>
        <option value="mine">Việc của tôi</option>
        <option value="unclaimed">Chưa ai nhận</option>
      </select>
    
      {/* Nút toggle: Chỉ việc quá hạn (HQ-01) */}
      <button
        type="button"
        onClick={toggleOverdue}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
          overdueOnly
            ? 'border-2 border-[#006B2C] bg-[#006B2C] text-white'
            : 'border border-neutral bg-white text-text hover:bg-[#F6F9F4]'
        }`}
      >
        <span>Chỉ việc quá hạn</span>
        {overdueOnly && <span>✕</span>}
      </button>
    
      <span className="ml-auto text-xs text-textSecondary">
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
              className="px-3.5 py-1.5 rounded-xl border border-neutral bg-white text-xs font-semibold text-textSecondary hover:bg-[#F6F9F4] hover:text-[#006B2C] transition-colors"
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isSelected
                ? 'border-[#006B2C] bg-[#006B2C] text-white shadow-sm'
                : 'border-neutral bg-white text-textSecondary hover:bg-[#F6F9F4] hover:text-[#006B2C]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
