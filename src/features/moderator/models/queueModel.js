import { ownsClaim } from './memberModel.js';
import { OVERDUE_THRESHOLD_HOURS } from '../pages/ConsignmentQueuePage.config.js';

export function queueListCacheKey(type, claim = '', page = 0) {
  return `queue:list:${type || 'ALL'}:${claim || ''}:${page}`;
}

export const ALL_QUEUE_CACHE_KEY = queueListCacheKey('ALL', '', 0);

export const QUEUE_TYPE_LABELS = {
  FORM_REVIEW: 'Duyệt form ký gửi',
  INSPECTION: 'Kiểm định tại quầy',
  PACKING: 'Đóng gói đơn hàng',
  WITHDRAWAL: 'Rút hàng',
  ITEM_WITHDRAWAL: 'Rút hàng',
  DONATION_PICKUP: 'Lấy món quyên góp',
  DONATION_REASSIGN: 'Chuyển lượt quyên góp tạm giữ',
  DONATION_PREP: 'Chuẩn bị quyên góp',
  RETURN: 'Yêu cầu trả hàng',
  RETURN_SHIP_BACK: 'Gửi lại hàng trả không hợp lệ',
  ORG_VERIFICATION: 'Xác minh tổ chức',
  LEGAL_CHANGE: 'Thay đổi pháp lý',
  VIOLATION_REPORT: 'Báo cáo vi phạm',
};

export function taskTypeLabel(item, typeParam) {
  const type = item?.type || typeParam;
  return QUEUE_TYPE_LABELS[type] || 'Công việc điểm kí gửi';
}

export function withdrawalCounterLink(item) {
  const params = new URLSearchParams();
  const refId = item.refId || item.id;
  if (refId) params.set('refId', refId);
  if (item.memberCode) params.set('memberCode', item.memberCode);
  if (item.accountId) params.set('accountId', item.accountId);
  const query = params.toString();
  return query ? `/moderator/counter?${query}` : '/moderator/counter';
}

export function formatElapsedHours(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const hours = Math.max(0, Math.floor(Number(value)));
  if (hours < 1) return '< 1 giờ';
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} ngày${remainingHours ? ` ${remainingHours} giờ` : ''}`;
}

export function formatWaitTime(waitMinutes) {
  const mins = Math.max(0, Number(waitMinutes) || 0);
  if (mins < 10) return '< 10p';
  if (mins < 60) {
    const floored10 = Math.floor(mins / 10) * 10;
    return `${floored10}p`;
  }
  const hours = Math.floor(mins / 60);
  if (hours >= 24) return formatElapsedHours(hours);
  const remMinutes = mins % 60;
  const flooredRem = Math.floor(remMinutes / 10) * 10;
  if (flooredRem === 0) {
    return `${hours}h`;
  }
  return `${hours}h${flooredRem}`;
}

export function queueItemElapsedHours(item, now = Date.now()) {
  const timestamp = item?.createdAt || item?.queuedAt;
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor((now - parsed) / 3600000));
}

export function isQueueItemOverdue(item, now = Date.now()) {
  const hours = queueItemElapsedHours(item, now);
  return hours !== null && hours >= OVERDUE_THRESHOLD_HOURS;
}

export function isShipBackDeadlineNear(deadline, now = Date.now(), thresholdHours = 12) {
  if (!deadline) return false;
  const ms = new Date(deadline).getTime();
  if (!Number.isFinite(ms)) return false;
  return ms - now <= thresholdHours * 3600 * 1000;
}

export function queueItemMeta(item, typeParam, now = Date.now()) {
  const timestamp = item?.createdAt || item?.queuedAt;
  const parsedTime = timestamp ? new Date(timestamp).getTime() : NaN;
  const hasValidTimestamp = Number.isFinite(parsedTime);
  const createdTime = hasValidTimestamp ? parsedTime : now - 3600000 * 2;
  const elapsedMs = Math.max(0, now - createdTime);
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.max(0, Math.floor(elapsedMs / 3600000));
  const waitMinutes = item.waitMinutes !== undefined && item.waitMinutes !== null ? item.waitMinutes : minutes;
  return {
    ...item,
    hours,
    waitMinutes,
    waitTimeFormatted: formatWaitTime(waitMinutes),
    isOverdue: hasValidTimestamp && hours >= OVERDUE_THRESHOLD_HOURS,
    typeLabel: taskTypeLabel(item, typeParam),
    formattedTime: new Date(createdTime).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }),
  };
}

export function matchesQueueFilter(item, { overdueOnly, statusFilter, claimParam, userId }) {
  if (overdueOnly && !item.isOverdue) return false;
  if (statusFilter && item.status !== statusFilter) return false;
  if (claimParam === 'mine' && !ownsClaim(item, userId)) return false;
  if (claimParam === 'unclaimed' && item.claimedBy) return false;
  return true;
}

function queueItemCreatedTimestamp(item) {
  const raw = item?.createdAt || item?.queuedAt;
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sortQueueItemsByDate(items, sortOrder = 'newest') {
  if (!Array.isArray(items)) return [];
  const isOldestFirst = sortOrder === 'oldest';
  return [...items].sort((a, b) => {
    const timeA = queueItemCreatedTimestamp(a);
    const timeB = queueItemCreatedTimestamp(b);
    if (timeA === timeB) return 0;
    if (timeA === null) return 1;
    if (timeB === null) return -1;
    return isOldestFirst ? timeA - timeB : timeB - timeA;
  });
}

export function sortQueueItemsNewestFirst(items) {
  return sortQueueItemsByDate(items, 'newest');
}

export function queueActionError(error) {
  if (error.status === 409 || error.code === 'QUEUE_ITEM_ALREADY_CLAIMED') {
    return 'Công việc đã được người khác nhận trước. Hệ thống đã tải lại danh sách mới nhất.';
  }
  if (error.status === 403 || error.code === 'QUEUE_ITEM_NOT_CLAIMED_BY_YOU') {
    return 'Bạn không có quyền nhả việc do nhân viên khác đang nhận.';
  }
  return error.message || 'Đã xảy ra lỗi khi thao tác trên hàng đợi.';
}
