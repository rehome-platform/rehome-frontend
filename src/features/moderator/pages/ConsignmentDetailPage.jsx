import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { consignmentService, queueService } from '../phase2/api.js';
import { phase2Contract, isFixtureMode } from '../phase2/contract.js';
import { usePhase2, useResource } from '../phase2/hooks.jsx';
import { ownsClaim, validMoney } from '../phase2/model.js';
import {
  Page,
  Card,
  Field,
  Photos,
  MemberSummary,
  ResourceState,
  Status,
  money,
  date,
} from '../phase2/ui.jsx';
import ReceiptPanel from '../phase2/ReceiptPanel.jsx';

export default function ConsignmentDetailPage() {
  const { formId } = useParams();
  const { identity, scope } = usePhase2();
  const resource = useResource((options) => consignmentService.read(formId, options), [formId]);
  const form = resource.data;
  const [rejectReason, setRejectReason] = useState('');
  const [conditionNote, setCondition] = useState(''),
    [price, setPrice] = useState(''),
    [term, setTerm] = useState('');
  const [returnReason, setReturnReason] = useState(''),
    [returnNote, setReturnNote] = useState('');
  const [resultReceiptId, setReceiptId] = useState(null);
  const optionsResource = useResource(
    async () =>
      isFixtureMode
        ? (await import('../phase2/fixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const options = optionsResource.data || phase2Contract.options;
  const owned = ownsClaim(form, scope.userId),
    identified = !!identity && identity.memberId === form?.memberId;
  const allowed = (action) => owned && form?.allowedActions?.includes(action);
  const proof = { identityToken: identified ? identity.identityToken : null };
  const errors = resource.error?.fields || {};
  return (
    <Page
      title="Chi tiết ký gửi"
      subtitle={formId}
      actions={
        <Button
          variant="outline"
          onClick={() => {
            resource.clearActionError();
            resource.refresh();
          }}
        >
          Tải lại
        </Button>
      }
    >
      <ResourceState resource={resource} />
      {form && (
        <>
          <Card title={form.name}>
            <Status>{form.status}</Status>
            <MemberSummary member={form.member} />
            <Photos photos={form.photos} />
            <p>{form.description}</p>
            <p>Giá mong muốn: {money(form.desiredPrice)}</p>
            {form.bringDeadline && <p>Hạn mang hàng: {date(form.bringDeadline)}</p>}
            <div className="flex flex-wrap gap-3">
              {!form.claimedBy && form.queueId && (
                <Button
                  loading={resource.busy}
                  onClick={() => resource.mutate((opts) => queueService.claim(form.queueId, opts))}
                >
                  Nhận việc
                </Button>
              )}
              {owned && (
                <Button
                  variant="outline"
                  loading={resource.busy}
                  onClick={() =>
                    resource.mutate((opts) => queueService.release(form.queueId, opts))
                  }
                >
                  Nhả việc
                </Button>
              )}
              {form.claimedBy && !owned && <p>Người khác đang xử lý công việc này.</p>}
            </div>
          </Card>
          {(allowed('APPROVE') || allowed('REJECT')) && (
            <Card title="Duyệt form">
              <div className="space-y-3">
                <Button
                  disabled={!allowed('APPROVE')}
                  loading={resource.busy}
                  onClick={() => resource.mutate((opts) => queueService.approve(formId, opts))}
                >
                  Duyệt form
                </Button>
                <Field
                  label="Lý do từ chối"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  error={errors.reason}
                />
                <Button
                  variant="danger"
                  disabled={!allowed('REJECT') || !rejectReason.trim()}
                  loading={resource.busy}
                  onClick={() =>
                    resource.mutate((opts) =>
                      queueService.reject(formId, rejectReason.trim(), opts),
                    )
                  }
                >
                  Từ chối form
                </Button>
              </div>
            </Card>
          )}
          {(allowed('START_INSPECTION') ||
            allowed('COMPLETE_INSPECTION') ||
            allowed('RETURN_ONSITE')) &&
            !identified && (
              <Card>
                <Link to="/moderator/counter" className="text-primary underline">
                  Xác nhận danh tính Member tại quầy trước khi kiểm định
                </Link>
              </Card>
            )}
          {allowed('START_INSPECTION') && (
            <Card>
              <Button
                disabled={!identified}
                loading={resource.busy}
                onClick={() =>
                  resource.mutate((opts) => consignmentService.start(formId, proof, opts))
                }
              >
                Bắt đầu kiểm định
              </Button>
            </Card>
          )}
          {allowed('COMPLETE_INSPECTION') && (
            <Card title="Đạt kiểm định — chốt giá">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!validMoney(price) || !options.termLengthDays.includes(Number(term))) return;
                  resource.mutate(
                    (opts) =>
                      consignmentService.complete(
                        formId,
                        {
                          ...proof,
                          conditionNote: conditionNote.trim(),
                          agreedPrice: Number(price),
                          termLengthDays: Number(term),
                        },
                        opts,
                      ),
                    { onSuccess: (result) => setReceiptId(result?.receiptId) },
                  );
                }}
              >
                <Field
                  label="Ghi chú tình trạng"
                  required
                  value={conditionNote}
                  onChange={(event) => setCondition(event.target.value)}
                  error={errors.conditionNote}
                />
                <Field
                  label="Giá chốt (VND, số nguyên)"
                  required
                  inputMode="numeric"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  error={
                    errors.agreedPrice ||
                    (price && !validMoney(price) ? 'Nhập số nguyên dương hợp lệ.' : null)
                  }
                />
                <Field label="Độ dài kỳ">
                  <select
                    required
                    className="rounded-xl border-neutral"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                  >
                    <option value="">Chọn kỳ theo cấu hình</option>
                    {options.termLengthDays.map((days) => (
                      <option key={days} value={days}>
                        {days} ngày
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  type="submit"
                  disabled={!identified || !conditionNote.trim() || !validMoney(price) || !term}
                  loading={resource.busy}
                >
                  Hoàn tất PASS · tạo biên nhận
                </Button>
              </form>
            </Card>
          )}
          {allowed('RETURN_ONSITE') && (
            <Card title="Không tiếp nhận — trả tại chỗ">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  resource.mutate((opts) =>
                    consignmentService.returnOnsite(
                      formId,
                      { ...proof, reason: returnReason, note: returnNote.trim() },
                      opts,
                    ),
                  );
                }}
              >
                <Field label="Kết luận">
                  <select
                    required
                    className="rounded-xl border-neutral"
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                  >
                    <option value="">Chọn lý do theo contract</option>
                    {options.inspectionReturnReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Ghi chú trả tại chỗ"
                  required
                  value={returnNote}
                  onChange={(event) => setReturnNote(event.target.value)}
                  error={errors.note}
                />
                <Button
                  variant="danger"
                  type="submit"
                  disabled={!identified || !returnReason || !returnNote.trim()}
                  loading={resource.busy}
                >
                  Xác nhận trả tại chỗ
                </Button>
              </form>
            </Card>
          )}
          {(form.receiptId || resultReceiptId) && (
            <ReceiptPanel
              receiptId={form.receiptId || resultReceiptId}
              allowStockIn
              onStocked={resource.refresh}
            />
          )}
        </>
      )}
    </Page>
  );
}
