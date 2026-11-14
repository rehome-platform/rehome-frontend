import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { warehouseHistoryService } from '../services/warehouseHistoryApi.js';
import { warehouseDateTime } from '../models/warehouseTime.js';
import { listItems } from '../models/warehouseModel.js';
import { Pager, ResourceState } from './WarehouseUi.jsx';

const actions = {
  CLAIM_TASK: 'Nhận việc', RELEASE_TASK: 'Nhả việc', SCAN_SKU: 'Đối chiếu SKU',
  CREATE_SHIPMENT: 'Tạo vận đơn GHN', APPROVE_FORM: 'Duyệt phiếu ký gửi',
  REJECT_FORM: 'Từ chối phiếu ký gửi', START_INSPECTION: 'Bắt đầu kiểm định',
  RETURN_ONSITE: 'Trả hàng tại chỗ', COMPLETE_INSPECTION: 'Hoàn tất kiểm định',
  CONFIRM_RECEIPT: 'Xác nhận biên nhận', STOCK_PRODUCT: 'Nhập kho sản phẩm',
  UPDATE_PRODUCT: 'Cập nhật sản phẩm', OPEN_DEGRADED_CASE: 'Mở hồ sơ hàng xuống cấp',
  DECIDE_DEGRADED_CASE: 'Xử lý hàng xuống cấp', DECIDE_END_OF_TERM: 'Quyết định cuối kỳ',
  RECONSIGN_TERMS: 'Đề xuất điều khoản ký gửi lại', HANDOVER_ITEM: 'Bàn giao nhận lại',
  CONFIRM_RECONSIGN: 'Xác nhận ký gửi lại',
  CONFIRM_UNCLAIMED_TRANSFER: 'Chuyển giao hàng vô thừa nhận',
};
const results = {
  SUCCESS: 'Thành công', PASS: 'Đạt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối',
  INSPECTING: 'Đang kiểm định', ON_SALE: 'Đang bán', DONATED: 'Đã chuyển giao',
  PICKED_UP: 'Đã nhận lại', PENDING_DECISION: 'Chờ quyết định', TAKE_BACK: 'Nhận lại',
  RE_CONSIGN: 'Ký gửi lại', WAITING_CONFIRMATION: 'Chờ xác nhận',
  FULL_COMPENSATION: 'Đền bù toàn bộ', PARTIAL_WITH_ITEM_BACK: 'Đền bù và nhận lại hàng',
};
function detailLink(row) {
  const id = encodeURIComponent(row.targetId);
  if (row.targetType === 'ORDER') return `/moderator/packing?orderId=${id}`;
  if (row.targetType === 'CONSIGNMENT_FORM') return `/moderator/consignments/${id}`;
  if (row.targetType === 'PRODUCT') return `/moderator/inventory/${id}`;
  return null;
}

export function WarehouseHistoryTabs({ type, children }) {
  const [search, setSearch] = useSearchParams();
  const history = search.get('view') === 'history';
  const page = Math.max(0, Number(search.get('historyPage')) || 0);
  const resource = useResource(options => warehouseHistoryService.list(type, { page, size: 20 }, options),
    [type, page], { enabled: history });
  const rows = resource.data?.content ?? listItems(resource.data);
  const update = (key, value) => setSearch(previous => {
    const next = new URLSearchParams(previous);
    value === null ? next.delete(key) : next.set(key, String(value));
    return next;
  });
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Công việc và lịch sử" className="flex flex-wrap gap-2">
        <Button role="tab" aria-selected={!history} variant={history ? 'outline' : 'primary'} onClick={() => update('view', null)}>Công việc</Button>
        <Button role="tab" aria-selected={history} variant={history ? 'primary' : 'outline'} onClick={() => update('view', 'history')}>Lịch sử</Button>
      </div>
      {history ? <section aria-label="Lịch sử thao tác kho" className="space-y-4">
        <div className="flex justify-end"><Button variant="outline" onClick={resource.refresh}>Tải lại lịch sử</Button></div>
        <ResourceState resource={resource} />
        {!resource.loading && !resource.error && <div className="overflow-x-auto rounded-xl border border-neutral bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-background"><tr>
              {['Thời gian', 'Đối tượng', 'Thao tác', 'Người thực hiện', 'Kết quả'].map(label => <th key={label} className="p-3">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-neutral">{rows.length ? rows.map(row => {
              const href = detailLink(row);
              return <tr key={row.id}>
                <td className="p-3">{warehouseDateTime(row.createdAt)}</td>
                <td className="p-3 break-words">{href ? <Link className="text-primary underline" to={href}>{row.targetLabel || row.targetId}</Link> : row.targetLabel || row.targetId}</td>
                <td className="p-3">{actions[row.actionType] || row.actionType}</td>
                <td className="p-3">{row.actorName || 'Chưa có thông tin'}</td>
                <td className="p-3">{results[row.result] || row.result || 'Thành công'}</td>
              </tr>;
            }) : <tr><td className="p-8 text-center text-textSecondary" colSpan={5}>Chưa có lịch sử thao tác.</td></tr>}</tbody>
          </table>
        </div>}
        {!!resource.data && <Pager page={page} totalPages={resource.data.totalPages || 1} onChange={value => update('historyPage', value)} />}
      </section> : children}
    </div>
  );
}
