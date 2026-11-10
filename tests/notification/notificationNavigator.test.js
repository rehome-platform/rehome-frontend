import { describe, it, expect } from 'vitest';
import { resolveNotificationUrl } from '../../src/utils/notificationNavigator.js';

describe('notificationNavigator', () => {
  it('resolves routes based on targetType and targetId (default/moderator role)', () => {
    expect(resolveNotificationUrl({ targetType: 'CONSIGNMENT', targetId: '123' })).toBe('/moderator/consignments/123');
    expect(resolveNotificationUrl({ targetType: 'CONSIGNMENT_FORM', targetId: 'form-1' })).toBe('/moderator/consignments/form-1');
    expect(resolveNotificationUrl({ targetType: 'PACKING', targetId: '456' })).toBe('/moderator/packing');
    expect(resolveNotificationUrl({ targetType: 'ORDER', targetId: 'ord-1' })).toBe('/moderator/packing');
    expect(resolveNotificationUrl({ targetType: 'RETURN', targetId: '789' })).toBe('/moderator/returns');
    expect(resolveNotificationUrl({ targetType: 'RETURN_REQUEST', targetId: 'ret-1' })).toBe('/moderator/returns');
    expect(resolveNotificationUrl({ targetType: 'ORGANIZATION', targetId: 'org1' })).toBe('/moderator/verifications');
    expect(resolveNotificationUrl({ targetType: 'VERIFICATION', targetId: 'v1' })).toBe('/moderator/verifications');
    expect(resolveNotificationUrl({ targetType: 'VIOLATION', targetId: 'rep1' })).toBe('/moderator/reports');
    expect(resolveNotificationUrl({ targetType: 'REPORT', targetId: 'r1' })).toBe('/moderator/reports');
    expect(resolveNotificationUrl({ targetType: 'VIOLATION_REPORT', targetId: 'rep-99' })).toBe('/moderator/reports?id=rep-99');
    expect(resolveNotificationUrl({ targetType: 'VIOLATION_REPORT' })).toBe('/moderator/reports');
    expect(resolveNotificationUrl({ targetType: 'INVENTORY', targetId: 'SKU123' })).toBe('/moderator/inventory/SKU123');
    expect(resolveNotificationUrl({ targetType: 'PRODUCT' })).toBe('/moderator/inventory');
    expect(resolveNotificationUrl({ targetType: 'INBOX', targetId: 'conv1' })).toBe('/moderator/inbox');
    expect(resolveNotificationUrl({ targetType: 'CONVERSATION', targetId: 'c1' })).toBe('/moderator/inbox');
  });

  it('resolves explicit moderator role routes', () => {
    expect(resolveNotificationUrl({ targetType: 'CONSIGNMENT', targetId: '123' }, 'moderator')).toBe('/moderator/consignments/123');
    expect(resolveNotificationUrl({ targetType: 'PACKING', targetId: '456' }, 'staff')).toBe('/moderator/packing');
    expect(resolveNotificationUrl({ targetType: 'RETURN', targetId: '789' }, 'moderator')).toBe('/moderator/returns');
    expect(resolveNotificationUrl({ targetType: 'ORGANIZATION', targetId: 'org1' }, 'moderator')).toBe('/moderator/verifications');
    expect(resolveNotificationUrl({ targetType: 'VIOLATION', targetId: 'rep1' }, 'moderator')).toBe('/moderator/reports');
    expect(resolveNotificationUrl({ targetType: 'INBOX', targetId: 'conv1' }, 'moderator')).toBe('/moderator/inbox');
  });

  it('resolves admin routes when user is admin', () => {
    expect(resolveNotificationUrl({ targetType: 'ACCOUNT', targetId: 'acc1' }, 'admin')).toBe('/admin/users');
    expect(resolveNotificationUrl({ targetType: 'MEMBER', targetId: 'm1' }, 'admin')).toBe('/admin/users');
    expect(resolveNotificationUrl({ targetType: 'ORGANIZATION', targetId: 'org1' }, 'admin')).toBe('/admin/users');
    expect(resolveNotificationUrl({ targetType: 'WAREHOUSE', targetId: 'wh1' }, 'admin')).toBe('/admin/warehouses');
    expect(resolveNotificationUrl({ targetType: 'VIOLATION', targetId: 'rep1' }, 'admin')).toBe('/admin/users');
    expect(resolveNotificationUrl({ targetType: 'REPORT', targetId: 'r1' }, 'admin')).toBe('/admin/users');
    expect(resolveNotificationUrl({ targetType: 'AUDIT', targetId: 'log1' }, 'admin')).toBe('/admin/audit-logs');
    expect(resolveNotificationUrl({}, 'admin')).toBe('/admin');
  });

  it('handles case-insensitivity and trim', () => {
    expect(resolveNotificationUrl({ targetType: '  consignment  ', targetId: '999' })).toBe('/moderator/consignments/999');
    expect(resolveNotificationUrl({ targetType: '  warehouse  ' }, 'ADMIN')).toBe('/admin/warehouses');
  });

  it('falls back to default portal route on unknown or missing targetType', () => {
    expect(resolveNotificationUrl({})).toBe('/moderator');
    expect(resolveNotificationUrl(null)).toBe('/moderator');
    expect(resolveNotificationUrl(undefined)).toBe('/moderator');
    expect(resolveNotificationUrl('invalid')).toBe('/moderator');
    expect(resolveNotificationUrl({ targetType: 'UNKNOWN_TYPE' })).toBe('/moderator');
    expect(resolveNotificationUrl({ targetType: 'UNKNOWN_TYPE' }, 'admin')).toBe('/admin');
    expect(resolveNotificationUrl({ targetType: '' })).toBe('/moderator');
    expect(resolveNotificationUrl({ targetType: '   ' })).toBe('/moderator');
  });

  it('handles optional targetId for consignment and inventory routes gracefully', () => {
    expect(resolveNotificationUrl({ targetType: 'CONSIGNMENT' })).toBe('/moderator/consignments');
    expect(resolveNotificationUrl({ targetType: 'CONSIGNMENT_FORM' })).toBe('/moderator/consignments');
    expect(resolveNotificationUrl({ targetType: 'INVENTORY' })).toBe('/moderator/inventory');
    expect(resolveNotificationUrl({ targetType: 'PRODUCT', targetId: 'SKU999' })).toBe('/moderator/inventory/SKU999');
  });
});
