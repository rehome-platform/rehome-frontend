import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { warehouseHistoryService } from '../services/warehouseHistoryApi.js';
import { warehouseDateTime } from '../models/warehouseTime.js';
import { listItems } from '../models/warehouseModel.js';
import { Pager, ResourceState } from './WarehouseUi.jsx';
import { HISTORY_TABLE_COLUMNS } from '../../../constants/tableColumns.js';
import {
  formatHistoryAction,
  formatHistoryResult,
  formatHistoryTarget,
} from '../../../utils/formatHistoryValue.js';

function detailLink(row) {
  let targetType = row.targetType;
  let targetId = row.targetId;

  if (row.target) {
    const parts = String(row.target).trim().split(/\s+/);
    if (!targetType) targetType = parts[0];
    if (!targetId) targetId = parts.slice(1).join(' ');
  }

  const normalizedType = String(targetType || '').trim().toUpperCase();
  if (!targetId) return null;
  const id = encodeURIComponent(String(targetId).trim());
  if (normalizedType === 'ORDER') return `/moderator/packing?orderId=${id}`;
  if (normalizedType === 'CONSIGNMENT_FORM') return `/moderator/consignments/${id}`;
  if (normalizedType === 'PRODUCT') return `/moderator/inventory/${id}`;
  return null;
}

export function WarehouseHistoryTabs({ type, children, onWorkTabClick }) {
  const [search, setSearch] = useSearchParams();
  const history = search.get('view') === 'history';
  const page = Math.max(0, Number(search.get('historyPage')) || 0);
  const resource = useResource(options => warehouseHistoryService.list(type, { page, size: 20 }, options),
    [type, page], { enabled: history, cacheKey: `history:${type}:${page}` });
  const rows = resource.data?.content ?? listItems(resource.data);
  const update = (key, value) => setSearch(previous => {
    const next = new URLSearchParams(previous);
    value === null ? next.delete(key) : next.set(key, String(value));
    return next;
  });
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Công việc và lịch sử" className="flex flex-wrap gap-2">
        <Button role="tab" aria-selected={!history} variant={history ? 'outline' : 'primary'} onClick={() => (onWorkTabClick ? onWorkTabClick() : update('view', null))}>Công việc</Button>
        <Button role="tab" aria-selected={history} variant={history ? 'primary' : 'outline'} onClick={() => update('view', 'history')}>Lịch sử</Button>
      </div>
      {history ? <section aria-label="Lịch sử thao tác điểm kí gửi" className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" onClick={resource.refresh} className="gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Tải lại lịch sử</span>
          </Button>
        </div>
        <ResourceState resource={resource} />
        {!resource.loading && !resource.error && <div className="overflow-x-auto rounded-xl border border-neutral bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-background"><tr>
              {HISTORY_TABLE_COLUMNS.map(label => <th key={label} className="p-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-neutral">{rows.length ? rows.map((row, idx) => {
              const href = detailLink(row);
              const targetDisplay = formatHistoryTarget(row);
              const actionDisplay = formatHistoryAction(row);
              const actorDisplay = row.actorName || row.actor || 'Chưa có thông tin';
              const resultDisplay = formatHistoryResult(row);
              const timeDisplay = warehouseDateTime(row.createdAt || row.timestamp);
              const rowKey = row.id || `${row.timestamp || row.createdAt || ''}-${row.target || row.targetId || ''}-${row.action || row.actionType || ''}-${idx}`;

              return <tr key={rowKey}>
                <td className="p-3">{timeDisplay}</td>
                <td className="p-3 break-words">{href ? <Link className="text-primary underline" to={href}>{targetDisplay}</Link> : targetDisplay}</td>
                <td className="p-3">{actionDisplay}</td>
                <td className="p-3">{actorDisplay}</td>
                <td className="p-3">{resultDisplay}</td>
              </tr>;
            }) : <tr><td className="p-8 text-center text-textSecondary" colSpan={5}>Chưa có lịch sử thao tác.</td></tr>}</tbody>
          </table>
        </div>}
        {!!resource.data && <Pager page={page} totalPages={resource.data.totalPages || 1} onChange={value => update('historyPage', value)} />}
      </section> : children}
    </div>
  );
}
