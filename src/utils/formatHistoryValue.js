// Helper tập trung cho tầng hiển thị (presentation layer) của các Tab lịch sử kho.
// Không làm thay đổi dữ liệu gốc / Enum dùng cho gọi API, bộ lọc hoặc tạo link chi tiết.

import { HISTORY_OBJECT_LABELS } from '../constants/historyObjectType.js';
import {
  HISTORY_ACTION_LABELS,
  HISTORY_CONTEXT_RESULT_LABELS,
  HISTORY_RESULT_LABELS,
} from '../constants/historyStatus.js';
import {
  resolveProductStatusLabel,
  warehouseReasonOf,
} from '../constants/productStatus.js';

export const HISTORY_EMPTY_FALLBACK = '—';
export const HISTORY_UNKNOWN_FALLBACK = 'Không xác định';

const isDev = () => Boolean(typeof import.meta !== 'undefined' && import.meta.env?.DEV);

const normalizeEnum = (value) => (value == null ? '' : String(value).trim().toUpperCase());

const warnUnmapped = (value, context) => {
  if (isDev()) {
    // eslint-disable-next-line no-console
    console.warn(`[history] Unmapped enum value: "${value}"${context ? ` (${context})` : ''}`);
  }
};

export function formatHistoryValue(value, mapping, options = {}) {
  const { fallback = HISTORY_UNKNOWN_FALLBACK, context = '' } = options;
  if (value == null || String(value).trim() === '') {
    return HISTORY_EMPTY_FALLBACK;
  }
  const key = normalizeEnum(value);
  if (mapping && Object.prototype.hasOwnProperty.call(mapping, key)) {
    return mapping[key];
  }
  warnUnmapped(value, context);
  return fallback;
}

export function formatHistoryObjectType(type) {
  return formatHistoryValue(type, HISTORY_OBJECT_LABELS, { context: 'targetType' });
}

export function parseHistoryTarget(row) {
  if (!row || typeof row !== 'object') {
    return { targetType: '', targetLabel: '' };
  }
  let targetType = row.targetType ? String(row.targetType).trim() : '';
  let targetLabel = row.targetLabel ? String(row.targetLabel).trim() : '';

  if (row.target) {
    const rawTarget = String(row.target).trim();
    const parts = rawTarget.split(/\s+/);
    if (!targetType && parts[0]) targetType = parts[0];
    if (!targetLabel && parts.length > 1) targetLabel = parts.slice(1).join(' ');
  }

  if (!targetLabel && row.targetId) {
    targetLabel = String(row.targetId).trim();
  }

  return { targetType, targetLabel };
}

export function formatHistoryTarget(row) {
  const { targetType, targetLabel } = parseHistoryTarget(row);
  if (!targetType && !targetLabel) {
    return HISTORY_EMPTY_FALLBACK;
  }
  if (!targetType) {
    return targetLabel;
  }
  const typeLabel = formatHistoryObjectType(targetType);
  return targetLabel ? `${typeLabel} ${targetLabel}` : typeLabel;
}

export function formatHistoryAction(row) {
  const rawAction = typeof row === 'string' ? row : (row?.action ?? row?.actionType);
  return formatHistoryValue(rawAction, HISTORY_ACTION_LABELS, { context: 'action' });
}

export function formatHistoryResult(row) {
  const rawResult = typeof row === 'string' ? row : row?.result;
  if (rawResult == null || String(rawResult).trim() === '') {
    return HISTORY_EMPTY_FALLBACK;
  }
  const key = normalizeEnum(rawResult);
  const { targetType } = typeof row === 'object' && row ? parseHistoryTarget(row) : { targetType: '' };
  const normalizedTargetType = normalizeEnum(targetType);
  const normalizedAction = typeof row === 'object' && row
    ? normalizeEnum(row.action ?? row.actionType)
    : '';

  // 1. Ngữ cảnh nghiệp vụ đặc thù (vd: CONSIGNMENT_FORM / RETURN_ONSITE + RETURNED -> "Đã trả tại quầy")
  const byAction = HISTORY_CONTEXT_RESULT_LABELS[normalizedAction]?.[key];
  if (byAction) return byAction;
  const byTarget = HISTORY_CONTEXT_RESULT_LABELS[normalizedTargetType]?.[key];
  if (byTarget) return byTarget;

  // 2. Giá trị nhạy cảm ngữ cảnh WAREHOUSE: tái sử dụng logic phân nhánh từ productStatus.js
  if (key === 'WAREHOUSE') {
    const reason = (typeof row === 'object' && row)
      ? (row.warehouseReason ?? warehouseReasonOf({ ...row, status: 'WAREHOUSE' }))
      : undefined;
    return resolveProductStatusLabel({ status: 'WAREHOUSE', warehouseReason: reason });
  }

  // 2b. Vận đơn gửi lại hàng trả không hợp lệ: BE lưu mã vận đơn GHN vào trường result
  if (
    normalizedAction === 'SHIP_BACK_RETURN' &&
    !Object.prototype.hasOwnProperty.call(HISTORY_RESULT_LABELS, key)
  ) {
    return `Mã vận đơn ${String(rawResult).trim()}`;
  }

  // 3. Tra cứu bảng chuẩn (đã gộp PRODUCT_STATUS_LABELS + kết quả các nghiệp vụ khác)
  return formatHistoryValue(rawResult, HISTORY_RESULT_LABELS, { context: 'result' });
}
