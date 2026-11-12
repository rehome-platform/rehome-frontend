import React from 'react';
import Button from '../../../components/common/Button.jsx';
import { useResource } from '../hooks/warehouseHooks.jsx';
import returnService from '../services/returnApi.js';
import { ResourceState, Photos, date, formatDeadlineWithCountdown, money } from './WarehouseUi.jsx';
import { DEGRADED_DECISION_POLICY, degradedCaseLabel, partialCompensation } from '../models/degradedCaseModel.js';

const amount = value => value == null ? 'Chưa có mức đền' : money(value);

export function DegradedCaseSummary({ item, onNavigateToCounter }) {
  const decision = item.decision;
  const rate = item.degradedCompensationRate;
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-neutral bg-background p-4 space-y-2">
        <h3 className="font-bold">{degradedCaseLabel(item)}</h3>
        <p>{item.productName || 'Sản phẩm ký gửi'} · {item.productId}</p>
        <p>Mã biên bản: {item.id}</p>
        <p>Ngày lập: {date(item.receivedAt)}</p>
        {item.decisionDeadline && <p>Hạn chọn phương án: {formatDeadlineWithCountdown(item.decisionDeadline)}</p>}
        {!decision && <p>{DEGRADED_DECISION_POLICY}</p>}
        {decision === 'UNCLAIMED' && <p>Hệ thống chuyển vô thừa nhận do quá hạn chọn phương án; không phát sinh bồi thường.</p>}
        {item.decidedAt && <p>{decision === 'UNCLAIMED' ? 'Thời điểm xử lý' : 'Member đã chọn lúc'}: {date(item.decidedAt)}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral p-4 space-y-1">
          <p className="font-semibold">Nhận đền đủ, không nhận lại hàng</p>
          <p className="text-primary font-bold">{amount(item.compensationAmount)}</p>
        </div>
        <div className="rounded-xl border border-neutral p-4 space-y-1">
          <p className="font-semibold">Nhận đền một phần{rate != null ? ` (${Number(rate) * 100}%)` : ''} và nhận lại hàng</p>
          <p className="text-primary font-bold">{amount(partialCompensation(item))}</p>
        </div>
      </div>
      {item.paidAmount != null && decision !== 'UNCLAIMED' && <p>Đã cộng vào ví: {amount(item.paidAmount)}</p>}
      {decision === 'FULL_COMPENSATION' && <p>Hàng thuộc tài sản nền tảng (PLATFORM_OWNED).</p>}
      {decision === 'PARTIAL_WITH_ITEM_BACK' && (
        <div className="space-y-2">
          {item.pickedUpAt ? (
            <p className="font-semibold text-[#006B2C]">
              Đã bàn giao tại quầy lúc: {date(item.pickedUpAt)}
            </p>
          ) : (
            <>
              <p>Member đến Quầy tiếp nhận để nhận lại hàng, không mất phí rút.</p>
              {item.pickupDeadline && <p>Hạn nhận hàng: {formatDeadlineWithCountdown(item.pickupDeadline)}</p>}
              {onNavigateToCounter && <Button variant="outline" onClick={onNavigateToCounter}>Mở Quầy tiếp nhận (BG-01) →</Button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Only read operations live here: retrying a missing case must never refund/create again.
export default function DegradedCaseDetails({ caseId, productId, returnId, resolvedAt, stockPhotos = [], onNavigateToCounter }) {
  const resource = useResource(async options => {
    if (caseId) return returnService.getDegradedCase(caseId, options);
    // Order enrichment can fail independently of return resolution. Retry that read too.
    const detail = !productId && returnId ? await returnService.detail(returnId, options) : null;
    return returnService.findDegradedCase(productId || detail?.productId, {
      ...options, notBefore: resolvedAt || detail?.resolvedAt,
    });
  }, [caseId, productId, returnId, resolvedAt]);
  const item = resource.data;
  return (
    <ResourceState resource={resource}>
      {item && <div className="space-y-4">
        <DegradedCaseSummary item={item} onNavigateToCounter={onNavigateToCounter} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stockPhotos.length > 0 && <section><h3 className="font-semibold mb-2">Ảnh lúc xuất kho</h3><Photos photos={stockPhotos} /></section>}
          <section><h3 className="font-semibold mb-2">Ảnh hiện trạng hư hỏng</h3>{item.photos?.length ? <Photos photos={item.photos} /> : <p>Chưa có ảnh hư hỏng được lưu.</p>}</section>
        </div>
        <section className="space-y-2"><h3 className="font-semibold">Mô tả hư hỏng của Moderator</h3><p className="whitespace-pre-wrap">{item.moderatorNote || 'Chưa có ghi chú'}</p></section>
        {item.reason && <p>Lý do trả hàng: {item.reason}</p>}
      </div>}
    </ResourceState>
  );
}
