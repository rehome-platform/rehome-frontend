import { describe, it, expect } from 'vitest';
import { resolveNotificationUrl } from '../../src/utils/notificationNavigator.js';

describe('Task 3: Moderator notification deep-link navigation for new queue tasks', () => {
  it('routes ORDER/PACKING notifications to moderator packing page', () => {
    expect(
      resolveNotificationUrl({ targetType: 'ORDER', targetId: 'ord-123' }, 'moderator')
    ).toBe('/moderator/packing');
    expect(
      resolveNotificationUrl({ targetType: 'PACKING', targetId: 'ord-456' }, 'moderator')
    ).toBe('/moderator/packing');
  });

  it('routes RETURN_REQUEST notifications to moderator returns page', () => {
    expect(
      resolveNotificationUrl({ targetType: 'RETURN_REQUEST', targetId: 'ret-9' }, 'moderator')
    ).toBe('/moderator/returns');
  });

  it('routes DONATION_PREP notifications to moderator donations page', () => {
    expect(
      resolveNotificationUrl({ targetType: 'DONATION_PREP', targetId: 'don-7' }, 'moderator')
    ).toBe('/moderator/donations?donationId=don-7');
  });

  it('routes all other queue targetTypes to valid moderator routes', () => {
    expect(resolveNotificationUrl({ targetType: 'CONSIGNMENT_FORM', targetId: 'cf-1' }, 'moderator')).toBe('/moderator/consignments/cf-1');
    expect(resolveNotificationUrl({ targetType: 'WITHDRAWAL', targetId: 'w-1' }, 'moderator')).toBe('/moderator/counter?refId=w-1');
    expect(resolveNotificationUrl({ targetType: 'ORGANIZATION', targetId: 'org-1' }, 'moderator')).toBe('/moderator/verifications');
    expect(resolveNotificationUrl({ targetType: 'LEGAL_CHANGE', targetId: 'lc-1' }, 'moderator')).toBe('/moderator/verifications?tab=LEGAL_CHANGES&id=lc-1');
    expect(resolveNotificationUrl({ targetType: 'VIOLATION_REPORT', targetId: 'vr-1' }, 'moderator')).toBe('/moderator/reports?id=vr-1');
    expect(resolveNotificationUrl({ targetType: 'DONATION', targetId: 'd-1' }, 'moderator')).toBe('/moderator/donations?donationId=d-1');
  });
});
