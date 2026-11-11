import { ownsClaim } from './memberModel.js';
import { OVERDUE_THRESHOLD_HOURS } from '../pages/ConsignmentQueuePage.config.js';

export const QUEUE_TYPE_LABELS = {
  FORM_REVIEW: 'Duyệt form ký gửi',
  INSPECTION: 'Kiểm định tại quầy',
  PACKING: 'Đóng gói đơn hàng',
  WITHDRAWAL: 'Rút hàng',
  ITEM_WITHDRAWAL: 'Rút hàng',
  RETURN: 'Yêu cầu trả hàng',
  ORG_VERIFICATION: 'Xác minh tổ chức',
  LEGAL_CHANGE: 'Đổi pháp lý tổ chức',
  VIOLATION_REPORT: 'Báo cáo vi phạm',
};

export function taskTypeLabel(item, typeParam) {
  const type = item?.type || typeParam;
  return QUEUE_TYPE_LABELS[type] || 'Công việc kho';
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

export function queueItemMeta(item, typeParam) {
  const timestamp = item.createdAt || item.queuedAt;
  const createdTime = timestamp ? new Date(timestamp).getTime() : Date.now() - 3600000 * 2;
  const elapsedMs = Math.max(0, Date.now() - createdTime);
  const minutes = Math.floor(elapsedMs / 60000);
  const hours = Math.max(0, Math.floor(elapsedMs / 3600000));
  const waitMinutes = item.waitMinutes !== undefined && item.waitMinutes !== null ? item.waitMinutes : minutes;
  return {
    ...item,
    hours,
    waitMinutes,
    waitTimeFormatted: formatWaitTime(waitMinutes),
    isOverdue: hours >= OVERDUE_THRESHOLD_HOURS,
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

export function queueActionError(error) {
  if (error.status === 409 || error.code === 'QUEUE_ITEM_ALREADY_CLAIMED') {
    return 'Công việc đã được người khác nhận trước. Hệ thống đã tải lại danh sách mới nhất.';
  }
  if (error.status === 403 || error.code === 'QUEUE_ITEM_NOT_CLAIMED_BY_YOU') {
    return 'Bạn không có quyền nhả việc do nhân viên khác đang nhận.';
  }
  return error.message || 'Đã xảy ra lỗi khi thao tác trên hàng đợi.';
}
