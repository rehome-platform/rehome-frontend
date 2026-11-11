import React from "react";
import { Link } from "react-router-dom";
import Button from "../../../../components/common/Button.jsx";
import Modal from "../../../../components/common/Modal.jsx";

import { WORK_TYPES } from "../../pages/ConsignmentQueuePage.config.js";
import { formatElapsedHours, withdrawalCounterLink } from '../../models/queueModel.js';
import { money, date, formatDeadlineWithCountdown } from "../WarehouseUi.jsx";

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

export function QueueTaskRow({ item, isFocused, isMine, isClaimedByOther, resource, handleClaim, setClaimTarget, linkTarget, setFeedback, setReleaseTarget, onCheckWithdrawal }) {
  const rowRef = React.useRef(null);
  React.useEffect(() => {
    if (isFocused && !resource.loading) {
      rowRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, [isFocused, resource.loading]);

  const isWithdrawal = item.type === 'WITHDRAWAL' || item.type === 'ITEM_WITHDRAWAL';

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
        {isWithdrawal ? (
          <>
            <div>{item.subjectSubtitle || item.memberName || item.sellerName || '—'}</div>
            {item.memberCode && (
              <div className="mt-1 text-[11px]">Mã Member: <span className="font-mono">{item.memberCode}</span></div>
            )}
          </>
        ) : (item.subjectSubtitle || item.fieldChanged || item.buyerName || item.memberName || item.sellerName || item.memberCode || '—')}
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
          {isWithdrawal && onCheckWithdrawal && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1.5 px-2.5 font-semibold text-[#006B2C] border-[#006B2C] hover:bg-[#E8F5E9]"
              onClick={() => onCheckWithdrawal(item)}
            >
              Check đơn
            </Button>
          )}
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
        <option value="PENDING_PICKUP">Chờ nhận tại quầy (PENDING_PICKUP)</option>
        <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
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

export function WithdrawalCheckModal({ target, onClose }) {
  if (!target) return null;
  const deadline = target.pickupDeadline || null;
  const fee = target.feeCharged ?? target.withdrawalFee ?? 0;
  const isPaid = Boolean(target.feePaid || target.feePaidAt);

  return (
    <Modal
      isOpen={Boolean(target)}
      onClose={onClose}
      title="Kiểm tra yêu cầu rút hàng (HQ-01)"
      size="md"
    >
      <div className="space-y-4 text-xs text-textSecondary">
        <div className="p-3.5 rounded-xl border border-neutral bg-[#F6F9F4] space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-textSecondary">Mã yêu cầu rút:</span>
            <span className="font-mono font-bold text-text">{target.refId || target.id || target.queueId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-textSecondary">Sản phẩm cần rút:</span>
            <span className="font-bold text-[#006B2C]">{target.targetName || target.productName || '—'}</span>
          </div>
          {target.sku && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-textSecondary">Mã SKU:</span>
              <span className="font-mono font-bold text-text">{target.sku}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-textSecondary">Người gửi yêu cầu:</span>
            <span className="font-bold text-text">{target.subjectSubtitle || target.memberName || '—'}</span>
          </div>
          {target.memberCode && (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-textSecondary">Mã Member:</span>
              <span className="font-mono font-bold text-text">{target.memberCode}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-textSecondary">Thời hạn nhận hàng:</span>
            <span className="font-semibold text-text">{formatDeadlineWithCountdown(deadline)}</span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-dashed border-neutral">
            <span className="font-semibold text-textSecondary">Phí rút hàng:</span>
            <span>
              {fee > 0 ? (
                <>
                  <strong className="text-text mr-1.5">{money(fee)}</strong>
                  {isPaid ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                      ✓ Đã thanh toán
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFEBEE] text-[#BA1A1A]">
                      ⚠ Chưa thanh toán
                    </span>
                  )}
                </>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                  Miễn phí rút
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral bg-white p-3 space-y-1 leading-relaxed">
          <p className="font-bold text-text">Lưu ý nghiệp vụ trước khi ra Quầy:</p>
          <p>• Moderator kiểm tra hiện vật trong kho theo mã SKU, chuẩn bị sẵn tại kệ chờ giao.</p>
          <p>• Khi Member tới, vào <strong>Quầy tiếp nhận (BG-01)</strong> đối chiếu danh tính và quét mã SKU để bàn giao.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 py-2 text-xs" onClick={onClose}>
            Đóng
          </Button>
          <Link
            to={withdrawalCounterLink(target)}
            className="flex-1"
          >
            <Button variant="primary" className="w-full py-2 text-xs font-bold bg-[#006B2C] hover:bg-[#005523] text-white">
              Đến Quầy bàn giao (BG-01)
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
