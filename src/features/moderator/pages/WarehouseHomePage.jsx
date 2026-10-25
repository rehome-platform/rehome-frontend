import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { queueService, inventoryService } from '../services/warehouseApi.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, ownsClaim } from '../models/warehouseModel.js';
import { Page, Card, ResourceState } from '../components/WarehouseUi.jsx';

const OVERDUE_HOURS = 48;
const QUEUE_TYPES = [
  { type: 'FORM_REVIEW', label: 'Duyệt form ký gửi' },
  { type: 'INSPECTION', label: 'Kiểm định tại quầy' },
  { type: 'PACKING', label: 'Đóng gói đơn hàng' },
];
const STOCK_ROWS = [
  { status: 'ON_SALE', label: 'Đang bán' },
  { status: 'WAITING_END_OF_TERM', label: 'Chờ xử lý cuối kỳ', to: '/moderator/end-of-term' },
  { status: 'UNCLAIMED', label: 'Vô thừa nhận', to: '/moderator/end-of-term' },
];

const countOf = (data) => data?.totalElements ?? listItems(data).length;
const waitedHours = (item) => {
  const created = item.createdAt || item.queuedAt;
  const time = created ? new Date(created).getTime() : NaN;
  return Number.isFinite(time) ? Math.max(0, Math.floor((Date.now() - time) / 3600000)) : null;
};
const waitedText = (hours) => (hours == null ? '—' : hours >= 1 ? `${hours} giờ` : '< 1 giờ');

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 ${tone === 'alert' ? 'border-primary border-2' : 'border-neutral'}`}>
      <p className="text-xs text-textSecondary">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function WarehouseHomePage() {
  const { scope, warehouse } = usePhase2();
  const review = useResource((o) => queueService.list({ type: 'FORM_REVIEW' }, o), []);
  const inspection = useResource((o) => queueService.list({ type: 'INSPECTION' }, o), []);
  const packing = useResource((o) => queueService.list({ type: 'PACKING' }, o), []);
  const onSale = useResource((o) => inventoryService.list({ status: STOCK_ROWS[0].status }, o), []);
  const endTerm = useResource((o) => inventoryService.list({ status: STOCK_ROWS[1].status }, o), []);
  const unclaimed = useResource((o) => inventoryService.list({ status: STOCK_ROWS[2].status }, o), []);
  const queues = [review, inspection, packing];
  const stocks = [onSale, endTerm, unclaimed];

  const tasks = QUEUE_TYPES.flatMap(({ type, label }, index) =>
    listItems(queues[index].data).map((item) => ({ ...item, kind: type, kindLabel: label, source: queues[index], hours: waitedHours(item) })),
  );
  const pending = queues.reduce((sum, r) => sum + countOf(r.data), 0);
  const overdue = tasks.filter((t) => (t.hours ?? 0) >= OVERDUE_HOURS).length;
  const sorted = [...tasks].sort((a, b) => (b.hours ?? -1) - (a.hours ?? -1)).slice(0, 5);
  const loading = [...queues, ...stocks].some((r) => r.loading);
  const firstError = [...queues, ...stocks].find((r) => r.error);
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const refresh = () => [...queues, ...stocks].forEach((r) => r.refresh());

  return (
    <Page
      title="Tổng quan hôm nay"
      subtitle={`${today} · mọi số liệu chỉ tính trong ${warehouse?.name || 'kho hiện tại'}`}
      actions={
        <>
          <Button variant="outline" onClick={refresh}>Tải lại</Button>
          <Link to="/moderator/counter"><Button>Mở quầy tiếp nhận</Button></Link>
        </>
      }
    >
      {loading && <p role="status">Đang tải dữ liệu…</p>}
      {firstError && <ResourceState resource={firstError} empty={false} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Việc chờ xử lý" value={pending} />
        <Stat label={`Quá hạn ${OVERDUE_HOURS}h`} value={overdue} tone="alert" />
        <Stat label="Đơn chờ đóng gói" value={countOf(packing.data)} />
        <Stat label="Tồn kho đang bán" value={countOf(onSale.data)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <Card title="Việc cần làm sớm nhất">
          <Link className="block text-xs text-primary underline" to="/moderator/queue">Xem tất cả {pending} việc</Link>
          {!sorted.length ? (
            <p className="text-sm text-textSecondary">Không có việc nào đang chờ.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral text-[10px] uppercase tracking-wide text-textSecondary">
                    <th className="py-2">Loại việc</th><th>Mã</th><th>Đối tượng</th><th>Chờ</th><th>Người nhận</th><th />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((task) => {
                    const mine = ownsClaim(task, scope.userId);
                    const link = task.kind === 'PACKING'
                      ? `/moderator/packing?orderId=${encodeURIComponent(task.orderId || task.refId || '')}`
                      : `/moderator/consignments/${encodeURIComponent(task.formId || '')}`;
                    return (
                      <tr key={`${task.kind}-${task.queueId}`} className={`border-b border-neutral ${(task.hours ?? 0) >= OVERDUE_HOURS ? 'border-l-4 border-l-primary' : ''}`}>
                        <td className="py-3 font-medium">{task.kindLabel}</td>
                        <td>{task.formId || task.orderId || task.queueId}</td>
                        <td>{task.name || '—'}</td>
                        <td>{waitedText(task.hours)}</td>
                        <td className="text-textSecondary">{task.claimedBy ? (mine ? 'bạn đang giữ' : 'người khác giữ') : 'chưa ai nhận'}</td>
                        <td className="text-right">
                          {!task.claimedBy ? (
                            <Button loading={task.source.busy} onClick={() => task.source.mutate((o) => queueService.claim(task.queueId, o))}>Nhận</Button>
                          ) : mine ? (
                            <Link className="text-primary underline" to={link}>Mở</Link>
                          ) : (
                            <span className="text-xs text-textSecondary">Đã có người nhận</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Tồn kho theo trạng thái">
          <ul className="space-y-2 text-sm">
            {STOCK_ROWS.map((row, index) => (
              <li key={row.status} className={`flex justify-between ${index === 2 ? 'border-t border-neutral pt-2 font-semibold' : ''}`}>
                {row.to ? <Link className="text-textSecondary hover:underline" to={row.to}>{row.label}</Link> : <span className="text-textSecondary">{row.label}</span>}
                <span className="font-semibold">{countOf(stocks[index].data)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
