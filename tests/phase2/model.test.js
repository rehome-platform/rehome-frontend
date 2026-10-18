import { describe, expect, it } from 'vitest';
import {
  canStockIn,
  lookupParams,
  normalizeError,
  ownsClaim,
  safeDocumentUrl,
  unwrap,
  validMoney,
} from '../../src/features/moderator/phase2/model.js';

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
});
