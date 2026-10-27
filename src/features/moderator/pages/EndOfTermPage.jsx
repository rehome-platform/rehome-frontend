import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import { endTermService } from '../services/warehouseApi.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { usePhase2, useResource } from '../hooks/warehouseHooks.jsx';
import {
  listItems,
  validMoney,
  validatePartnerName,
  canTransferUnclaimed,
  normalizeUnclaimedItem,
  filterUnclaimedItems,
} from '../models/warehouseModel.js';
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

const CHARITY_PARTNER_SUGGESTIONS = [
  'Quỹ Tình Thương TP.HCM',
  'Hội Chữ Thập Đỏ Quận 7',
  'Quỹ Trẻ Em Khuyết Tật',
  'Mái Ấm Hy Vọng',
];

function EndTermDetail({ sku, onClose, onChanged }) {
  const { identity, scope } = usePhase2();
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resource = useResource((options) => endTermService.read(sku, options), [sku]);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../fixtures/warehouseFixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );

  const [price, setPrice] = useState('');
  const [term, setTerm] = useState('');
  const [partner, setPartner] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const rawData = resource.data;
  const data = useMemo(() => (rawData ? normalizeUnclaimedItem(rawData) : null), [rawData]);

  const identified = isFixtureMode
    ? !!identity && identity.memberId === data?.memberId
    : operationReady('handover') && !!handoverPayload(data, identity, scope, now);

  const success = (result) => {
    if (result?.receiptId) setReceiptId(result.receiptId);
    if (confirm === 'TRANSFER') {
      setFeedback({
        type: 'success',
        message: `Đã chuyển giao thành công sản phẩm SKU ${sku} cho tổ chức "${partner.trim()}". Trạng thái sản phẩm đổi sang ĐÃ CHUYỂN GIAO (DONATED).`,
      });
    }
    setConfirm(null);
    onChanged();
    window.dispatchEvent(new Event('warehouse:changed'));
  };

  const partnerValidation = useMemo(() => validatePartnerName(partner), [partner]);

  const run = () => {
    if (!data) return;
    if (confirm === 'HANDOVER' && !identified) return;
    if (confirm === 'TRANSFER' && !partnerValidation.valid) return;

    const action =
      confirm === 'HANDOVER'
        ? (options) =>
            isFixtureMode
              ? endTermService.handover(sku, { identityToken: identity.identityToken }, options)
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

  const isDonated = data?.status === 'DONATED';
  const showTransfer = canTransferUnclaimed(data) && !isDonated;

  return (
    <Card>
      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-neutral pb-3">
        <h2 className="text-lg font-bold text-text">
          Xử lý chi tiết: <span className="font-mono text-primary">{sku}</span>
        </h2>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Đóng chi tiết
          </Button>
        )}
      </div>

      <ResourceState resource={resource} />

      {feedback && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 flex justify-between items-center"
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className="text-emerald-700 hover:text-emerald-900 font-semibold ml-3"
            onClick={() => setFeedback(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {data.member && <MemberSummary member={data.member} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-background p-4 rounded-xl border border-neutral">
            <div>
              <p className="text-xs text-textSecondary uppercase font-medium">Tên sản phẩm</p>
              <p className="font-semibold text-text">{data.name}</p>
            </div>
            <div>
              <p className="text-xs text-textSecondary uppercase font-medium">Vị trí kệ</p>
              <p className="font-semibold text-text">{data.shelfLocation}</p>
            </div>
            <div>
              <p className="text-xs text-textSecondary uppercase font-medium">Trạng thái kho</p>
              <div className="mt-1">
                <Status>{data.status}</Status>
              </div>
            </div>
            <div>
              <p className="text-xs text-textSecondary uppercase font-medium">Giá thỏa thuận / Niêm yết</p>
              <p className="font-semibold text-text">{money(data.agreedPrice || data.currentPrice)}</p>
            </div>
            {data.deadline && (
              <div>
                <p className="text-xs text-textSecondary uppercase font-medium">Hạn xử lý</p>
                <p className="text-sm text-text">{date(data.deadline)}</p>
              </div>
            )}
            {data.decision && (
              <div>
                <p className="text-xs text-textSecondary uppercase font-medium">Quyết định ban đầu</p>
                <p className="text-sm text-text">{data.decision}</p>
              </div>
            )}
          </div>

          {/* Trường hợp sản phẩm đã chuyển giao từ thiện */}
          {isDonated && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800 text-sm">
              <p className="font-semibold">Sản phẩm đã được chuyển giao từ thiện (DONATED)</p>
              <p className="mt-1 text-xs text-blue-700">
                Sản phẩm này đã hoàn tất thủ tục bàn giao tổ chức đối tác và ghi nhận vào Audit Log. Không còn thao tác khả dụng.
              </p>
            </div>
          )}

          {/* Form chuyển giao cho tổ chức từ thiện (API 36) */}
          {showTransfer && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h3 className="font-semibold text-amber-900">Chuyển giao cho tổ chức từ thiện (API 36)</h3>
              <p className="text-xs text-textSecondary">
                Sản phẩm vô thừa nhận quá hạn 30 ngày. Vui lòng nhập tên đối tác từ thiện tiếp nhận để chuyển trạng thái sang <span className="font-semibold text-text">DONATED</span>.
              </p>

              <Field
                label="Tên tổ chức đối tác nhận chuyển giao"
                value={partner}
                placeholder="VD: Quỹ Tình Thương TP.HCM, Mái Ấm Hy Vọng..."
                onChange={(event) => setPartner(event.target.value)}
                error={partner && !partnerValidation.valid ? partnerValidation.message : resource.error?.fields?.partnerOrganizationName}
              />

              {/* Gợi ý tên đối tác phổ biến */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-textSecondary">Gợi ý nhanh:</span>
                {CHARITY_PARTNER_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="text-xs bg-white hover:bg-neutral px-2.5 py-1 rounded-lg border border-neutral transition-colors text-text"
                    onClick={() => setPartner(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  variant="danger"
                  disabled={!partnerValidation.valid}
                  onClick={() => setConfirm('TRANSFER')}
                >
                  Chuyển giao hàng vô thừa nhận
                </Button>
              </div>
            </div>
          )}

          {/* Bàn giao nhận lại cuối kỳ */}
          {data.allowedActions?.includes('HANDOVER') && !isDonated && (
            <div className="space-y-3 rounded-xl border border-neutral p-4 bg-background">
              <h3 className="font-semibold text-text">Bàn giao nhận lại cuối kỳ tại quầy (API 72)</h3>
              {!identified && (
                <div className="text-sm">
                  <p className="text-textSecondary">
                    Yêu cầu kiểm tra danh tính Member trước khi bàn giao sản phẩm:
                  </p>
                  <Link className="text-primary font-medium underline inline-block mt-1" to="/moderator/counter">
                    Chuyển sang Quầy tiếp nhận để xác nhận CCCD/SĐT
                  </Link>
                </div>
              )}
              <Button disabled={!identified} onClick={() => setConfirm('HANDOVER')}>
                Bàn giao nhận lại cuối kỳ
              </Button>
            </div>
          )}

          {/* Tái ký gửi tại quầy */}
          {data.allowedActions?.includes('RE_CONSIGN') && !isDonated && (
            <div className="space-y-3 rounded-xl border border-neutral p-4 bg-background">
              <h3 className="font-semibold text-text">Chốt tái ký gửi lại</h3>
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
                  className="rounded-xl border-neutral w-full p-2"
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

          {(data.newReceiptId || receiptId) && (
            <ReceiptPanel receiptId={data.newReceiptId || receiptId} />
          )}

          {!showTransfer &&
            !data.allowedActions?.includes('HANDOVER') &&
            !data.allowedActions?.includes('RE_CONSIGN') &&
            !isDonated &&
            !data.newReceiptId &&
            !receiptId && (
              <p className="text-textSecondary text-sm">Không có thao tác khả dụng ở trạng thái hiện tại.</p>
            )}
        </div>
      )}

      {/* Modal xác nhận */}
      <Modal
        isOpen={!!confirm}
        onClose={() => {
          if (!resource.busy) setConfirm(null);
        }}
        title={
          confirm === 'TRANSFER'
            ? 'Xác nhận chuyển giao từ thiện'
            : confirm === 'HANDOVER'
              ? 'Xác nhận bàn giao tại quầy'
              : 'Xác nhận ký gửi lại'
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text leading-relaxed">
            {confirm === 'HANDOVER'
              ? `Xác nhận đã bàn giao đúng sản phẩm ${sku} cho Member đã đối chiếu danh tính?`
              : confirm === 'RE_CONSIGN'
                ? `Tạo biên nhận mới cho SKU ${sku} với giá ${money(Number(price))}?`
                : `Xác nhận chuyển giao sản phẩm SKU ${sku} (${data?.name}) cho tổ chức từ thiện "${partner.trim()}"? Thao tác này sẽ đổi trạng thái sản phẩm sang ĐÃ CHUYỂN GIAO (DONATED) và lưu vào Audit Log.`}
          </p>
          <ResourceState resource={resource} />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={resource.busy}
              onClick={() => setConfirm(null)}
            >
              Hủy
            </Button>
            <Button
              loading={resource.busy}
              variant={confirm === 'TRANSFER' ? 'danger' : 'primary'}
              onClick={run}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

export default function EndOfTermPage() {
  const [search, setSearch] = useSearchParams();
  const page = Math.max(0, Number(search.get('page')) || 0);
  const sku = search.get('sku');
  const [keyword, setKeyword] = useState('');

  const list = useResource((options) => endTermService.list({ page }, options), [page]);
  const rawItems = listItems(list.data);
  const normalizedItems = useMemo(
    () => rawItems.map(normalizeUnclaimedItem).filter(Boolean),
    [rawItems],
  );

  const filteredItems = useMemo(
    () => filterUnclaimedItems(normalizedItems, keyword),
    [normalizedItems, keyword],
  );

  const change = (key, value) =>
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      if (value == null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      return next;
    });

  return (
    <Page
      apiColors={false}
      title="Xử lý hàng cuối kỳ & Vô thừa nhận"
      subtitle="Quản lý sản phẩm quá hạn nhận lại, xác nhận chuyển giao từ thiện cho đối tác và hỗ trợ bàn giao tại quầy."
      actions={
        <div className="flex gap-2">
          <Link to="/moderator/counter">
            <Button variant="outline">Quầy tiếp nhận</Button>
          </Link>
          <Button variant="outline" onClick={list.refresh}>
            Tải lại
          </Button>
        </div>
      }
    >
      {/* Banner hướng dẫn nghiệp vụ */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-2">
        <h3 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
          <span>💡</span> Hướng dẫn quy trình xử lý cuối kỳ & vô thừa nhận
        </h3>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <span className="font-medium">Chuyển giao từ thiện (API 36):</span> Dành cho sản phẩm vô thừa nhận (<span className="font-mono">UNCLAIMED</span>) quá hạn 30 ngày. Moderator nhập tên tổ chức từ thiện để đổi trạng thái sang <span className="font-semibold">DONATED</span>.
          </li>
          <li>
            <span className="font-medium">Khách đến quầy nhận lại hàng cuối kỳ (API 72):</span> Khách hàng cần đối chiếu danh tính trực tiếp tại <Link to="/moderator/counter" className="underline font-semibold text-primary">Quầy tiếp nhận</Link> trước khi Moderator thực hiện bàn giao.
          </li>
        </ul>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral">
        <div className="flex-1 min-w-[280px]">
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã SKU, tên sản phẩm hoặc vị trí kệ..."
            className="w-full rounded-xl border border-neutral px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="text-xs text-textSecondary">
          Tổng số: <span className="font-semibold text-text">{filteredItems.length}</span> món chờ xử lý
        </div>
      </div>

      <ResourceState resource={list} empty={!filteredItems.length} />

      {/* Danh sách sản phẩm */}
      {filteredItems.length > 0 && (
        <Card>
          <div className="divide-y divide-neutral">
            {filteredItems.map((item) => (
              <div
                key={item.sku}
                className={`flex flex-wrap justify-between items-center gap-3 py-3.5 transition-colors ${
                  sku === item.sku ? 'bg-primary/5 rounded-xl px-3' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-text">{item.sku}</span>
                    <span className="text-textSecondary">·</span>
                    <span className="font-semibold text-text">{item.name}</span>
                    <Status>{item.status}</Status>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-textSecondary flex-wrap">
                    <span>
                      Vị trí kệ: <span className="font-medium text-text">{item.shelfLocation}</span>
                    </span>
                    {item.deadline && (
                      <span>
                        Hạn: <span className="font-medium text-text">{date(item.deadline)}</span>
                      </span>
                    )}
                    {item.status === 'UNCLAIMED' && (
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Quá hạn 30 ngày
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant={sku === item.sku ? 'primary' : 'outline'}
                  onClick={() => change('sku', item.sku)}
                >
                  {sku === item.sku ? 'Đang mở' : 'Mở xử lý'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Phân trang */}
      {!!list.data && (
        <Pager
          page={page}
          totalPages={list.data.totalPages}
          onChange={(value) => change('page', value)}
        />
      )}

      {/* Khối xử lý chi tiết sản phẩm */}
      {sku && (
        <div id="end-term-detail-section" className="scroll-mt-4">
          <EndTermDetail
            key={sku}
            sku={sku}
            onClose={() => change('sku', null)}
            onChanged={list.refresh}
          />
        </div>
      )}
    </Page>
  );
}
