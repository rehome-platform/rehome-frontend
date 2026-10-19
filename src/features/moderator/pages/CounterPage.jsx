import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { counterService } from '../phase2/api.js';
import { usePhase2, useResource } from '../phase2/hooks.jsx';
import { listItems, lookupParams } from '../phase2/model.js';
import {
  Page,
  Card,
  Field,
  MemberSummary,
  ResourceState,
  Status,
  DetailLink,
} from '../phase2/ui.jsx';

export default function CounterPage() {
  const { identity, setIdentity } = usePhase2();
  const [kind, setKind] = useState('memberCode'),
    [query, setQuery] = useState(''),
    [submitted, setSubmitted] = useState(null);
  const [selected, setSelected] = useState(null),
    [scanner, setScanner] = useState(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const results = useResource((options) => counterService.lookup(submitted, options), [submitted], {
    enabled: !!submitted,
  });
  const tasks = useResource(
    (options) => counterService.tasks(selected.memberId, options),
    [selected?.memberId, identity?.identityToken],
    { enabled: !!selected && identity?.memberId === selected.memberId },
  );
  const reset = () => {
    selectedRef.current = null;
    setSelected(null);
    setIdentity(null);
    setSubmitted(null);
    results.clearActionError();
  };
  const lookup = (lookupKind, value) => {
    reset();
    setSubmitted(lookupParams(lookupKind, value));
  };
  const choose = (member) => {
    selectedRef.current = member;
    setIdentity(null);
    setSelected(member);
  };
  const confirmed = !!selected && identity?.memberId === selected.memberId;
  return (
    <Page
      title="Quầy tiếp nhận"
      subtitle="Chọn đúng Member và đối chiếu tên, ảnh trước khi xác nhận danh tính."
    >
      <Card title="Tra cứu Member">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            lookup(kind, query);
          }}
        >
          <Field label="Tra cứu bằng">
            <select
              className="rounded-xl border-neutral"
              value={kind}
              onChange={(event) => {
                reset();
                setKind(event.target.value);
                setQuery('');
              }}
            >
              <option value="memberCode">Mã Member</option>
              <option value="phone">Số điện thoại</option>
            </select>
          </Field>
          <Field
            label={kind === 'phone' ? 'Số điện thoại' : 'Mã Member'}
            value={query}
            required
            onChange={(event) => {
              reset();
              setQuery(event.target.value);
            }}
          />
          <Button type="submit" disabled={!query.trim()}>
            Tra cứu
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setScanner(true);
            }}
          >
            Quét QR Member
          </Button>
        </form>
      </Card>
      <ResourceState resource={results} empty={!!submitted && !listItems(results.data).length} />
      {!!results.data && (
        <Card title="Kết quả — hãy chọn đúng người">
          <div className="space-y-3">
            {listItems(results.data).map((member) => (
              <div key={member.memberId} className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <MemberSummary member={member} />
                </div>
                <Button
                  variant={selected?.memberId === member.memberId ? 'primary' : 'outline'}
                  onClick={() => choose(member)}
                >
                  Chọn Member {member.memberCode}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      {selected && (
        <Card title="Đối chiếu danh tính">
          <MemberSummary member={selected} />
          <p className="text-sm">Đối chiếu tên và ảnh với người đang có mặt tại quầy.</p>
          <Button
            loading={results.busy}
            disabled={confirmed}
            onClick={() =>
              results.mutate((options) => counterService.confirm(selected.memberId, options), {
                onSuccess: (proof) => {
                  if (proof?.memberId === selectedRef.current?.memberId) setIdentity(proof);
                },
              })
            }
          >
            {confirmed ? 'Đã xác nhận danh tính' : 'Tôi đã đối chiếu đúng Member'}
          </Button>
          {confirmed && (
            <Link className="block text-primary underline" to="/moderator/end-of-term">
              Xử lý nhận lại hàng cuối kỳ
            </Link>
          )}
        </Card>
      )}
      {confirmed && (
        <Card title="Công việc tại kho">
          <ResourceState resource={tasks} empty={!listItems(tasks.data).length} />
          {listItems(tasks.data).map((task) => (
            <div
              className="flex justify-between items-center gap-3 border-b border-neutral py-3"
              key={task.formId}
            >
              <div>
                <p>{task.name || task.formId}</p>
                <Status>{task.status}</Status>
              </div>
              <DetailLink formId={task.formId} />
            </div>
          ))}
        </Card>
      )}
      <QRScannerModal
        isOpen={scanner}
        onClose={() => setScanner(false)}
        title="Quét QR Member"
        placeholder="Mã Member hoặc nội dung QR Member"
        onScanSuccess={(value) => {
          lookup('qrPayload', value);
          setScanner(false);
        }}
      />
    </Page>
  );
}
