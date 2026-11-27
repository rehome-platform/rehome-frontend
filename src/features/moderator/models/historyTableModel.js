import { warehouseDateTime } from './warehouseTime.js';
import { HISTORY_RESULT_LABELS } from '../../../constants/historyStatus.js';
import {
  HISTORY_EMPTY_FALLBACK,
  formatHistoryAction,
  formatHistoryResult,
  formatHistoryTarget,
  parseHistoryTarget,
} from '../../../utils/formatHistoryValue.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUCCESS_RESULT_KEYS = new Set([
  'SUCCESS',
  'PASS',
  'PASSED',
  'APPROVED',
  'CONFIRMED',
  'HANDED_OVER',
  'ON_SALE',
  'RELIST',
  'COMPLETED',
  'RESOLVED',
  'PICKED_UP',
]);

const DANGER_RESULT_KEYS = new Set([
  'REJECTED',
  'DISCARD',
  'FAILED',
  'CANCELLED',
]);

const WARNING_RESULT_KEYS = new Set([
  'WAITING_CONFIRMATION',
  'PENDING_DECISION',
  'INSPECTING',
  'PROPOSED',
  'WAREHOUSE',
  'DEGRADED',
]);

const INFO_RESULT_KEYS = new Set([
  'SHIPPING',
  'TRANSFERRED',
  'RETURNED',
  'RETURN_TO_SELLER',
  'TAKE_BACK',
  'RE_CONSIGN',
  'DONATE',
  'OPENED',
  'STARTED',
  'FULL_COMPENSATION',
  'PARTIAL_WITH_ITEM_BACK',
]);

export function resolveWarehouseResultTone(rawResult, rawAction) {
  if (rawResult == null || String(rawResult).trim() === '') {
    return null;
  }
  const actionKey = String(rawAction || '').trim().toUpperCase();
  const key = String(rawResult).trim().toUpperCase();
  if (actionKey === 'SHIP_BACK_RETURN' && !Object.prototype.hasOwnProperty.call(HISTORY_RESULT_LABELS, key)) {
    return 'info';
  }
  if (SUCCESS_RESULT_KEYS.has(key)) return 'success';
  if (DANGER_RESULT_KEYS.has(key)) return 'danger';
  if (WARNING_RESULT_KEYS.has(key)) return 'warning';
  if (INFO_RESULT_KEYS.has(key)) return 'info';
  return 'neutral';
}

export function formatHistoryTime(value) {
  if (!value) return HISTORY_EMPTY_FALLBACK;
  const formatted = warehouseDateTime(value);
  return formatted === 'Chưa có thông tin' ? HISTORY_EMPTY_FALLBACK : formatted;
}

export function resolveWarehouseHistoryDetailHref(row) {
  if (!row || typeof row !== 'object') return null;

  const { targetType, targetLabel } = parseHistoryTarget(row);
  const normalizedType = String(targetType || '').trim().toUpperCase();
  const explicitId = row.targetId != null ? String(row.targetId).trim() : '';
  const rawLabel = targetLabel ? String(targetLabel).trim() : '';
  const rawId = explicitId || rawLabel;

  if (normalizedType === 'ORDER' && rawId) {
    return `/moderator/packing?orderId=${encodeURIComponent(rawId)}`;
  }
  if (normalizedType === 'CONSIGNMENT_FORM' && rawId) {
    return `/moderator/consignments/${encodeURIComponent(rawId)}`;
  }
  if (normalizedType === 'PRODUCT' && rawId) {
    return `/moderator/inventory/${encodeURIComponent(rawId)}`;
  }
  if (normalizedType === 'RETURN_REQUEST' && rawId) {
    return `/moderator/returns?id=${encodeURIComponent(rawId)}`;
  }
  if (
    (normalizedType === 'DEGRADED_ITEM_CASE' || normalizedType === 'END_OF_TERM_DECISION') &&
    rawLabel &&
    !UUID_PATTERN.test(rawLabel)
  ) {
    return `/moderator/inventory/${encodeURIComponent(rawLabel)}`;
  }

  return null;
}

export function mapWarehouseHistoryRow(row, idx = 0) {
  const safeRow = row && typeof row === 'object' ? row : {};
  const rawActor = safeRow.actorName ?? safeRow.actor;
  const actor = rawActor != null && String(rawActor).trim() !== ''
    ? String(rawActor).trim()
    : HISTORY_EMPTY_FALLBACK;
  const result = formatHistoryResult(safeRow);

  return {
    key:
      safeRow.id ||
      `${safeRow.timestamp || safeRow.createdAt || ''}-${safeRow.target || safeRow.targetId || ''}-${safeRow.action || safeRow.actionType || ''}-${idx}`,
    time: formatHistoryTime(safeRow.createdAt || safeRow.timestamp),
    target: formatHistoryTarget(safeRow),
    detailHref: resolveWarehouseHistoryDetailHref(safeRow),
    contentAction: formatHistoryAction(safeRow),
    actor,
    result,
    resultTone:
      result === HISTORY_EMPTY_FALLBACK
        ? null
        : resolveWarehouseResultTone(safeRow.result, safeRow.action ?? safeRow.actionType),
  };
}

function resolveReturnContentAction(r) {
  const rawStatus = String(r?.rawStatus || '').trim().toUpperCase();
  if (rawStatus === 'VALID') {
    if (r.degraded) return 'Hồ sơ hàng xuống cấp';
    if (r.itemAction) return 'Xử lý món hoàn trả';
    return 'Chốt trả hàng hợp lệ';
  }
  if (rawStatus === 'INVALID') {
    if (r.pickedUpAt) return 'Bàn giao hàng trả tại quầy';
    if (
      r.shipBackTrackingCode ||
      ['SHIPPING', 'DELIVERED', 'FAILED'].includes(String(r.shipBackStatus || '').toUpperCase())
    ) {
      return 'Gửi lại hàng trả qua GHN';
    }
    return 'Chốt trả hàng không hợp lệ';
  }
  if (rawStatus === 'LOST') return 'Báo thất lạc hàng trả';
  if (rawStatus === 'REJECTED') return 'Từ chối yêu cầu trả';
  if (rawStatus === 'CANCELLED') return 'Hủy yêu cầu trả';
  if (rawStatus === 'RESOLVED' || rawStatus === 'COMPLETED') {
    return 'Hoàn tất xử lý trả hàng';
  }
  return r?.rawReason || HISTORY_EMPTY_FALLBACK;
}

function resolveReturnResultMeta(r) {
  const rawStatus = String(r?.rawStatus || '').trim().toUpperCase();
  if (rawStatus === 'VALID') {
    if (r.degraded) return { label: 'Hàng xuống cấp', tone: 'warning' };
    if (r.itemAction) {
      const actionKey = String(r.itemAction).trim().toUpperCase();
      if (actionKey === 'RELIST') return { label: 'Đăng bán lại', tone: 'success' };
      if (actionKey === 'RETURN_TO_SELLER') return { label: 'Trả người gửi', tone: 'info' };
      if (actionKey === 'DISCARD') return { label: 'Loại bỏ', tone: 'neutral' };
      const label = HISTORY_RESULT_LABELS[actionKey] || formatHistoryResult({ result: r.itemAction });
      return { label, tone: 'success' };
    }
    return { label: 'Hợp lệ · Hoàn tiền', tone: 'success' };
  }
  if (rawStatus === 'INVALID') {
    const sbStatus = String(r.shipBackStatus || '').trim().toUpperCase();
    if (r.pickedUpAt) return { label: 'Đã bàn giao quầy', tone: 'success' };
    if (sbStatus === 'DELIVERED' || r.shipBackDeliveredAt) return { label: 'Đã giao lại', tone: 'success' };
    if (sbStatus === 'FAILED' || r.shipBackFailedAt) return { label: 'Giao lại thất bại', tone: 'danger' };
    if (sbStatus === 'SHIPPING' || r.shipBackTrackingCode) return { label: 'Đang gửi lại GHN', tone: 'info' };
    if (sbStatus === 'PAID' || r.shipBackPaidAt) return { label: 'Chờ tạo vận đơn', tone: 'warning' };
    if (sbStatus === 'AWAITING_PAYMENT' || r.shipBackFeeDeadline) return { label: 'Chờ trả phí gửi lại', tone: 'warning' };
    return { label: 'Không hợp lệ', tone: 'danger' };
  }
  if (rawStatus === 'LOST') return { label: 'Thất lạc · Hoàn tiền', tone: 'warning' };
  if (rawStatus === 'REJECTED') return { label: 'Đã từ chối', tone: 'danger' };
  if (rawStatus === 'CANCELLED') return { label: 'Đã hủy', tone: 'neutral' };
  if (rawStatus === 'RESOLVED' || rawStatus === 'COMPLETED') {
    return { label: 'Đã hoàn tất', tone: 'success' };
  }
  if (r?.rawStatus) {
    return {
      label: formatHistoryResult({ result: r.rawStatus }),
      tone: resolveWarehouseResultTone(r.rawStatus),
    };
  }
  if (r?.status === 'RESOLVED') return { label: 'Đã hoàn tất', tone: 'success' };
  return { label: HISTORY_EMPTY_FALLBACK, tone: null };
}

export function mapReturnHistoryRow(r, { onViewDetail } = {}) {
  const item = r && typeof r === 'object' ? r : {};
  const formattedTime = formatHistoryTime(item.resolvedAt || item.createdAt);
  const time =
    formattedTime !== HISTORY_EMPTY_FALLBACK
      ? formattedTime
      : item.submittedAt && item.submittedAt !== 'Gần đây'
        ? item.submittedAt
        : HISTORY_EMPTY_FALLBACK;

  const target = item.code || item.orderNo || item.buyerName || HISTORY_EMPTY_FALLBACK;
  const targetSubtext =
    (item.code || item.orderNo) && item.buyerName
      ? item.buyerName
      : item.code && item.orderNo
        ? item.orderNo
        : '';
  const targetTitle = [
    item.code || null,
    item.orderNo ? `Đơn ${item.orderNo}` : null,
    item.buyerName || null,
    item.sku || null,
  ]
    .filter(Boolean)
    .join(' · ');

  const contentAction = resolveReturnContentAction(item);
  const contentTitle =
    item.rawReason && item.rawReason !== contentAction
      ? `${contentAction} — ${item.rawReason}`
      : contentAction;

  const actor =
    item.actorName != null && String(item.actorName).trim() !== ''
      ? String(item.actorName).trim()
      : HISTORY_EMPTY_FALLBACK;

  const resultMeta = resolveReturnResultMeta(item);

  return {
    key:
      item.id ||
      item.code ||
      `return-${item.orderNo || ''}-${item.resolvedAt || item.createdAt || ''}`,
    time,
    target,
    targetSubtext,
    targetTitle,
    detailHref: null,
    onViewDetail: onViewDetail ? () => onViewDetail(item) : null,
    contentAction,
    contentSubtext: '',
    contentTitle,
    actor,
    result: resultMeta.label,
    resultTone: resultMeta.tone,
  };
}
