import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { queueService } from '../services/warehouseApi.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, ownsClaim } from '../models/warehouseModel.js';
import { Page, Pager, ResourceState, DetailLink } from '../components/WarehouseUi.jsx';

const OVERDUE_THRESHOLD_HOURS = 48;

const WORK_TYPES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FORM_REVIEW', label: 'Duyệt form' },
  { key: 'INSPECTION', label: 'Kiểm định' },
  { key: 'PACKING', label: 'Đóng gói' },
  { key: 'RETURNS', label: 'Trả hàng', directUrl: '/moderator/returns' },
  { key: 'VERIFICATION', label: 'Xác minh tổ chức', directUrl: '/moderator/verifications' },
  { key: 'VIOLATION', label: 'Vi phạm', directUrl: '/moderator/reports' },
];

export default function ConsignmentQueuePage() {
  const { scope } = usePhase2();
  const [search, setSearch] = useSearchParams();

  const typeParam = search.get('type') || 'ALL';
  const claimParam = search.get('claim') || '';
  const statusFilter = search.get('status') || '';
  const overdueOnly = search.get('overdue') === '1';
  const page = Math.max(0, Number(search.get('page')) || 0);

  // Modal nhả việc (HQ-02-NhaViec)
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Gọi API lấy dữ liệu hàng đợi
  const queryType = typeParam === 'ALL' ? undefined : typeParam;
  const resource = useResource(
    (options) => queueService.list({ type: queryType, claim: claimParam, page }, options),
    [queryType, claimParam, page],
  );

  // Tự động bắt lỗi mutation (409 xung đột nhận việc, 403 không có quyền nhả việc)
  useEffect(() => {
    if (resource.actionError) {
      if (
        resource.actionError.status === 409 ||
        resource.actionError.code === 'QUEUE_ITEM_ALREADY_CLAIMED'
      ) {
        setFeedback({
          type: 'error',
          message:
            'Công việc đã được người khác nhận trước. Hệ thống đã tải lại danh sách mới nhất.',
        });
      } else if (
        resource.actionError.status === 403 ||
        resource.actionError.code === 'QUEUE_ITEM_NOT_CLAIMED_BY_YOU'
      ) {
        setFeedback({
          type: 'error',
          message: 'Bạn không có quyền nhả việc do nhân viên khác đang nhận.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: resource.actionError.message || 'Đã xảy ra lỗi khi thao tác trên hàng đợi.',
        });
      }
      resource.clearActionError();
    }
  }, [resource.actionError]);

  const rawItems = listItems(resource.data);

  // Tính số giờ đã chờ
  const itemsWithMeta = rawItems.map((item) => {
    const createdTime = item.createdAt || item.queuedAt ? new Date(item.createdAt || item.queuedAt).getTime() : Date.now() - 3600000 * 2;
    const hours = Math.max(0, Math.floor((Date.now() - createdTime) / 3600000));
    const isOverdue = hours >= OVERDUE_THRESHOLD_HOURS;
    const typeLabel =
      item.type === 'FORM_REVIEW' || typeParam === 'FORM_REVIEW'
        ? 'Duyệt form ký gửi'
        : item.type === 'INSPECTION' || typeParam === 'INSPECTION'
        ? 'Kiểm định tại quầy'
        : item.type === 'PACKING' || typeParam === 'PACKING'
        ? 'Đóng gói đơn hàng'
        : 'Công việc kho';
    return {
      ...item,
      hours,
      isOverdue,
      typeLabel,
      formattedTime: new Date(createdTime).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  });

  // Áp dụng bộ lọc client-side (trạng thái, quá hạn, người nhận)
  const filteredItems = itemsWithMeta.filter((item) => {
    if (overdueOnly && !item.isOverdue) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (claimParam === 'mine' && !ownsClaim(item, scope.userId)) return false;
    if (claimParam === 'unclaimed' && item.claimedBy) return false;
    return true;
  });

  const changeFilter = (key, value) => {
    setFeedback(null);
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== 'page') next.set('page', '0');
      return next;
    });
  };

  const toggleOverdue = () => {
    changeFilter('overdue', overdueOnly ? '' : '1');
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((i) => i.queueId));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectRow = (queueId) => {
    setSelectedIds((prev) =>
      prev.includes(queueId) ? prev.filter((id) => id !== queueId) : [...prev, queueId],
    );
  };

  const handleClaim = (item) => {
    setFeedback(null);
    resource.mutate((options) => queueService.claim(item.queueId, options), {
      onSuccess: () => {
        setFeedback({
          type: 'success',
          message: `Đã nhận việc "${item.typeLabel}" (${item.formId || item.orderId || item.queueId}) thành công! Bạn có thể bấm "Mở" để xử lý ngay.`,
        });
      },
    });
  };

  const handleRelease = (item) => {
    setFeedback(null);
    resource.mutate((options) => queueService.release(item.queueId, options), {
      onSuccess: () => {
        setReleaseTarget(null);
        setFeedback({
          type: 'success',
          message: `Đã nhả việc "${item.typeLabel}" (${item.formId || item.orderId || item.queueId}) về hàng đợi thành công.`,
        });
      },
    });
  };

  return (
    <Page
      title="Hàng đợi công việc"
      subtitle="Việc không ai nhận sau 48 giờ sẽ tự nhả về hàng đợi và báo Admin"
      actions={
        <Button variant="outline" onClick={() => { setFeedback(null); resource.refresh(); }}>
          Tải lại
        </Button>
      }
    >
      {/* 1. THANH TABS LOẠI VIỆC (HQ-01) */}
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

      {/* 2. THANH BỘ LỌC (HQ-01) */}
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

      {/* Thông báo kết quả thao tác (Alert / Feedback) */}
      {feedback && (
        <div
          role="alert"
          className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]'
              : 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">
              {feedback.type === 'success' ? '✓' : '⚠'}
            </span>
            <p>{feedback.message}</p>
          </div>
          <button
            type="button"
            className="text-xs font-bold underline ml-4 cursor-pointer hover:opacity-80"
            onClick={() => setFeedback(null)}
          >
            Đóng
          </button>
        </div>
      )}

      <ResourceState resource={resource} empty={!filteredItems.length} />

      {/* 3. BẢNG HÀNG ĐỢI CÔNG VIỆC CHUẨN WIREFRAME (HQ-01) */}
      {!!filteredItems.length && (
        <div className="rounded-2xl border border-[#8a8a8a] bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="bg-[#f4f4f4] border-b border-[#8a8a8a] text-[10px] uppercase font-bold tracking-wider text-[#5f5f5f]">
                  <th className="py-2.5 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                      onChange={toggleSelectAll}
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
                {filteredItems.map((item) => {
                  const isMine = ownsClaim(item, scope.userId);
                  const isClaimedByOther = item.claimedBy && !isMine;
                  const isSelected = selectedIds.includes(item.queueId);

                  const linkTarget =
                    typeParam === 'PACKING' || item.type === 'PACKING'
                      ? `/moderator/packing?orderId=${encodeURIComponent(item.orderId || item.refId || '')}`
                      : `/moderator/consignments/${encodeURIComponent(item.formId || '')}`;

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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phân trang */}
      {!!resource.data && resource.data.totalPages > 1 && (
        <Pager
          page={page}
          totalPages={resource.data.totalPages}
          onChange={(value) => changeFilter('page', String(value))}
        />
      )}

      {/* 4. MODAL NHẢ VIỆC (HQ-02-NhaViec.dc.html) */}
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
    </Page>
  );
}
