import { describe, expect, it } from 'vitest';
import {
  canStockIn,
  listItems,
  lookupParams,
  normalizeError,
  normalizeMemberTasks,
  ownsClaim,
  safeDocumentUrl,
  unwrap,
  validMoney,
} from '../../src/features/moderator/models/warehouseModel.js';

describe('Phase 2 boundary rules', () => {
  it('accepts empty 204 and both supported envelopes without losing false values', () => {
    expect(unwrap({ status: 204 })).toBeNull();
    expect(unwrap({ status: 200, data: { data: false } })).toBe(false);
    expect(unwrap({ status: 200, data: { result: [] } })).toEqual([]);
  });
  it.each(['0', '-1', '1.5', '1e3', 'Infinity', '9007199254740992'])(
    'rejects invalid VND %s',
    (value) => expect(validMoney(value)).toBe(false),
  );
  it('accepts integer VND and gates stock-in on server confirmation and existing SKU', () => {
    expect(validMoney('250000')).toBe(true);
    expect(canStockIn({ confirmedAt: null })).toBe(false);
    expect(canStockIn({ confirmedAt: '2026-10-18', productSku: 'SKU' })).toBe(false);
    expect(canStockIn({ confirmedAt: '2026-10-18' })).toBe(true);
  });
  it('sends exactly one lookup input and distinguishes claims', () => {
    expect(lookupParams('phone', ' 0900000001 ')).toEqual({ phone: '0900000001' });
    expect(() => lookupParams('q', 'test')).toThrow();
    expect(ownsClaim({ claimedBy: 'other' }, 'me')).toBe(false);
    expect(ownsClaim({ claimedBy: 'me' }, 'me')).toBe(true);
    expect(ownsClaim({ claimedBy: 'MOD-001' }, 'mod-001')).toBe(true);
    expect(ownsClaim({ claimedBy: { id: 'mod-001' } }, 'MOD-001')).toBe(true);
    expect(ownsClaim({ claimedBy: { accountId: 'mod-002' } }, 'mod-002')).toBe(true);
    expect(ownsClaim(null, 'me')).toBe(false);
    expect(ownsClaim({ claimedBy: null }, 'me')).toBe(false);
    expect(ownsClaim({ claimedBy: 'me' }, null)).toBe(false);
  });
  it('preserves field errors and rejects executable document links', () => {
    const error = normalizeError({
      response: { status: 422, data: { code: 'INVALID', fieldErrors: { name: 'Required' } } },
    });
    expect(error.fields.name).toBe('Required');
    expect(error.code).toBe('INVALID');
    expect(safeDocumentUrl('javascript:alert(1)')).toBeNull();
    expect(safeDocumentUrl('https://example.test/receipt.pdf')).toBe(
      'https://example.test/receipt.pdf',
    );
  });
  it('normalizes member tasks and flattens task groups with listItems', () => {
    expect(normalizeMemberTasks(null)).toEqual({
      pendingForms: [],
      pendingWithdrawals: [],
      pendingEndOfTerm: [],
      totalCount: 0,
    });
    const legacyArray = [{ formId: 'f1', name: 'Áo thun', status: 'PENDING' }];
    expect(normalizeMemberTasks(legacyArray)).toEqual({
      pendingForms: [{ formId: 'f1', id: 'f1', name: 'Áo thun', productName: 'Áo thun', status: 'PENDING' }],
      pendingWithdrawals: [],
      pendingEndOfTerm: [],
      totalCount: 1,
    });
    const backendData = {
      pendingForms: [{ id: 'f2', productName: 'Váy', desiredPrice: 200000, status: 'APPROVED' }],
      pendingWithdrawals: [{ id: 'w1', productId: 'Q7-AK-001', productName: 'Áo khoác', feeCharged: 50000 }],
      pendingEndOfTerm: [{ id: 'e1', productId: 'Q7-DM-002', productName: 'Đầm dạ hội' }],
    };
    const normalized = normalizeMemberTasks(backendData);
    expect(normalized.totalCount).toBe(3);
    expect(normalized.pendingForms[0].formId).toBe('f2');
    expect(normalized.pendingWithdrawals[0].refId).toBe('w1');
    expect(normalized.pendingEndOfTerm[0].refId).toBe('e1');
    expect(listItems(backendData)).toHaveLength(3);
  });
});
