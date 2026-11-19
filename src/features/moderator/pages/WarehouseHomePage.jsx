import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Spinner from '../../../components/common/Spinner.jsx';
import { queueService, inventoryService } from '../services/warehouseApi.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, ownsClaim } from '../models/warehouseModel.js';
import { Page, Card, ResourceState } from '../components/WarehouseUi.jsx';
import {
  QUEUE_ACTION_BTN_CLASS,
  QUEUE_TEXT_LINK_CLASS,
  QUEUE_PRIMARY_BTN_CLASS,
  QUEUE_PRIMARY_LINK_CLASS,
  QueueClaimDialog,
  QueueTaskDetailModal,
  extractQueueSubjectName,
} from '../components/queue/QueueSections.jsx';
import { formatElapsedHours, sortQueueItemsNewestFirst } from '../models/queueModel.js';

const OVERDUE_HOURS = 48;
const QUEUE_TYPES = [
  { type: 'FORM_REVIEW', label: 'Duyệt form ký gửi' },
  { type: 'INSPECTION', label: 'Kiểm định tại quầy' },
  { type: 'PACKING', label: 'Đóng gói đơn hàng' },
  { type: 'WITHDRAWAL', label: 'Yêu cầu rút hàng', to: '/moderator/queue?type=WITHDRAWAL' },
];

const countOf = (data) => data?.totalElements ?? listItems(data).length;
const waitedHours = (item) => {
  const created = item.createdAt || item.queuedAt;
  const time = created ? new Date(created).getTime() : NaN;
  return Number.isFinite(time) ? Math.max(0, Math.floor((Date.now() - time) / 3600000)) : null;
};

function Stat({ label, value, tone, icon, to }) {
  const isAlert = tone === 'alert' && Number(value) > 0;
  const iconToneClass = isAlert
    ? 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]'
    : tone === 'success'
      ? 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]'
      : tone === 'warning'
        ? 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
        : tone === 'info'
          ? 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]'
          : 'bg-[#F6F9F4] text-[#006B2C] border-[#DDE5D9]';

  const card = (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-card transition-all duration-150 ${isAlert ? 'border-[#FECDCA] bg-[#FEF3F2]/30' : 'border-neutral/80'
        } ${to ? 'hover:border-[#006B2C]/50 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-textSecondary">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${iconToneClass}`}
          >
            <span className="material-symbols-outlined text-[18px] leading-none">{icon}</span>
          </span>
        )}
      </div>
      <p className={`mt-2.5 text-3xl font-bold tracking-tight ${isAlert ? 'text-[#B42318]' : 'text-text'}`}>
        {value}
      </p>
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30">
      {card}
    </Link>
  ) : (
    card
  );
}

export default function WarehouseHomePage() {
  const { scope, warehouse } = usePhase2();
  const [feedback, setFeedback] = useState(null);
  const [claimTarget, setClaimTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const review = useResource((o) => queueService.list({ type: 'FORM_REVIEW' }, o), []);
  const inspection = useResource((o) => queueService.list({ type: 'INSPECTION' }, o), []);
  const packing = useResource((o) => queueService.list({ type: 'PACKING' }, o), []);
  const withdrawal = useResource((o) => queueService.list({ type: 'WITHDRAWAL' }, o), []);
  const onSale = useResource((o) => inventoryService.list({ status: 'ON_SALE' }, o), []);
  const queues = [review, inspection, packing, withdrawal];
  const stocks = [onSale];

  const conflictError = queues.find(
    (q) =>
      q.actionError?.status === 409 ||
      q.actionError?.code === 'QUEUE_ITEM_ALREADY_CLAIMED',
  );

  useEffect(() => {
    if (conflictError) {
      setFeedback({
        type: 'error',
        message:
          'Công việc đã được người khác nhận trước. Hệ thống đã tải lại dữ liệu mới nhất.',
      });
    }
  }, [conflictError]);

  const tasks = QUEUE_TYPES.flatMap(({ type, label }, index) =>
    listItems(queues[index].data).map((item) => ({ ...item, kind: type, kindLabel: label, source: queues[index], hours: waitedHours(item) })),
  );
  const pending = queues.reduce((sum, r) => sum + countOf(r.data), 0);
  const overdue = tasks.filter((t) => (t.hours ?? 0) >= OVERDUE_HOURS).length;
  const sorted = sortQueueItemsNewestFirst(tasks).slice(0, 5);
  const loading = [...queues, ...stocks].some((r) => r.loading);
  const firstError = [...queues, ...stocks].find((r) => r.error);
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const refresh = () => {
    setFeedback(null);
    [...queues, ...stocks].forEach((r) => r.refresh());
  };

  const handleClaim = (task) => {
    setFeedback(null);
    task.source.mutate((o) => queueService.claim(task.queueId, o), {
      onSuccess: () => {
        setFeedback({
          type: 'success',
          message: `Đã nhận việc "${task.kindLabel}" (${task.formId || task.orderId || task.queueId}) thành công.`,
        });
        refresh();
      },
    });
  };

  return (
    <Page
      title="Tổng quan hôm nay"
      subtitle={`${today} · mọi số liệu chỉ tính trong ${warehouse?.name || 'điểm kí gửi hiện tại'}`}
      actions={
        <>
          <Button variant="outline" onClick={refresh}>Tải lại</Button>
          <Link to="/moderator/counter"><Button>Mở quầy tiếp nhận</Button></Link>
        </>
      }
    >
      {feedback && (
        <div
          role="alert"
          className={`rounded-xl p-3 text-xs font-semibold flex items-center justify-between shadow-sm transition-all ${feedback.type === 'success'
            ? 'bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]'
            : 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]'
            }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === 'success' ? '✓' : '⚠'}</span>
            <p>{feedback.message}</p>
          </div>
          <button
            type="button"
            className="text-xs font-bold underline ml-2 cursor-pointer hover:opacity-80"
            onClick={() => setFeedback(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {loading && (
        <div role="status" className="flex items-center gap-2.5 py-2 text-sm text-textSecondary">
          <Spinner size="sm" />
          <span>Đang tải dữ liệu…</span>
        </div>
      )}
      {firstError && <ResourceState resource={firstError} empty={false} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Việc chờ xử lý" value={pending} icon="pending_actions" tone="info" to="/moderator/queue" />
        <Stat label={`Quá hạn ${OVERDUE_HOURS}h`} value={overdue} icon="schedule" tone="alert" to="/moderator/queue" />
        <Stat label="Đơn chờ đóng gói" value={countOf(packing.data)} icon="package_2" tone="warning" to="/moderator/packing" />
        <Stat label="Chờ rút hàng" value={countOf(withdrawal.data)} icon="assignment_return" tone="warning" to="/moderator/queue?type=WITHDRAWAL" />
        <Stat label="Tồn kho đang bán" value={countOf(onSale.data)} icon="inventory_2" tone="success" to="/moderator/inventory?status=ON_SALE" />
      </div>

      <div className="grid gap-6">
        <Card
          title="Việc cần làm sớm nhất"
          actions={
            <Link className="text-xs font-semibold text-primary hover:underline" to="/moderator/queue">
              Xem tất cả {pending} việc →
            </Link>
          }
        >
          {!sorted.length ? (
            <p className="text-sm text-textSecondary py-4 text-center">Không có việc nào đang chờ.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral/70">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral text-xs font-semibold text-textSecondary bg-[#F6F9F4]/80 whitespace-nowrap">
                    <th className="py-3 px-3.5">Loại việc</th>
                    <th className="py-3 px-3.5">Đối tượng</th>
                    <th className="py-3 px-3.5">Chờ</th>
                    <th className="py-3 px-3.5">Người nhận</th>
                    <th className="py-3 px-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral/70">
                  {sorted.map((task) => {
                    const mine = ownsClaim(task, scope.userId);
                    const isOverdue = (task.hours ?? 0) >= OVERDUE_HOURS;
                    const subjectName = extractQueueSubjectName(task);
                    const displaySubject =
                      subjectName !== '—'
                        ? subjectName
                        : (task.targetName && !/^(OD-|#|[0-9a-f-]{8,})/i.test(task.targetName) ? task.targetName : task.name) || '—';
                    const link = task.kind === 'PACKING'
                      ? `/moderator/packing?orderId=${encodeURIComponent(task.orderId || task.refId || '')}`
                      : task.kind === 'WITHDRAWAL'
                        ? `/moderator/counter?refId=${encodeURIComponent(task.refId || task.id || '')}`
                        : `/moderator/queue?${new URLSearchParams({ type: task.kind, queueId: task.queueId })}`;
                    return (
                      <tr key={`${task.kind}-${task.queueId}`} className={`transition-colors ${isOverdue ? 'border-l-4 border-l-[#F04438] bg-[#FEF3F2]/40 hover:bg-[#FEF3F2]/70' : 'hover:bg-[#F6F9F4]/60'}`}>
                        <td className="py-3 px-3.5 font-semibold text-[#191C19] whitespace-nowrap">{task.kindLabel}</td>
                        <td className="py-3 px-3.5 font-medium text-text whitespace-nowrap">
                          {displaySubject}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className={isOverdue ? 'font-semibold text-[#B42318]' : 'text-textSecondary'}>
                            {formatElapsedHours(task.hours)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {task.claimedBy ? (
                            mine ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2.5 py-0.5 text-[11px] font-semibold text-[#067647] whitespace-nowrap">
                                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                                bạn đang giữ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#B54708] whitespace-nowrap">
                                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#F79009]" />
                                người khác giữ
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-[#F2F4F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#344054] whitespace-nowrap">
                              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[#667085]" />
                              chưa ai nhận
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap align-middle">
                          <div className="flex items-center justify-end gap-2 flex-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              className={QUEUE_TEXT_LINK_CLASS}
                              onClick={() => setDetailTarget(task)}
                            >
                              Chi tiết
                            </Button>
                            {!task.claimedBy ? (
                              <Button size="sm" className={QUEUE_PRIMARY_BTN_CLASS} loading={task.source.busy} onClick={() => setClaimTarget(task)}>
                                Nhận việc
                              </Button>
                            ) : mine ? (
                              <Link
                                className={QUEUE_PRIMARY_LINK_CLASS}
                                to={link}
                              >
                                Mở
                              </Link>
                            ) : (
                              <Button
                                size="sm"
                                disabled
                                variant="outline"
                                className={`${QUEUE_ACTION_BTN_CLASS} opacity-50 cursor-not-allowed`}
                              >
                                Đã có người nhận
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <QueueClaimDialog
        claimTarget={claimTarget}
        resource={claimTarget?.source || review}
        setClaimTarget={setClaimTarget}
        handleClaim={(task) => {
          handleClaim(task);
          setClaimTarget(null);
        }}
      />
      <QueueTaskDetailModal target={detailTarget} onClose={() => setDetailTarget(null)} />
    </Page>
  );
}
