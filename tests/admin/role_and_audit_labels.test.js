import { describe, it, expect } from 'vitest';
import {
  normalizeRoleKey,
  getRoleLabel,
  getRoleBadgeStyle,
} from '../../src/constants/roleLabels.js';
import {
  AUDIT_TARGET_TYPE_LABELS,
  formatAuditActionLabel,
  formatAuditTargetTypeLabel,
  formatAuditStatusLabel,
} from '../../src/constants/auditLogLabels.js';

describe('roleLabels dictionary', () => {
  it('normalizes raw Spring Security authority strings, brackets, arrays, and lowercase roles', () => {
    expect(normalizeRoleKey('[ROLE_MODERATOR]')).toBe('MODERATOR');
    expect(normalizeRoleKey('ROLE_MODERATOR')).toBe('MODERATOR');
    expect(normalizeRoleKey('moderator')).toBe('MODERATOR');
    expect(normalizeRoleKey('staff')).toBe('MODERATOR');
    expect(normalizeRoleKey(['ROLE_MODERATOR'])).toBe('MODERATOR');

    expect(normalizeRoleKey('[ROLE_ADMIN]')).toBe('ADMIN');
    expect(normalizeRoleKey('ROLE_ADMIN')).toBe('ADMIN');
    expect(normalizeRoleKey('admin')).toBe('ADMIN');
    expect(normalizeRoleKey(['ROLE_ADMIN'])).toBe('ADMIN');

    expect(normalizeRoleKey('MEMBER')).toBe('MEMBER');
    expect(normalizeRoleKey('ORGANIZATION')).toBe('ORGANIZATION');
    expect(normalizeRoleKey('SYSTEM')).toBe('SYSTEM');
    expect(normalizeRoleKey('')).toBe('');
    expect(normalizeRoleKey(null)).toBe('');
  });

  it('returns pure Vietnamese role labels without English suffixes or brackets', () => {
    expect(getRoleLabel('[ROLE_ADMIN]')).toBe('Quản trị viên');
    expect(getRoleLabel('ROLE_ADMIN')).toBe('Quản trị viên');
    expect(getRoleLabel('admin')).toBe('Quản trị viên');
    expect(getRoleLabel('[ROLE_MODERATOR]')).toBe('Nhân viên điểm kí gửi');
    expect(getRoleLabel('moderator')).toBe('Nhân viên điểm kí gửi');
    expect(getRoleLabel('staff')).toBe('Nhân viên điểm kí gửi');
    expect(getRoleLabel('MEMBER')).toBe('Thành viên');
    expect(getRoleLabel('ORGANIZATION')).toBe('Tổ chức');
    expect(getRoleLabel('SYSTEM')).toBe('Hệ thống');
    expect(getRoleLabel(null, 'Người dùng')).toBe('Người dùng');
  });

  it('returns Design Token badge classes for each role', () => {
    expect(getRoleBadgeStyle('ADMIN')).toContain('#006B2C');
    expect(getRoleBadgeStyle('MODERATOR')).toContain('#00685F');
    expect(getRoleBadgeStyle('ORGANIZATION')).toContain('#B54708');
    expect(getRoleBadgeStyle('MEMBER')).toContain('#5B6776');
  });
});

describe('auditLogLabels dictionary', () => {
  it('translates previously untranslated backend audit action types to Vietnamese', () => {
    expect(formatAuditActionLabel('HANDOVER_DONATION')).toBe('Bàn giao quyên góp');
    expect(formatAuditActionLabel('RECORD_DONATION')).toBe('Ghi nhận quyên góp');
    expect(formatAuditActionLabel('CLAIM_TASK')).toBe('Nhận việc');
    expect(formatAuditActionLabel('AUTO_CANCEL_ORDER')).toBe('Tự động hủy đơn hàng');
    expect(formatAuditActionLabel('CONFIRM_ORDER_PAYMENT')).toBe('Xác nhận thanh toán đơn hàng');
    expect(formatAuditActionLabel('CREATE_MODERATOR')).toBe('Tạo tài khoản nhân viên');
    expect(formatAuditActionLabel('VIOLATION_RESOLVE_PROPOSE_BAN')).toBe('Đề xuất khóa tổ chức');
    expect(formatAuditActionLabel('CONTENT_REVIEW_CUSTOM')).toBe('Duyệt nội dung cộng đồng');
    expect(formatAuditActionLabel('')).toBe('Thao tác hệ thống');
    expect(formatAuditActionLabel('UNKNOWN_FUTURE_ACTION')).toBe('UNKNOWN_FUTURE_ACTION');
  });

  it('translates backend audit target types including DONATION and warehouse objects', () => {
    expect(AUDIT_TARGET_TYPE_LABELS.DONATION).toBe('Quyên góp');
    expect(formatAuditTargetTypeLabel('DONATION')).toBe('Quyên góp');
    expect(formatAuditTargetTypeLabel('ORDER')).toBe('Đơn hàng');
    expect(formatAuditTargetTypeLabel('CONSIGNMENT_FORM')).toBe('Phiếu ký gửi');
    expect(formatAuditTargetTypeLabel('BRAND')).toBe('Thương hiệu');
    expect(formatAuditTargetTypeLabel('CATEGORY')).toBe('Danh mục');
    expect(formatAuditTargetTypeLabel('WITHDRAWAL')).toBe('Yêu cầu rút hàng');
    expect(formatAuditTargetTypeLabel('ORGANIZATION_LEGAL_CHANGE')).toBe('Hồ sơ pháp lý tổ chức');
    expect(formatAuditTargetTypeLabel(null)).toBe('Khác');
  });

  it('translates audit status values to Vietnamese', () => {
    expect(formatAuditStatusLabel('PENDING')).toBe('Chờ xử lý');
    expect(formatAuditStatusLabel('RESOLVED')).toBe('Đã xử lý');
    expect(formatAuditStatusLabel('DISMISSED')).toBe('Đã bác bỏ');
    expect(formatAuditStatusLabel('CANCELLED')).toBe('Đã hủy');
    expect(formatAuditStatusLabel('PAID')).toBe('Đã thanh toán');
    expect(formatAuditStatusLabel('HANDED_OVER')).toBe('Đã bàn giao');
  });
});
