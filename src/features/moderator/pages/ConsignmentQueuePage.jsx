import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { queueService } from '../services/warehouseApi.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, ownsClaim } from '../models/warehouseModel.js';
import { Page, Card, Status, Field, Pager, ResourceState, DetailLink } from '../components/WarehouseUi.jsx';

export default function ConsignmentQueuePage() {
  const { scope } = usePhase2();
  const [search, setSearch] = useSearchParams();
  const type = search.get('type') || 'FORM_REVIEW',
    claim = search.get('claim') || '',
    page = Math.max(0, Number(search.get('page')) || 0);
  const resource = useResource(
    (options) => queueService.list({ type, claim, page }, options),
    [type, claim, page],
  );
  const items = listItems(resource.data);
  const change = (key, value) =>
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      next.set(key, value);
      if (key !== 'page') next.set('page', '0');
      return next;
    });
  return (
    <Page
      title="Hàng đợi ký gửi"
      subtitle="Nhận việc theo kho trước khi duyệt hoặc kiểm định."
      actions={
        <Button variant="outline" onClick={resource.refresh}>
          Tải lại
        </Button>
      }
    >
      <Card>
        <div className="flex flex-wrap gap-4">
          <Field label="Loại công việc">
            <select
              value={type}
              onChange={(event) => change('type', event.target.value)}
              className="rounded-xl border-neutral"
            >
              <option value="FORM_REVIEW">Duyệt form</option>
              <option value="INSPECTION">Kiểm định</option>
              <option value="PACKING">Đóng gói</option>
            </select>
          </Field>
          <Field label="Người xử lý">
            <select
              value={claim}
              onChange={(event) => change('claim', event.target.value)}
              className="rounded-xl border-neutral"
            >
              <option value="">Tất cả</option>
              <option value="mine">Của tôi</option>
              <option value="unclaimed">Chưa nhận</option>
            </select>
          </Field>
        </div>
      </Card>
      <ResourceState resource={resource} empty={!items.length} />
      {items.map((item) => (
        <Card key={item.queueId}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="font-semibold">{item.name || item.formId}</p>
              <p className="text-sm text-textSecondary">
                {item.queueId} ·{' '}
                {item.claimedBy
                  ? ownsClaim(item, scope.userId)
                    ? 'Bạn đang nhận'
                    : 'Người khác đang xử lý'
                  : 'Chưa nhận việc'}
              </p>
              <Status>{item.status}</Status>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {type === 'PACKING' ? <Link className="text-primary underline" to={`/moderator/packing?orderId=${encodeURIComponent(item.orderId || item.refId)}`}>Chi tiết đóng gói</Link> : <DetailLink formId={item.formId} />}
              {!item.claimedBy && (
                <Button
                  loading={resource.busy}
                  onClick={() =>
                    resource.mutate((options) => queueService.claim(item.queueId, options))
                  }
                >
                  Nhận việc
                </Button>
              )}
              {ownsClaim(item, scope.userId) && (
                <Button
                  variant="outline"
                  loading={resource.busy}
                  onClick={() =>
                    resource.mutate((options) => queueService.release(item.queueId, options))
                  }
                >
                  Nhả việc
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      {!!resource.data && (
        <Pager
          page={page}
          totalPages={resource.data.totalPages}
          onChange={(value) => change('page', String(value))}
        />
      )}
    </Page>
  );
}
