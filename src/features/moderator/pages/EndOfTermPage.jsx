import { EndTermInventoryRow } from '../components/endTerm/EndTermInventoryRow.jsx';
import { useEndTermDetail } from '../hooks/useEndTermDetail.jsx';

import {
  EndTermConfirmDialog,
  EndTermReconsignPanel,
  EndTermTransferPanel,
  EndTermProductSummary,
} from '../components/endTerm/EndTermSections.jsx';
import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';

import { endTermService } from '../services/warehouseApi.js';

import { useResource } from "../hooks/warehouseHooks.jsx";
import {
  listItems,
  normalizeUnclaimedItem,
  filterUnclaimedItems,
  hasNoEndTermActions,
} from "../models/warehouseModel.js";
import { Page, Card, ResourceState, MemberSummary, Pager, date, money } from "../components/WarehouseUi.jsx";
import ReceiptPanel from '../components/ReceiptPanel.jsx';
import {
  RECONSIGN_STATUS,
  RECONSIGN_STATUS_META,
  counterResponseTimestamp,
  isCounterResponseOverdue,
  normalizeReConsignStatus,
  sortPendingPricingRows,
} from '../models/reConsignModel.js';

function EndTermDetail({ sku, onClose, onChanged }) {
  const model = useEndTermDetail({ sku, onClose, onChanged });
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

      <ResourceState resource={model.resource} />

      {model.feedback && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 flex justify-between items-center"
        >
          <span>{model.feedback.message}</span>
          <button
            type="button"
            className="text-emerald-700 hover:text-emerald-900 font-semibold ml-3"
            onClick={() => model.setFeedback(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {model.data && (
        <div className="space-y-4">
          {model.data.member && <MemberSummary member={model.data.member} />}

          <EndTermProductSummary data={model.data} />

          {/* Trường hợp sản phẩm đã chuyển giao từ thiện */}
          {model.isDonated && (
            <div className="rounded-xl border border-neutral bg-background p-4 text-text text-sm">
              <p className="font-semibold">Sản phẩm đã được chuyển giao từ thiện (DONATED)</p>
              <p className="mt-1 text-xs text-textSecondary">
                Sản phẩm này đã hoàn tất thủ tục bàn giao tổ chức đối tác và ghi nhận vào Audit Log. Không còn thao tác khả dụng.
              </p>
            </div>
          )}

          {/* Form chuyển giao cho tổ chức từ thiện (API 36) */}
          {model.showTransfer && (
            <EndTermTransferPanel {...model.sections.EndTermTransferPanel} />
          )}

          {/* Bàn giao nhận lại cuối kỳ */}
          {model.data.allowedActions?.includes('HANDOVER') && !model.isDonated && (
            <div className="space-y-3 rounded-xl border border-neutral p-4 bg-background">
              <h3 className="font-semibold text-text">Bàn giao nhận lại cuối kỳ tại quầy (API 72)</h3>
              {!model.identified && (
                <div className="text-sm">
                  <p className="text-textSecondary">
                    Yêu cầu kiểm tra danh tính Member trước khi bàn giao sản phẩm:
                  </p>
                  <Link
                    className="text-primary font-medium underline inline-block mt-1"
                    to={
                      model.data.member?.memberCode
                        ? `/moderator/counter?memberCode=${encodeURIComponent(model.data.member.memberCode)}&refId=${encodeURIComponent(sku)}`
                        : '/moderator/counter'
                    }
                  >
                    Chuyển sang Quầy tiếp nhận để xác nhận CCCD/SĐT
                  </Link>
                </div>
              )}
              <Button disabled={!model.identified} onClick={() => model.setConfirm('HANDOVER')}>
                Bàn giao nhận lại cuối kỳ
              </Button>
            </div>
          )}

          {/* Tái ký gửi tại quầy */}
          {model.data.allowedActions?.includes('RE_CONSIGN') && !model.isDonated && (
            <EndTermReconsignPanel {...model.sections.EndTermReconsignPanel} />
          )}

          {(model.data.newReceiptId || model.receiptId) && (
            <ReceiptPanel receiptId={model.data.newReceiptId || model.receiptId} />
          )}

          {hasNoEndTermActions(model.data, { showTransfer: model.showTransfer, isDonated: model.isDonated, receiptId: model.receiptId }) && (
              <p className="text-textSecondary text-sm">Không có thao tác khả dụng ở trạng thái hiện tại.</p>
            )}
        </div>
      )}

      {/* Modal xác nhận */}
      <EndTermConfirmDialog
        confirm={model.confirm}
        resource={model.resource}
        setConfirm={model.setConfirm}
        sku={sku}
        price={model.price}
        data={model.data}
        partner={model.partner}
        run={model.run}
      />
    </Card>
  );
}

export default function EndOfTermPage() {
  const [search, setSearch] = useSearchParams();
  const page = Math.max(0, Number(search.get('page')) || 0);
  const sku = search.get('sku');
  const [keyword, setKeyword] = useState('');

  const list = useResource((options) => endTermService.list({ page }, options), [page], {
    cacheKey: `end-of-term:list:${page}`,
  });
  const pendingPricing = useResource((options) => endTermService.pendingPricing(options), [], {
    cacheKey: 'end-of-term:pending-pricing',
  });
  const sortedPendingPricing = useMemo(
    () => sortPendingPricingRows(Array.isArray(pendingPricing.data) ? pendingPricing.data : []),
    [pendingPricing.data],
  );
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
      apiColors={true}
      title="Xử lý hàng cuối kỳ & Vô thừa nhận"
      subtitle="Quản lý sản phẩm quá hạn nhận lại, xác nhận chuyển giao từ thiện cho đối tác và hỗ trợ bàn giao tại quầy."
      actions={
        <div className="flex gap-2">
          <Link to="/moderator/counter">
            <Button variant="outline">Quầy tiếp nhận</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              list.refresh();
              pendingPricing.refresh();
            }}
            className="gap-1.5 whitespace-nowrap"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Tải lại</span>
          </Button>
        </div>
      }
    >
      {/* Banner hướng dẫn nghiệp vụ */}
      <div className="rounded-2xl border border-neutral bg-surface p-4 space-y-2 shadow-sm">
        <h3 className="font-semibold text-text text-sm flex items-center gap-2">
          Hướng dẫn quy trình xử lý cuối kỳ & vô thừa nhận
        </h3>
        <ul className="text-xs text-textSecondary space-y-1 list-disc list-inside">
          <li>
            <span className="font-medium">Chuyển giao từ thiện (API 36):</span> Dành cho sản phẩm đã ở trạng thái vô thừa nhận (<span className="font-mono">UNCLAIMED</span>) sau khi quá hạn xử lý. Moderator nhập tên tổ chức từ thiện để đổi trạng thái sang <span className="font-semibold">DONATED</span>.
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
            placeholder="Tìm theo Mã hàng hóa hoặc tên sản phẩm..."
            className="w-full rounded-xl border border-neutral px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="text-xs text-textSecondary">
          Tổng số: <span className="font-semibold text-text">{filteredItems.length}</span> món chờ xử lý
        </div>
      </div>

      <ResourceState resource={list} empty={!filteredItems.length} />

      {/* Danh sách ký gửi lại – chờ chốt giá mới (GET /end-of-term-decisions/pending-pricing) */}
      {sortedPendingPricing.length > 0 && (
        <Card
          title="Danh sách ký gửi lại – chờ chốt giá mới"
          actions={
            <span className="text-xs font-semibold text-textSecondary">
              {sortedPendingPricing.length} yêu cầu
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral bg-background text-textSecondary font-semibold whitespace-nowrap">
                  <th className="py-2.5 px-3">Sản phẩm</th>
                  <th className="py-2.5 px-3 text-right">Giá hiện tại / Giá cũ</th>
                  <th className="py-2.5 px-3">Trạng thái</th>
                  <th className="py-2.5 px-3">Cập nhật</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral">
                {sortedPendingPricing.map((row) => {
                  const status = normalizeReConsignStatus(row.reConsignStatus, { hasDecision: Boolean(row.decisionId) });
                  const meta = RECONSIGN_STATUS_META[status] || RECONSIGN_STATUS_META.AWAITING_PRICE;
                  const overdue = isCounterResponseOverdue(row);
                  const ts = status === RECONSIGN_STATUS.COUNTER_OFFERED ? counterResponseTimestamp(row) : row.decidedAt;
                  return (
                    <tr
                      key={row.decisionId || row.productId}
                      className={overdue ? 'border-l-4 border-l-[#B42318] bg-[#FEF3F2]/60' : 'hover:bg-[#F6F9F4]/60'}
                    >
                      <td className="py-3 px-3">
                        <p className="font-bold text-text">{row.productName || '—'}</p>
                        <p className="font-mono text-[11px] text-textSecondary">{row.productId}</p>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <p className="font-bold text-text">{row.currentPrice != null ? money(row.currentPrice) : '—'}</p>
                        {row.previousAgreedPrice != null && (
                          <p className="text-[11px] text-textSecondary">
                            Giá cũ: {money(row.previousAgreedPrice)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}>
                            {meta.label}
                          </span>
                          {status === RECONSIGN_STATUS.COUNTER_OFFERED && row.memberCounterPrice != null && (
                            <span className="text-[11px] font-semibold text-[#B42318]">
                              Member trả: {money(row.memberCounterPrice)}
                            </span>
                          )}
                          {overdue && (
                            <span className="text-[11px] font-bold text-[#B42318]">
                              Quá 2 ngày chưa phản hồi
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-textSecondary">
                        {ts ? date(ts) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Link
                          to={`/moderator/inventory/${encodeURIComponent(row.productId)}/re-consign`}
                          className="inline-flex items-center justify-center rounded-xl bg-[#006B2C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005523]"
                        >
                          {status === RECONSIGN_STATUS.COUNTER_OFFERED
                            ? 'Phản hồi trả giá →'
                            : status === RECONSIGN_STATUS.AWAITING_PRICE
                              ? 'Chốt giá mới →'
                              : 'Theo dõi →'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Danh sách sản phẩm */}
      {filteredItems.length > 0 && (
        <Card>
          <div className="divide-y divide-neutral">
            {filteredItems.map((item) => (
              <EndTermInventoryRow key={item.sku} item={item} sku={sku} change={change} />
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
