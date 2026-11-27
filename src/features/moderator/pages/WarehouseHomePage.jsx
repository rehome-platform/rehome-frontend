import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Spinner from '../../../components/common/Spinner.jsx';
import TableActionButton from '../../../components/common/TableActionButton.jsx';
import { DASHBOARD_TONES } from '../../../constants/dashboardTheme.js';
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
import {
  ALL_QUEUE_CACHE_KEY,
  formatElapsedHours,
  queueItemMeta,
  sortQueueItemsNewestFirst,
} from '../models/queueModel.js';
import { OVERDUE_THRESHOLD_HOURS } from './ConsignmentQueuePage.config.js';
import { TABLE_COLUMN_LABELS } from '../../../constants/tableColumns.js';
import { formatWarehouseDisplayName } from '../../../utils/formatters.js';

const countOf = (data) => data?.totalElements ?? listItems(data).length;

function Stat({ label, value, tone, icon, to }) {
  const isAlert = tone === 'alert' && Number(value) > 0;
  const toneTokens = isAlert
    ? DASHBOARD_TONES.danger
    : tone === 'success'
      ? DASHBOARD_TONES.primary
      : tone === 'warning'
        ? DASHBOARD_TONES.warning
        : tone === 'info'
          ? DASHBOARD_TONES.accent
          : DASHBOARD_TONES.neutral;

  const card = (
    <div
      className={`group rounded-2xl border bg-white p-4 sm:p-5 shadow-card transition-all duration-200 ${
        isAlert ? 'border-[#FECDCA] bg-[#FEF3F2]/35' : 'border-[#DDE5D9]'
      } ${to ? 'hover:border-[#006B2C]/50 hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#5B6776]">{label}</p>
        {icon && (
          <span
            aria-hidden="true"
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneTokens.iconBox}`}
          >
            <span className="material-symbols-outlined text-[19px] leading-none">{icon}</span>
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className={`text-3xl font-extrabold font-heading tracking-tight ${isAlert ? 'text-[#B42318]' : 'text-[#1F2A37]'}`}>
          {value}
        </p>
        {to && (
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[16px] text-[#5B6776] opacity-0 group-hover:opacity-100 group-hover:text-[#006B2C] transition-all"
          >
            arrow_forward
          </span>
        )}
      </div>
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
  const { scope, warehouse, cache } = usePhase2();
  const [feedback, setFeedback] = useState(null);
  const [claimTarget, setClaimTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const allQueues = useResource((o) => queueService.list({}, o), [], {
    cacheKey: ALL_QUEUE_CACHE_KEY,
    invalidatePrefixes: ['queue:', 'consignments:', 'inventory:', 'returns:', 'verifications:', 'violation-reports:', 'history:'],
  });
  const onSale = useResource((o) => inventoryService.list({ status: 'ON_SALE' }, o), [], {
    cacheKey: 'inventory:home:ON_SALE',
  });
  const resources = [allQueues, onSale];

  const conflictError =
    allQueues.actionError?.status === 409 ||
    allQueues.actionError?.code === 'QUEUE_ITEM_ALREADY_CLAIMED'
      ? allQueues.actionError
      : null;

  useEffect(() => {
    if (conflictError) {
      setFeedback({
        type: 'error',
        message:
          'Công việc đã được người khác nhận trước. Hệ thống đã tải lại dữ liệu mới nhất.',
      });
    }
  }, [conflictError]);

  const tasks = listItems(allQueues.data).map((item) => {
    const meta = queueItemMeta(item);
    return {
      ...meta,
      kind: meta.type,
      kindLabel: meta.typeLabel,
      source: allQueues,
    };
  });
  const pending = countOf(allQueues.data);
  const overdue = tasks.filter((t) => t.isOverdue).length;
  const packingCount = tasks.filter((t) => t.type === 'PACKING').length;
  const withdrawalCount = tasks.filter(
    (t) => t.type === 'WITHDRAWAL' || t.type === 'ITEM_WITHDRAWAL',
  ).length;
  const sorted = sortQueueItemsNewestFirst(tasks).slice(0, 5);
  const loading = resources.some((r) => r.loading);
  const firstError = resources.find((r) => r.error);
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const refresh = (clearFeedback = true) => {
    if (clearFeedback) setFeedback(null);
    resources.forEach((r) => r.refresh());
  };

  const handleClaim = (task) => {
    setFeedback(null);
    allQueues.mutate((o) => queueService.claim(task.queueId, o), {
      skipRefresh: true,
      onSuccess: () => {
        setClaimTarget(null);
        cache?.invalidate(['queue:', 'consignments:', 'inventory:', 'returns:', 'verifications:', 'violation-reports:']);
        setFeedback({
          type: 'success',
          message: `Đã nhận việc "${task.kindLabel}" (${task.formId || task.orderId || task.refId || task.queueId}) thành công.`,
        });
        refresh(false);
      },
      onError: () => {
        setClaimTarget(null);
      },
    });
  };

  return (
    <Page
      title="Tổng quan hôm nay"
      subtitle={`${today} · mọi số liệu chỉ tính trong ${formatWarehouseDisplayName(warehouse?.name) || 'điểm kí gửi hiện tại'}`}
      actions={
        <>
          <Button variant="outline" onClick={refresh} className="gap-1.5">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Tải lại</span>
          </Button>
          <Link to="/moderator/counter">
            <Button className="gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">storefront</span>
              <span>Mở quầy tiếp nhận</span>
            </Button>
          </Link>
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
        <Stat label={`Quá hạn ${OVERDUE_THRESHOLD_HOURS}h`} value={overdue} icon="schedule" tone="alert" to="/moderator/queue" />
        <Stat label="Đơn chờ đóng gói" value={packingCount} icon="package_2" tone="warning" to="/moderator/packing" />
        <Stat label="Chờ rút hàng" value={withdrawalCount} icon="assignment_return" tone="warning" to="/moderator/queue?type=WITHDRAWAL" />
        <Stat label="Sản phẩm đang bán" value={countOf(onSale.data)} icon="inventory_2" tone="success" to="/moderator/inventory?status=ON_SALE" />
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
                    <th className="py-3 px-3.5">{TABLE_COLUMN_LABELS.TARGET}</th>
                    <th className="py-3 px-3.5">{TABLE_COLUMN_LABELS.WAITED}</th>
                    <th className="py-3 px-3.5">Người nhận</th>
                    <th className="py-3 px-3.5 text-right">{TABLE_COLUMN_LABELS.ACTIONS}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral/70">
                  {sorted.map((task) => {
                    const mine = ownsClaim(task, scope.userId);
                    const isOverdue = Boolean(task.isOverdue);
                    const subjectName = extractQueueSubjectName(task);
                    const displaySubject =
                      subjectName !== '—'
                        ? subjectName
                        : (task.targetName && !/^(OD-|#|[0-9a-f-]{8,})/i.test(task.targetName) ? task.targetName : task.name) || '—';
                    const isWithdrawal = task.kind === 'WITHDRAWAL' || task.kind === 'ITEM_WITHDRAWAL';
                    const link = task.kind === 'PACKING'
                      ? `/moderator/packing?orderId=${encodeURIComponent(task.orderId || task.refId || '')}`
                      : isWithdrawal && task.status !== 'PENDING_APPROVAL'
                        ? `/moderator/counter?refId=${encodeURIComponent(task.refId || task.id || '')}`
                        : `/moderator/queue?${new URLSearchParams({
                            ...(task.kind ? { type: task.kind } : {}),
                            queueId: task.queueId,
                          })}`;
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
                          <div
                            data-testid="home-task-actions-cell"
                            className="inline-grid grid-cols-[auto_144px] items-center gap-2 whitespace-nowrap"
                          >
                            <TableActionButton
                              action="view"
                              onClick={() => setDetailTarget(task)}
                            />
                            {!task.claimedBy ? (
                              <Button size="sm" className={`${QUEUE_PRIMARY_BTN_CLASS} w-full`} loading={task.source.busy} onClick={() => setClaimTarget(task)}>
                                Nhận việc
                              </Button>
                            ) : mine ? (
                              <Link
                                className={`${QUEUE_PRIMARY_LINK_CLASS} w-full`}
                                to={link}
                              >
                                Mở
                              </Link>
                            ) : (
                              <Button
                                size="sm"
                                disabled
                                variant="outline"
                                className={`${QUEUE_ACTION_BTN_CLASS} w-full opacity-50 cursor-not-allowed`}
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
        resource={claimTarget?.source || allQueues}
        setClaimTarget={setClaimTarget}
        handleClaim={handleClaim}
      />
      <QueueTaskDetailModal target={detailTarget} onClose={() => setDetailTarget(null)} />
    </Page>
  );
}
