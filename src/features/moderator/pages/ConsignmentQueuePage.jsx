import { useConsignmentQueue } from '../hooks/useConsignmentQueue.jsx';

import { QueueClaimDialog, QueueReleaseDialog, QueueTaskRow, QueueFilters, QueueTabs, WithdrawalCheckModal } from '../components/queue/QueueSections.jsx';
import React from "react";

import Button from '../../../components/common/Button.jsx';

import { ownsClaim } from "../models/warehouseModel.js";
import { withdrawalCounterLink } from '../models/queueModel.js';
import { Page, Pager, ResourceState } from "../components/WarehouseUi.jsx";

function getQueueLinkTarget(item, typeParam) {
  const type = item?.type || typeParam;
  const refId = item.refId || item.id || '';
  if (type === 'PACKING') {
    return `/moderator/packing?orderId=${encodeURIComponent(item.orderId || refId)}`;
  }
  if (type === 'WITHDRAWAL' || type === 'ITEM_WITHDRAWAL') {
    if (item?.status === 'PENDING_APPROVAL') return null;
    return withdrawalCounterLink(item);
  }
  if (type === 'DONATION_PICKUP') {
    const params = new URLSearchParams();
    if (refId) params.set('donationId', refId);
    if (item.campaignId) params.set('campaignId', item.campaignId);
    const query = params.toString();
    return query ? `/moderator/donations?${query}` : '/moderator/donations';
  }
  if (type === 'FORM_REVIEW' || type === 'INSPECTION') {
    return `/moderator/consignments/${encodeURIComponent(item.formId || refId)}`;
  }
  if (type === 'RETURN') {
    const id = item.returnId || refId;
    return id ? `/moderator/returns?id=${encodeURIComponent(id)}` : `/moderator/returns`;
  }
  if (type === 'ORG_VERIFICATION') {
    return refId ? `/moderator/verifications?id=${encodeURIComponent(refId)}` : `/moderator/verifications`;
  }
  if (type === 'LEGAL_CHANGE') {
    return refId ? `/moderator/verifications?tab=LEGAL_CHANGES&id=${encodeURIComponent(refId)}` : `/moderator/verifications?tab=LEGAL_CHANGES`;
  }
  if (type === 'VIOLATION_REPORT') {
    return refId ? `/moderator/reports?id=${encodeURIComponent(refId)}` : `/moderator/reports`;
  }
  return `/moderator/consignments/${encodeURIComponent(item.formId || refId)}`;
}

export default function ConsignmentQueuePage() {
  const model = useConsignmentQueue();
  return (
    <Page
      title="Hàng đợi công việc"
      subtitle="Việc không ai nhận sau 48 giờ sẽ tự nhả về hàng đợi và báo Admin"
      actions={
        <Button variant="outline" onClick={() => { model.setFeedback(null); model.resource.refresh(); }}>
          Tải lại
        </Button>
      }
    >
      {/* 1. THANH TABS LOẠI VIỆC (HQ-01) */}
      <QueueTabs typeParam={model.typeParam} changeFilter={model.changeFilter} />

      {/* 2. THANH BỘ LỌC (HQ-01) */}
      <QueueFilters {...model.sections.QueueFilters} />

      {/* Thông báo kết quả thao tác (Alert / Feedback) */}
      {model.feedback && (
        <div
          role="alert"
          className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${model.feedback.type === 'success'
            ? 'bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]'
            : 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
            }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {model.feedback.type === 'success' ? '✓' : '⚠'}
            </span>
            <p>{model.feedback.message}</p>
          </div>
          <button
            type="button"
            className="text-xs font-bold underline ml-4 cursor-pointer hover:opacity-80"
            onClick={() => model.setFeedback(null)}
          >
            Đóng
          </button>
        </div>
      )}

      <ResourceState resource={model.resource} empty={!model.filteredItems.length} />
      {model.focusedQueueId && model.resource.data != null && !model.resource.loading && !model.resource.error &&
        !model.filteredItems.some((item) => item.queueId === model.focusedQueueId) && (
          <p role="status">Công việc không còn trong hàng đợi hiện tại</p>
        )}

      {/* 3. BẢNG HÀNG ĐỢI CÔNG VIỆC CHUẨN WIREFRAME (HQ-01) */}
      {!!model.filteredItems.length && (
        <div className="rounded-2xl border border-neutral bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="bg-background border-b border-neutral text-[10px] uppercase font-bold tracking-wider text-textSecondary">
                  <th className="py-2.5 px-4">Loại việc</th>
                  <th className="py-2.5 px-3">Tên</th>
                  <th className="py-2.5 px-3">Đối tượng</th>
                  <th className="py-2.5 px-3">Tạo lúc</th>
                  <th className="py-2.5 px-3">Đã chờ</th>
                  <th className="py-2.5 px-3">Người nhận</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral">
                {model.filteredItems.map((item) => {
                  const isMine = ownsClaim(item, model.scope.userId);
                  const isClaimedByOther = item.claimedBy && !isMine;
                  const linkTarget = getQueueLinkTarget(item, model.typeParam);

                  return (
                    <QueueTaskRow
                      key={item.queueId}
                      item={item}
                      isFocused={item.queueId === model.focusedQueueId}
                      isMine={isMine}
                      isClaimedByOther={isClaimedByOther}
                      resource={model.resource}
                      handleClaim={model.handleClaim}
                      setClaimTarget={model.setClaimTarget}
                      linkTarget={linkTarget}
                      setFeedback={model.setFeedback}
                      setReleaseTarget={model.setReleaseTarget}
                      onCheckWithdrawal={model.setWithdrawalCheckTarget}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phân trang */}
      {!!model.resource.data && model.resource.data.totalPages > 1 && (
        <Pager
          page={model.page}
          totalPages={model.resource.data.totalPages}
          onChange={(value) => model.changeFilter('page', String(value))}
        />
      )}

      {/* 4. MODAL NHẬN VIỆC (HQ-02-NhanViec.dc.html) & MODAL NHẢ VIỆC (HQ-02-NhaViec.dc.html) */}
      <QueueClaimDialog {...model.sections.QueueClaimDialog} />
      <QueueReleaseDialog {...model.sections.QueueReleaseDialog} />
      <WithdrawalCheckModal
        target={model.withdrawalCheckTarget}
        busy={model.resource?.busy}
        onApprove={model.handleApproveWithdrawal}
        onReject={model.handleRejectWithdrawal}
        onClose={() => model.setWithdrawalCheckTarget(null)}
      />
    </Page>
  );
}
