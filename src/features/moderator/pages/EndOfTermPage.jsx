import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { endTermService } from '../phase2/api.js';
import { phase2Contract, isFixtureMode } from '../phase2/contract.js';
import { usePhase2, useResource } from '../phase2/hooks.jsx';
import { listItems, validMoney } from '../phase2/model.js';
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
} from '../phase2/ui.jsx';
import ReceiptPanel from '../phase2/ReceiptPanel.jsx';

function canRunEndTerm(data, action, identified) {
  return !!data && data.allowedActions?.includes(action) && (action !== 'HANDOVER' || identified);
}

function endTermAction(action, context) {
  const { sku, identity, price, term, partner } = context;
  if (action === 'HANDOVER')
    return (options) =>
      endTermService.handover(sku, { identityToken: identity.identityToken }, options);
  if (action === 'RE_CONSIGN')
    return (options) => endTermService.reconsign(
      sku, { agreedPrice: Number(price), termLengthDays: Number(term) }, options,
    );
  return (options) => endTermService.transfer(sku, partner.trim(), options);
}

function HandoverAction({ identified, setConfirm }) {
  return (
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
  );
}

function ReconsignmentFields({ editor, enums, resource, setConfirm }) {
  const { price, setPrice, term, setTerm } = editor;
  const termLengths = enums.data?.termLengthDays || [];
  return (
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
          {termLengths.map((days) => (
            <option key={days} value={days}>
              {days} ngày
            </option>
          ))}
        </select>
      </Field>
      <Button
        disabled={!validMoney(price) || !termLengths.includes(Number(term))}
        onClick={() => setConfirm('RE_CONSIGN')}
      >
        Chốt giá ký gửi lại
      </Button>
    </div>
  );
}

function TransferFields({ editor, resource, setConfirm }) {
  const { partner, setPartner } = editor;
  return (
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
  );
}

function EndTermReceipt({ data, receiptId }) {
  return (
    <>
      {(data.newReceiptId || receiptId) && (
        <ReceiptPanel receiptId={data.newReceiptId || receiptId} />
      )}
      {!data.allowedActions?.length && !data.newReceiptId && !receiptId && (
        <p>Không có thao tác khả dụng ở trạng thái hiện tại.</p>
      )}
    </>
  );
}

function EndTermContent({ data, workflow, editor }) {
  const { identified, enums, resource, setConfirm, receiptId } = workflow;
  const { price, setPrice, term, setTerm, partner, setPartner } = editor;
  const allows = (action) => data.allowedActions?.includes(action);
  return (
    <div className="space-y-4">
      <MemberSummary member={data.member} />
      <p>
        {data.name} · {money(data.agreedPrice)}
      </p>
      <Status>{data.status}</Status>
      <p>Quyết định Member: {data.decision || 'Chưa có'}</p>
      <p>Hạn xử lý: {date(data.deadline)}</p>
      {allows('HANDOVER') && (
        <HandoverAction identified={identified} setConfirm={setConfirm} />
      )}
      {allows('RE_CONSIGN') && (
        <ReconsignmentFields
          editor={{ price, setPrice, term, setTerm }}
          enums={enums}
          resource={resource}
          setConfirm={setConfirm}
        />
      )}
      {allows('TRANSFER') && (
        <TransferFields
          editor={{ partner, setPartner }}
          resource={resource}
          setConfirm={setConfirm}
        />
      )}
      <EndTermReceipt data={data} receiptId={receiptId} />
    </div>
  );
}

function EndTermConfirmation({ resource, confirmation, onClose, onConfirm }) {
  const { confirm, sku, price, partner } = confirmation;
  return (
    <Modal isOpen={!!confirm} onClose={onClose} title="Xác nhận thao tác cuối kỳ">
      <div className="space-y-4">
        <p>
          {confirm === 'HANDOVER'
            ? 'Xác nhận đã bàn giao đúng sản phẩm cho Member đã đối chiếu?'
            : confirm === 'RE_CONSIGN'
              ? `Tạo biên nhận mới cho SKU ${sku} với giá ${money(Number(price))}?`
              : `Chuyển giao SKU ${sku} cho ${partner}?`}
        </p>
        <ResourceState resource={resource} />
        <Button loading={resource.busy} onClick={onConfirm}>
          Xác nhận
        </Button>
      </div>
    </Modal>
  );
}

function EndTermDetail({ sku, onChanged }) {
  const { identity } = usePhase2();
  const resource = useResource((options) => endTermService.read(sku, options), [sku]);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../phase2/fixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const [price, setPrice] = useState(''),
    [term, setTerm] = useState(''),
    [partner, setPartner] = useState(''),
    [confirm, setConfirm] = useState(null),
    [receiptId, setReceiptId] = useState(null);
  const data = resource.data;
  const identified = !!identity && identity.memberId === data?.memberId;
  const success = (result) => {
    if (result?.receiptId) setReceiptId(result.receiptId);
    setConfirm(null);
    onChanged();
  };
  const run = () => {
    if (!canRunEndTerm(data, confirm, identified)) return;
    const action = endTermAction(confirm, { sku, identity, price, term, partner });
    resource.mutate(action, { onSuccess: success });
  };
  return (
    <Card title={`Xử lý ${sku}`}>
      <ResourceState resource={resource} />
      {data && (
        <EndTermContent
          data={data}
          workflow={{ identified, enums, resource, setConfirm, receiptId }}
          editor={{ price, setPrice, term, setTerm, partner, setPartner }}
        />
      )}
      <EndTermConfirmation
        resource={resource}
        confirmation={{ confirm, sku, price, partner }}
        onClose={() => {
          if (!resource.busy) setConfirm(null);
        }}
        onConfirm={run}
      />
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
