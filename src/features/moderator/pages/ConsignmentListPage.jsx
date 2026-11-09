import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page, ResourceState, Pager, money } from '../components/WarehouseUi.jsx';
import Button from '../../../components/common/Button.jsx';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { consignmentService } from '../services/warehouseApi.js';
import { listItems } from '../models/warehouseModel.js';

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
  const totalPages = resource.data?.totalPages || 1;

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
    } catch {}
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
      {/* THẺ GHIM ĐƠN VỪA THAO TÁC GẦN ĐÂY */}
      {lastConsignment && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#D97706]">📌 Đơn vừa mở gần đây:</span>
            <span className="font-semibold text-[#191C19]">{lastConsignment.name}</span>
            <span className="text-[#717971]">({lastConsignment.formId})</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEA619] text-[#191C19]">
              {lastConsignment.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastConsignment.status && lastConsignment.status !== currentStatus && (
              <button
                type="button"
                onClick={() => handleTabChange(lastConsignment.status)}
                className="text-xs text-[#5B6776] underline hover:text-[#191C19]"
              >
                Mở tab {TABS.find((t) => t.key === lastConsignment.status)?.label || lastConsignment.status}
              </button>
            )}
            <Link
              to={`/moderator/consignments/${encodeURIComponent(lastConsignment.formId)}`}
              className="font-bold text-[#006B2C] hover:underline flex items-center gap-1"
            >
              Tiếp tục kiểm định →
            </Link>
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
                  ? 'border-[#006B2C] bg-[#006B2C] text-white shadow-sm'
                  : 'border-[#a8a8a8] bg-white text-[#4a4a4a] hover:bg-[#F0F5EE]'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. KHUNG LƯU Ý HƯỚNG DẪN DUYỆT TRÊN ẢNH (KD-01) */}
      <div className="p-3.5 rounded-xl border-[1.5px] border-[#2b2b2b] bg-[#f4f4f4] text-xs text-[#2b2b2b] leading-relaxed shadow-sm">
        <strong>Ở bước này bạn duyệt trên ảnh, chưa thấy hàng thật.</strong> Duyệt nghĩa là mời Member mang đồ đến kho trong 7 ngày, chưa phải cam kết nhận hàng. Kiểm định thật diễn ra tại quầy.
      </div>

      <ResourceState resource={resource} empty={!rawItems.length} />

      {/* 3. BẢNG DANH SÁCH FORM KÝ GỬI (KD-01) */}
      {!!rawItems.length && (
        <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead>
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold tracking-wider text-[#5f5f5f]">
                  <th className="py-2.5 px-3.5 w-16">Ảnh</th>
                  <th className="py-2.5 px-3">Mã form</th>
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3">Thương hiệu</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Giá mong muốn</th>
                  <th className="py-2.5 px-3">Gửi lúc</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {rawItems.map((form) => {
                  const formId = form.formId || form.id || form.refId;
                  const isMine = form.claimedBy === scope.userId;
                  const firstPhoto = form.photos?.[0]?.url || form.photos?.[0] || form.coverPhoto;

                  return (
                    <tr key={formId} className="hover:bg-[#F9FAF9] transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="w-13 h-13 w-[52px] h-[52px] rounded border border-[#c4c4c4] bg-[#fafafa] overflow-hidden flex items-center justify-center shrink-0">
                          {firstPhoto ? (
                            <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-[#8a8a8a]">RH</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[#191C19]">
                        <div>{formId}</div>
                        {isMine && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-[#006B2C] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                            Bạn đang nhận việc này
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#191C19]">
                        {form.name || form.productName || '—'}
                      </td>
                      <td className="py-3 px-3 text-[#414942]">
                        {form.brand || form.brandName || '—'}
                      </td>
                      <td className="py-3 px-3 text-[#414942]">
                        {form.member?.fullName || form.memberName || '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#191C19]">
                        {money(form.desiredPrice ?? form.price)}
                      </td>
                      <td className="py-3 px-3 text-[#5f5f5f]">
                        {form.createdAt ? new Date(form.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/moderator/consignments/${encodeURIComponent(formId)}`}
                          state={{ form }}
                          className="inline-block font-semibold text-xs py-1.5 px-3 bg-[#006B2C] text-white hover:bg-[#005523] rounded-lg shadow-sm transition-colors"
                        >
                          {RESUME_LABELS[form.resumeStep] || 'Mở duyệt'}
                        </Link>
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
    </Page>
  );
}

