import { describe, expect, it } from 'vitest';
import {
  QUEUE_TYPE_LABELS,
  taskTypeLabel,
  queueItemMeta,
} from '../../src/features/moderator/models/queueModel.js';

describe('Queue Model: taskTypeLabel & 7 Queue Types', () => {
  it('maps all 7 backend QueueType enums to user-friendly Vietnamese labels', () => {
    expect(taskTypeLabel({ type: 'FORM_REVIEW' })).toBe('Duyệt form ký gửi');
    expect(taskTypeLabel({ type: 'INSPECTION' })).toBe('Kiểm định tại quầy');
    expect(taskTypeLabel({ type: 'PACKING' })).toBe('Đóng gói đơn hàng');
    expect(taskTypeLabel({ type: 'RETURN' })).toBe('Yêu cầu trả hàng');
    expect(taskTypeLabel({ type: 'ORG_VERIFICATION' })).toBe('Xác minh tổ chức');
    expect(taskTypeLabel({ type: 'LEGAL_CHANGE' })).toBe('Đổi pháp lý tổ chức');
    expect(taskTypeLabel({ type: 'VIOLATION_REPORT' })).toBe('Báo cáo vi phạm');
  });

  it('correctly maps ORG_VERIFICATION items from backend API response to "Xác minh tổ chức"', () => {
    const apiItem = {
      id: 'e607dfd1-9d01-4655-b8db-22a57cb7a2d1',
      type: 'ORG_VERIFICATION',
      refId: 'b2917287-3274-4460-bc6f-493df3ddf596',
      claimedBy: null,
      claimedAt: null,
      createdAt: '2026-11-01T11:20:34.940463Z',
    };
    const meta = queueItemMeta(apiItem);
    expect(meta.typeLabel).toBe('Xác minh tổ chức');
    expect(meta.type).toBe('ORG_VERIFICATION');
  });

  it('falls back to typeParam when item.type is not present', () => {
    expect(taskTypeLabel({}, 'ORG_VERIFICATION')).toBe('Xác minh tổ chức');
    expect(taskTypeLabel(null, 'PACKING')).toBe('Đóng gói đơn hàng');
  });

  it('falls back to "Công việc kho" for unknown types', () => {
    expect(taskTypeLabel({ type: 'UNKNOWN_TYPE' })).toBe('Công việc kho');
    expect(taskTypeLabel(null, null)).toBe('Công việc kho');
  });
});

