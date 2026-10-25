import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { endTermService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import { listItems, validMoney } from '../models/warehouseModel.js';
import {
  Page,
  Card,
  Field,
  Status,
  ResourceState,
  MemberSummary,
  Pager,
  date,
  money,
} from '../components/WarehouseUi.jsx';
import ReceiptPanel from '../components/ReceiptPanel.jsx';
import { packingService } from '../services/packingApi.js';
import { handoverPayload } from '../models/packingModel.js';
import { operationReady } from '../config/packingContract.js';

function EndTermDetail({ sku, onChanged }) {
  const { identity, scope } = usePhase2();
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const resource = useResource((options) => endTermService.read(sku, options), [sku]);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const [price, setPrice] = useState(''),
    [term, setTerm] = useState(''),
    [partner, setPartner] = useState(''),
    [confirm, setConfirm] = useState(null),
    [receiptId, setReceiptId] = useState(null);
  const data = resource.data;
  const identified = isFixtureMode ? !!identity && identity.memberId === data?.memberId
    : operationReady('handover') && !!handoverPayload(data, identity, scope, now);
  const success = (result) => {
    if (result?.receiptId) setReceiptId(result.receiptId);
    setConfirm(null);
    onChanged();
    window.dispatchEvent(new Event('warehouse:changed'));
  };
  const run = () => {
    if (!data || !data.allowedActions?.includes(confirm) || (confirm === 'HANDOVER' && !identified))
      return;
    const action =
      confirm === 'HANDOVER'
        ? (options) =>
            isFixtureMode ? endTermService.handover(sku, { identityToken: identity.identityToken }, options)
              : packingService.handover(data, identity, options)
        : confirm === 'RE_CONSIGN'
          ? (options) =>
              endTermService.reconsign(
                sku,
                { agreedPrice: Number(price), termLengthDays: Number(term) },
                options,
              )
          : (options) => endTermService.transfer(sku, partner.trim(), options);
    resource.mutate(action, { onSuccess: success });
  };
  return (
    <Card title={`Xử lý ${sku}`}>
      <ResourceState resource={resource} />
      {data && (
        <div className="space-y-4">
          <MemberSummary member={data.member} />
          <p>
            {data.name} · {money(data.agreedPrice)}
          </p>
          <Status>{data.status}</Status>
          <p>Quyết định Member: {data.decision || 'Chưa có'}</p>
          <p>Hạn xử lý: {date(data.deadline)}</p>
          {data.allowedActions?.includes('HANDOVER') && (
            <div className="space-y-3">
              {!identified && (
                <Link className="text-primary underline" to="/moderator/counter">
                  Xác nhận đúng Member tại quầy trước khi bàn giao
                </Link>
              )}
              <Button disabled={!identified} onClick={() => setConfirm('HANDOVER')}>
                Bàn giao nhận lại cuối kỳ
              </Button>
            </div>
          )}
          {data.allowedActions?.includes('RE_CONSIGN') && (
            <div className="space-y-3">
              <Field
                label="Giá ký gửi lại (VND)"
                value={price}
                inputMode="numeric"
                onChange={(event) => setPrice(event.target.value)}
                error={
                  price && !validMoney(price)
                    ? 'Giá phải là số nguyên dương.'
                    : resource.error?.fields?.agreedPrice
                }
              />
              <Field label="Độ dài kỳ mới">
                <select
                  className="rounded-xl border-neutral"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                >
                  <option value="">Chọn kỳ</option>
                  {(enums.data?.termLengthDays || []).map((days) => (
                    <option key={days} value={days}>
                      {days} ngày
                    </option>
                  ))}
                </select>
              </Field>
              <Button
                disabled={
                  !validMoney(price) || !(enums.data?.termLengthDays || []).includes(Number(term))
                }
                onClick={() => setConfirm('RE_CONSIGN')}
              >
                Chốt giá ký gửi lại
              </Button>
            </div>
          )}
          {data.allowedActions?.includes('TRANSFER') && (
            <div className="space-y-3">
              <Field
                label="Tên tổ chức đối tác nhận chuyển giao"
                value={partner}
                onChange={(event) => setPartner(event.target.value)}
                error={resource.error?.fields?.partnerName}
              />
              <Button
                variant="danger"
                disabled={!partner.trim()}
                onClick={() => setConfirm('TRANSFER')}
              >
                Chuyển giao hàng vô thừa nhận
              </Button>
            </div>
          )}
          {(data.newReceiptId || receiptId) && (
            <ReceiptPanel receiptId={data.newReceiptId || receiptId} />
          )}
          {!data.allowedActions?.length && !data.newReceiptId && !receiptId && (
            <p>Không có thao tác khả dụng ở trạng thái hiện tại.</p>
          )}
        </div>
      )}
      <Modal
        isOpen={!!confirm}
        onClose={() => {
          if (!resource.busy) setConfirm(null);
        }}
        title="Xác nhận thao tác cuối kỳ"
      >
        <div className="space-y-4">
          <p>
            {confirm === 'HANDOVER'
              ? 'Xác nhận đã bàn giao đúng sản phẩm cho Member đã đối chiếu?'
              : confirm === 'RE_CONSIGN'
                ? `Tạo biên nhận mới cho SKU ${sku} với giá ${money(Number(price))}?`
                : `Chuyển giao SKU ${sku} cho ${partner}?`}
          </p>
          <ResourceState resource={resource} />
          <Button loading={resource.busy} onClick={run}>
            Xác nhận
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
export default function EndOfTermPage() {
  const [search, setSearch] = useSearchParams();
  const page = Math.max(0, Number(search.get('page')) || 0),
    sku = search.get('sku');
  const list = useResource((options) => endTermService.list({ page }, options), [page]);
  const items = listItems(list.data);
  const change = (key, value) =>
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      next.set(key, String(value));
      return next;
    });
  return (
    <Page
      title="Xử lý cuối kỳ"
      subtitle="Trạng thái và quyền thao tác do backend quyết định; giữ nguyên SKU khi ký gửi lại."
      actions={
        <Button variant="outline" onClick={list.refresh}>
          Tải lại
        </Button>
      }
    >
      <ResourceState resource={list} empty={!items.length} />
      <Card>
        {items.map((item) => (
          <div
            key={item.sku}
            className="flex flex-wrap justify-between items-center gap-3 border-b border-neutral py-3"
          >
            <div>
              <p className="font-semibold">
                {item.sku} · {item.name}
              </p>
              <Status>{item.status}</Status>
              <p className="text-sm">
                {item.decision} · Hạn: {date(item.deadline)}
              </p>
            </div>
            <Button variant="outline" onClick={() => change('sku', item.sku)}>
              Mở xử lý
            </Button>
          </div>
        ))}
      </Card>
      {!!list.data && (
        <Pager
          page={page}
          totalPages={list.data.totalPages}
          onChange={(value) => change('page', value)}
        />
      )}
      {sku && <EndTermDetail key={sku} sku={sku} onChanged={list.refresh} />}
    </Page>
  );
}
