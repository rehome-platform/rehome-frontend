import { ownsClaim } from './memberModel.js';
import { OVERDUE_THRESHOLD_HOURS } from '../pages/ConsignmentQueuePage.config.js';

function taskTypeLabel(item, typeParam) {
  if (item.type === 'FORM_REVIEW' || typeParam === 'FORM_REVIEW') return 'Duyệt form ký gửi';
  if (item.type === 'INSPECTION' || typeParam === 'INSPECTION') return 'Kiểm định tại quầy';
  if (item.type === 'PACKING' || typeParam === 'PACKING') return 'Đóng gói đơn hàng';
  return 'Công việc kho';
}

export function queueItemMeta(item, typeParam) {
  const timestamp = item.createdAt || item.queuedAt;
  const createdTime = timestamp ? new Date(timestamp).getTime() : Date.now() - 3600000 * 2;
  const hours = Math.max(0, Math.floor((Date.now() - createdTime) / 3600000));
  return {
    ...item, hours,
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
