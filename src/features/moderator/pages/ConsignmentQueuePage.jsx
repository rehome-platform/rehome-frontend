import { useConsignmentQueue } from '../hooks/useConsignmentQueue.jsx';

import { QueueReleaseDialog, QueueTaskRow, QueueFilters, QueueTabs } from '../components/queue/QueueSections.jsx';
import React from "react";

import Button from '../../../components/common/Button.jsx';

import { ownsClaim } from "../models/warehouseModel.js";
import { Page, Pager, ResourceState } from "../components/WarehouseUi.jsx";

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
          className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            model.feedback.type === 'success'
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

      {/* 3. BẢNG HÀNG ĐỢI CÔNG VIỆC CHUẨN WIREFRAME (HQ-01) */}
      {!!model.filteredItems.length && (
        <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold tracking-wider text-[#5f5f5f]">
                  <th className="py-2.5 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={model.selectedIds.length === model.filteredItems.length && model.filteredItems.length > 0}
                      onChange={model.toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="py-2.5 px-3">Loại việc</th>
                  <th className="py-2.5 px-3">Mã</th>
                  <th className="py-2.5 px-3">Đối tượng</th>
                  <th className="py-2.5 px-3">Tạo lúc</th>
                  <th className="py-2.5 px-3">Đã chờ</th>
                  <th className="py-2.5 px-3">Người nhận</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {model.filteredItems.map((item) => {
                  const isMine = ownsClaim(item, model.scope.userId);
                  const isClaimedByOther = item.claimedBy && !isMine;
                  const isSelected = model.selectedIds.includes(item.queueId);

                  const linkTarget =
                    model.typeParam === 'PACKING' || item.type === 'PACKING'
                      ? `/moderator/packing?orderId=${encodeURIComponent(item.orderId || item.refId || '')}`
                      : `/moderator/consignments/${encodeURIComponent(item.formId || '')}`;

                  return (
                    <QueueTaskRow
                      key={item.queueId}
                      item={item}
                      isSelected={isSelected}
                      toggleSelectRow={model.toggleSelectRow}
                      isMine={isMine}
                      isClaimedByOther={isClaimedByOther}
                      resource={model.resource}
                      handleClaim={model.handleClaim}
                      linkTarget={linkTarget}
                      setFeedback={model.setFeedback}
                      setReleaseTarget={model.setReleaseTarget}
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

      {/* 4. MODAL NHẢ VIỆC (HQ-02-NhaViec.dc.html) */}
      <QueueReleaseDialog {...model.sections.QueueReleaseDialog} />
    </Page>
  );
}
