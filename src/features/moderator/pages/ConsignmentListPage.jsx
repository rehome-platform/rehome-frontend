import { WarehouseHistoryTabs } from '../components/WarehouseHistoryTabs.jsx';
import { TABLE_COLUMN_LABELS } from '../../../constants/tableColumns.js';
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page, ResourceState, Pager, Status, money, date } from '../components/WarehouseUi.jsx';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { consignmentService } from '../services/warehouseApi.js';
import { listItems, formatConditionLabel } from '../models/warehouseModel.js';
import { sortQueueItemsNewestFirst } from '../models/queueModel.js';

const TABS = [
  { key: 'PENDING', label: 'Chờ duyệt', countKey: 'pending' },
  { key: 'APPROVED', label: 'Đã duyệt, chờ mang đến', countKey: 'approved' },
  { key: 'INSPECTING', label: 'Đang kiểm định', countKey: 'inspecting' },
  { key: 'STOCKED', label: 'Nhập kho hôm nay', countKey: 'stocked' },
  { key: 'REJECTED', label: 'Đã từ chối', countKey: 'rejected' },
];

export default function ConsignmentListPage() {
  // Nhãn nút theo resumeStep của backend (ModeratorResumeStep) và tên cũ còn dùng trong fixture
  const RESUME_LABELS = {
    REVIEW_FORM: 'Mở duyệt',
    START_INSPECTION: 'Bắt đầu kiểm định',
    INSPECTION: 'Tiếp tục kiểm định',
    AWAIT_MEMBER_CONFIRM: 'Chờ xác nhận',
    WAITING_CONFIRMATION: 'Chờ xác nhận',
    STOCK_IN: 'Tiếp tục nhập kho',
    COMPLETED: 'Xem kết quả',
    PRINT: 'In tem',
  };
  const { scope } = usePhase2();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentStatus = searchParams.get('status') || 'PENDING';
  const page = Math.max(0, Number(searchParams.get('page')) || 0);

  const resource = useResource(
    (options) => consignmentService.listForms({ status: currentStatus, page }, options),
    [currentStatus, page]
  );

  const rawItems = listItems(resource.data);
  const sortedItems = useMemo(() => sortQueueItemsNewestFirst(rawItems), [rawItems]);
  const totalPages = resource.data?.totalPages || 1;
  const [detailForm, setDetailForm] = useState(null);

  const [lastConsignment, setLastConsignment] = useState(null);
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem('rehome_last_consignment');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < 3600000 * 6) {
          setLastConsignment(parsed);
        }
      }
    } catch { }
  }, []);

  const handleTabChange = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('status', key);
      next.set('page', '0');
      return next;
    });
  };

  const handlePageChange = (newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
  };

  return (
    <Page
      title="Form ký gửi"
      subtitle="Kiểm định & nhập kho · Điểm kí gửi ReHome"
      actions={
        <div className="flex gap-2">
          <Link to="/moderator/queue">
            <Button variant="outline">Hàng đợi công việc</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              resource.clearActionError?.();
              resource.refresh();
            }}
          >
            Tải lại
          </Button>
        </div>
      }
    >

      <WarehouseHistoryTabs type="INSPECTION">
        {/* THẺ GHIM ĐƠN VỪA THAO TÁC GẦN ĐÂY */}
        {lastConsignment && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface border border-neutral rounded-2xl text-xs shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-textSecondary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Đơn vừa mở gần đây
              </span>
              <span className="text-neutral">·</span>
              <span className="font-bold text-text truncate">{lastConsignment.name}</span>
              <span className="font-mono text-[11px] text-textSecondary bg-background px-2 py-0.5 rounded-md border border-neutral/60">
                #{String(lastConsignment.formId || '').slice(0, 8)}
              </span>
              <Status>{lastConsignment.status}</Status>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {lastConsignment.status && lastConsignment.status !== currentStatus && (
                <button
                  type="button"
                  onClick={() => handleTabChange(lastConsignment.status)}
                  className="px-3 py-1.5 rounded-xl border border-neutral bg-background text-xs font-semibold text-textSecondary hover:text-text hover:bg-neutral/20 transition-colors cursor-pointer"
                >
                  Mở tab {TABS.find((t) => t.key === lastConsignment.status)?.label || lastConsignment.status}
                </button>
              )}
              <Link
                to={`/moderator/consignments/${encodeURIComponent(lastConsignment.formId)}`}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
              >
                Tiếp tục kiểm định →
              </Link>
              <button
                type="button"
                aria-label="Ẩn thông báo đơn vừa mở"
                onClick={() => {
                  setLastConsignment(null);
                  try { sessionStorage.removeItem('rehome_last_consignment'); } catch { }
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-textSecondary hover:text-text hover:bg-background transition-colors cursor-pointer"
                title="Ẩn"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 1. THANH SUBTABS TRẠNG THÁI (KD-01-DanhSachForm.dc.html) */}
        <div role="tablist" aria-label="Trạng thái form ký gửi" className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isSelected = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${isSelected
                  ? 'border-[#006B2C] bg-[#006B2C] text-white shadow-sm'
                  : 'border-neutral bg-white text-textSecondary hover:bg-[#F6F9F4]'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <ResourceState resource={resource} empty={!sortedItems.length} />

        {/* 3. BẢNG DANH SÁCH FORM KÝ GỬI (KD-01) */}
        {!!sortedItems.length && (
          <div className="rounded-2xl border border-neutral bg-surface overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead>
                  <tr className="bg-background border-b border-neutral text-xs font-semibold text-textSecondary whitespace-nowrap">
                    <th className="py-2.5 px-3.5 w-16">Ảnh</th>
                    <th className="py-2.5 px-3">Sản phẩm</th>
                    <th className="py-2.5 px-3">Thương hiệu</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Giá mong muốn</th>
                    <th className="py-2.5 px-3">Gửi lúc</th>
                    <th className="py-2.5 px-3 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral">
                  {sortedItems.map((form) => {
                    const formId = form.formId || form.id || form.refId;
                    const firstPhoto = form.photos?.[0]?.url || form.photos?.[0] || form.coverPhoto;

                    return (
                      <tr key={formId} className="hover:bg-[#F6F9F4] transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="w-[52px] h-[52px] rounded-xl border border-neutral bg-[#F6F9F4] overflow-hidden flex items-center justify-center shrink-0">
                            {firstPhoto ? (
                              <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-textSecondary">RH</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-text">
                          {form.name || form.productName || '—'}
                        </td>
                        <td className="py-3 px-3 text-textSecondary whitespace-nowrap">
                          {form.brand || form.brandName || '—'}
                        </td>
                        <td className="py-3 px-3 text-textSecondary whitespace-nowrap">
                          {form.member?.fullName || form.memberName || '—'}
                        </td>
                        <td className="py-3 px-3 font-bold text-text whitespace-nowrap">
                          {money(form.desiredPrice ?? form.price)}
                        </td>
                        <td className="py-3 px-3 text-textSecondary whitespace-nowrap">
                          {form.createdAt ? new Date(form.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                          }) : '—'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1.5 px-3 whitespace-nowrap"
                              onClick={() => setDetailForm(form)}
                            >
                              Chi tiết
                            </Button>
                            <Link
                              to={`/moderator/consignments/${encodeURIComponent(formId)}`}
                              state={{ form }}
                              className="inline-flex items-center justify-center font-semibold text-xs py-1.5 px-3 bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl shadow-sm transition-colors whitespace-nowrap"
                            >
                              {RESUME_LABELS[form.resumeStep] || 'Mở duyệt'}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <Pager page={page} totalPages={totalPages} onChange={handlePageChange} />
        )}
      </WarehouseHistoryTabs>

      <Modal
        isOpen={Boolean(detailForm)}
        title="Chi tiết form ký gửi"
        onClose={() => setDetailForm(null)}
        size="md"
      >
        {detailForm && (() => {
          const detailFormId = detailForm.formId || detailForm.id || detailForm.refId;
          const isMine = detailForm.claimedBy === scope.userId;
          const detailPhotos = Array.isArray(detailForm.photos)
            ? detailForm.photos.map((p) => (typeof p === 'string' ? p : p?.url)).filter(Boolean)
            : detailForm.coverPhoto
              ? [detailForm.coverPhoto]
              : [];
          return (
            <div className="space-y-4 text-xs text-textSecondary">
              {detailPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detailPhotos.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt={detailForm.name || detailForm.productName || `Ảnh ${idx + 1}`}
                      className="w-20 h-20 rounded-xl object-cover border border-neutral"
                    />
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-neutral bg-[#F6F9F4] p-3.5 space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Mã form:</span>
                  <span className="font-mono font-bold text-text text-right break-all">{detailFormId}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Sản phẩm:</span>
                  <span className="font-bold text-text text-right">{detailForm.name || detailForm.productName || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Thương hiệu:</span>
                  <span className="text-text text-right">{detailForm.brand || detailForm.brandName || '—'}</span>
                </div>
                {(detailForm.categoryName || detailForm.category) && (
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold shrink-0">Danh mục:</span>
                    <span className="text-text text-right">{detailForm.categoryName || detailForm.category}</span>
                  </div>
                )}
                {detailForm.size && (
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold shrink-0">Kích cỡ:</span>
                    <span className="text-text text-right">{detailForm.size}</span>
                  </div>
                )}
                {detailForm.condition && (
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold shrink-0">Tình trạng khai báo:</span>
                    <span className="text-text text-right">{formatConditionLabel(detailForm.condition)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Member:</span>
                  <span className="font-medium text-text text-right">
                    {detailForm.member?.fullName || detailForm.memberName || '—'}
                    {detailForm.member?.memberCode ? ` (${detailForm.member.memberCode})` : ''}
                  </span>
                </div>
                {detailForm.member?.phone && (
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold shrink-0">Số điện thoại:</span>
                    <span className="text-text text-right">{detailForm.member.phone}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Giá mong muốn:</span>
                  <span className="font-bold text-text text-right">{money(detailForm.desiredPrice ?? detailForm.price)}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="font-semibold shrink-0">Trạng thái:</span>
                  <Status>{detailForm.status}</Status>
                </div>
                {isMine && (
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold shrink-0">Phụ trách:</span>
                    <span className="font-bold text-[#006B2C] text-right">Bạn đang nhận việc này</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="font-semibold shrink-0">Gửi lúc:</span>
                  <span className="text-text text-right">{detailForm.createdAt ? date(detailForm.createdAt) : '—'}</span>
                </div>
                {detailForm.description && (
                  <div className="pt-2 border-t border-neutral">
                    <span className="font-semibold block mb-1">Mô tả:</span>
                    <p className="text-text leading-relaxed">{detailForm.description}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetailForm(null)} className="whitespace-nowrap">
                  Đóng
                </Button>
                <Link
                  to={`/moderator/consignments/${encodeURIComponent(detailFormId)}`}
                  state={{ form: detailForm }}
                  className="inline-flex items-center justify-center font-semibold text-xs py-1.5 px-3 bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl shadow-sm transition-colors whitespace-nowrap"
                >
                  {RESUME_LABELS[detailForm.resumeStep] || 'Mở duyệt'}
                </Link>
              </div>
            </div>
          );
        })()}
      </Modal>
    </Page>
  );
}

