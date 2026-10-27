import { describe, expect, it } from 'vitest';
import {
  canCompleteInspection,
  canStockIn,
  canTransferUnclaimed,
  extractReceiptId,
  filterCatalogItems,
  filterUnclaimedItems,
  formatStockMovement,
  formatTryOnSlot,
  listItems,
  lookupParams,
  normalizeConsignmentForm,
  normalizeError,
  normalizeMemberTasks,
  normalizeProductResponse,
  normalizeUnclaimedItem,
  ownsClaim,
  safeDocumentUrl,
  STOCK_MOVEMENT_CONFIG,
  SUPPORTED_TRYON_SLOTS,
  TRYON_SLOT_CONFIG,
  unwrap,
  validateCatalogInput,
  validateNewShelf,
  validatePartnerName,
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
  it('normalizes consignment form and derives allowedActions based on status', () => {
    expect(normalizeConsignmentForm(null)).toBeNull();
    const pending = normalizeConsignmentForm({ id: 'form-1', productName: 'Áo gió', status: 'PENDING' }, 'mod-1');
    expect(pending.name).toBe('Áo gió');
    expect(pending.allowedActions).toEqual(['APPROVE', 'REJECT']);
    expect(pending.claimedBy).toBe('mod-1');

    const approved = normalizeConsignmentForm({ id: 'form-2', status: 'APPROVED', bringInDeadline: '2026-11-01' });
    expect(approved.allowedActions).toEqual(['START_INSPECTION']);
    expect(approved.bringDeadline).toBe('2026-11-01');

    const inspecting = normalizeConsignmentForm({ id: 'form-3', status: 'INSPECTING', photoUrls: ['https://img.test/1.jpg'] });
    expect(inspecting.allowedActions).toEqual(['COMPLETE_INSPECTION', 'RETURN_ONSITE']);
    expect(inspecting.photos).toEqual([{ url: 'https://img.test/1.jpg' }]);

    const rejected = normalizeConsignmentForm({ id: 'form-4', status: 'REJECTED' });
    expect(rejected.allowedActions).toEqual([]);
  });
  it('validates canCompleteInspection conditions accurately', () => {
    const checklist6 = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true };
    expect(canCompleteInspection({ checklist: checklist6, totalRequired: 6, price: '850000', term: '30', conditionNote: 'Hàng tốt' })).toBe(true);
    expect(canCompleteInspection({ checklist: { ...checklist6, 5: false }, totalRequired: 6, price: '850000', term: '30', conditionNote: 'Hàng tốt' })).toBe(false);
    expect(canCompleteInspection({ checklist: checklist6, totalRequired: 6, price: '0', term: '30', conditionNote: 'Hàng tốt' })).toBe(false);
    expect(canCompleteInspection({ checklist: checklist6, totalRequired: 6, price: '-100', term: '30', conditionNote: 'Hàng tốt' })).toBe(false);
    expect(canCompleteInspection({ checklist: checklist6, totalRequired: 6, price: '850000', term: '', conditionNote: 'Hàng tốt' })).toBe(false);
    expect(canCompleteInspection({ checklist: checklist6, totalRequired: 6, price: '850000', term: '30', conditionNote: '   ' })).toBe(false);
  });
  it('extracts receipt ID and normalizes product response safely', () => {
    expect(extractReceiptId(null)).toBeNull();
    expect(extractReceiptId({ receiptId: 'rc-1' })).toBe('rc-1');
    expect(extractReceiptId({ id: 'rc-2' })).toBe('rc-2');
    expect(extractReceiptId({ id: 'rc-3', receiptId: 'rc-4' })).toBe('rc-4');

    expect(canStockIn({ confirmedAt: '2026-10-18', sku: 'EXISTING-SKU' })).toBe(false);
    expect(canStockIn({ confirmedAt: '2026-10-18', productSku: 'EXISTING-SKU' })).toBe(false);
    expect(canStockIn({ confirmedAt: '2026-10-18' })).toBe(true);

    expect(normalizeProductResponse(null)).toBeNull();
    const created = normalizeProductResponse({ id: 'Q7-AO-000001', name: 'Áo lụa', status: 'ON_SALE' });
    expect(created.sku).toBe('Q7-AO-000001');
    expect(created.id).toBe('Q7-AO-000001');
    expect(created.name).toBe('Áo lụa');
    expect(created.status).toBe('ON_SALE');
  });

  describe('Task 6: Inventory & Stock Movement models', () => {
    it('formatStockMovement: formats different movement types correctly', () => {
      expect(formatStockMovement(null)).toBeNull();

      // SHELF_MOVE from backend (fromLocation and toLocation)
      const shelfMove = formatStockMovement({
        id: 'log-1',
        type: 'SHELF_MOVE',
        fromLocation: 'A1-03',
        toLocation: 'B2-10',
        note: 'Đổi sang khu áo khoác',
        createdAt: '2026-10-27T08:00:00Z',
      });
      expect(shelfMove.type).toBe('SHELF_MOVE');
      expect(shelfMove.label).toBe('Điều chuyển kệ');
      expect(shelfMove.locationText).toBe('A1-03 → B2-10');
      expect(shelfMove.note).toBe('Đổi sang khu áo khoác');
      expect(shelfMove.badgeClass).toContain('bg-blue-100');

      // STOCK_IN
      const stockIn = formatStockMovement({
        id: 'log-2',
        type: 'STOCK_IN',
        toLocation: 'B1-05',
        createdAt: '2026-10-26T14:00:00Z',
      });
      expect(stockIn.label).toBe('Nhập kho ban đầu');
      expect(stockIn.locationText).toBe('Kệ B1-05');
      expect(stockIn.badgeClass).toContain('bg-emerald-100');

      // Legacy/fixture fallback (shelfLocation)
      const legacyFixture = formatStockMovement({
        type: 'SHELF_MOVE',
        shelfLocation: 'C3-01',
      });
      expect(legacyFixture.locationText).toBe('Kệ C3-01');

      // WITHDRAWAL_OUT
      const withdrawal = formatStockMovement({
        type: 'WITHDRAWAL_OUT',
        partnerName: 'Nguyễn Văn A',
      });
      expect(withdrawal.label).toBe('Rút hàng trả Member');
      expect(withdrawal.locationText).toBe('Đối tác: Nguyễn Văn A');
    });

    it('validateNewShelf: validates shelf inputs rigorously', () => {
      expect(validateNewShelf('', 'A1-01').valid).toBe(false);
      expect(validateNewShelf('   ', 'A1-01').valid).toBe(false);
      expect(validateNewShelf('a'.repeat(256), 'A1-01').valid).toBe(false);

      // Same location (case insensitive & trimmed)
      expect(validateNewShelf('A1-01', 'A1-01').valid).toBe(false);
      expect(validateNewShelf(' a1-01 ', 'A1-01').valid).toBe(false);
      expect(validateNewShelf('B2-10', 'A1-01')).toEqual({ valid: true, value: 'B2-10' });
      expect(validateNewShelf('  B2-10  ', 'A1-01')).toEqual({ valid: true, value: 'B2-10' });
    });
  });

  describe('Task 7: Category & Brand models and helpers', () => {
    it('formatTryOnSlot: maps slots to localized labels and badges', () => {
      expect(formatTryOnSlot(null).label).toBe('Không xác định');
      expect(formatTryOnSlot('').label).toBe('Không xác định');

      const top = formatTryOnSlot('TOP');
      expect(top.label).toBe('Áo (TOP)');
      expect(top.badgeClass).toContain('bg-sky-50');

      const bottom = formatTryOnSlot('bottom');
      expect(bottom.label).toBe('Quần / Váy (BOTTOM)');
      expect(bottom.badgeClass).toContain('bg-indigo-50');

      const dress = formatTryOnSlot('DRESS');
      expect(dress.label).toBe('Đầm / Liền thân (DRESS)');
      expect(dress.badgeClass).toContain('bg-amber-50');

      const custom = formatTryOnSlot('CUSTOM_SLOT');
      expect(custom.label).toBe('Slot CUSTOM_SLOT');
    });

    it('validateCatalogInput: validates Category name and tryonSlot', () => {
      // Empty name
      expect(validateCatalogInput('category', { name: '', tryonSlot: 'TOP' }).valid).toBe(false);
      expect(validateCatalogInput('category', { name: '   ', tryonSlot: 'TOP' }).valid).toBe(false);

      // Name too long
      expect(validateCatalogInput('category', { name: 'A'.repeat(256), tryonSlot: 'TOP' }).valid).toBe(false);

      // Invalid or empty tryonSlot
      expect(validateCatalogInput('category', { name: 'Áo khoác', tryonSlot: '' }).valid).toBe(false);
      expect(validateCatalogInput('category', { name: 'Áo khoác', tryonSlot: 'INVALID' }).valid).toBe(false);

      // Valid category
      const res = validateCatalogInput('category', { name: '  Áo  khoác   dạ  ', tryonSlot: 'top' });
      expect(res.valid).toBe(true);
      expect(res.value).toEqual({ name: 'Áo khoác dạ', tryonSlot: 'TOP' });
    });

    it('validateCatalogInput: validates Brand name', () => {
      expect(validateCatalogInput('brand', { name: '' }).valid).toBe(false);
      expect(validateCatalogInput('brand', { name: '   ' }).valid).toBe(false);
      expect(validateCatalogInput('brand', { name: 'Z'.repeat(256) }).valid).toBe(false);

      const res = validateCatalogInput('brand', { name: '  Zara   Vietnam  ' });
      expect(res.valid).toBe(true);
      expect(res.value).toEqual({ name: 'Zara Vietnam' });
    });

    it('filterCatalogItems: filters categories and brands by keyword', () => {
      const list = [
        { id: '1', name: 'Áo khoác dạ', slot: 'TOP' },
        { id: '2', name: 'Quần jeans', slot: 'BOTTOM' },
        { id: '3', name: 'Đầm dạ hội', slot: 'DRESS' },
      ];

      expect(filterCatalogItems(list, '')).toHaveLength(3);
      expect(filterCatalogItems(list, 'khoác')).toHaveLength(1);
      expect(filterCatalogItems(list, 'khoác')[0].name).toBe('Áo khoác dạ');
      expect(filterCatalogItems(list, 'DRESS')).toHaveLength(1);
      expect(filterCatalogItems(list, 'nonexistent')).toHaveLength(0);
    });
  });

  describe('Task 9: Unclaimed products & Charity transfer model rules', () => {
    it('validatePartnerName: validates charity partner organization name', () => {
      expect(validatePartnerName(null).valid).toBe(false);
      expect(validatePartnerName(123).valid).toBe(false);
      expect(validatePartnerName('').valid).toBe(false);
      expect(validatePartnerName('   ').valid).toBe(false);
      expect(validatePartnerName('A'.repeat(256)).valid).toBe(false);

      const res = validatePartnerName('  Quỹ Tình Thương TP.HCM  ');
      expect(res.valid).toBe(true);
      expect(res.value).toBe('Quỹ Tình Thương TP.HCM');
    });

    it('canTransferUnclaimed: checks eligibility for charity transfer', () => {
      expect(canTransferUnclaimed(null)).toBe(false);
      expect(canTransferUnclaimed({ status: 'ON_SALE' })).toBe(false);
      expect(canTransferUnclaimed({ status: 'DONATED' })).toBe(false);
      expect(canTransferUnclaimed({ status: 'UNCLAIMED', allowedActions: ['HANDOVER'] })).toBe(false);

      expect(canTransferUnclaimed({ status: 'UNCLAIMED' })).toBe(true);
      expect(canTransferUnclaimed({ status: 'UNCLAIMED', allowedActions: ['TRANSFER'] })).toBe(true);
      expect(canTransferUnclaimed({ status: 'UNCLAIMED', allowedActions: ['TRANSFER', 'CHANGE_SHELF'] })).toBe(true);
    });

    it('normalizeUnclaimedItem: formats raw product item into view model with defaults', () => {
      expect(normalizeUnclaimedItem(null)).toBeNull();

      const item = normalizeUnclaimedItem({
        id: 'SKU-001',
        name: 'Áo dạ tweed',
        shelfLocation: 'B2-01',
        status: 'UNCLAIMED',
      });

      expect(item).toMatchObject({
        id: 'SKU-001',
        sku: 'SKU-001',
        name: 'Áo dạ tweed',
        shelfLocation: 'B2-01',
        status: 'UNCLAIMED',
        allowedActions: ['TRANSFER'],
      });

      // Item missing optional fields
      const minimal = normalizeUnclaimedItem({ sku: 'SKU-002' });
      expect(minimal.name).toBe('Sản phẩm chưa đặt tên');
      expect(minimal.shelfLocation).toBe('Chưa gán vị trí');
      expect(minimal.status).toBe('UNCLAIMED');
      expect(minimal.allowedActions).toEqual(['TRANSFER']);
    });

    it('filterUnclaimedItems: filters unclaimed products by SKU, name or shelf location', () => {
      const items = [
        { sku: 'Q7-AK-001', name: 'Áo khoác dạ', shelfLocation: 'A1-01' },
        { sku: 'Q7-QJ-002', name: 'Quần jeans rách', shelfLocation: 'B2-05' },
        { sku: 'Q7-DH-003', name: 'Đầm hoa nhí', shelfLocation: 'C3-10' },
      ];

      expect(filterUnclaimedItems(items, '')).toHaveLength(3);
      expect(filterUnclaimedItems(items, '  ')).toHaveLength(3);
      expect(filterUnclaimedItems(items, 'ak-001')).toHaveLength(1);
      expect(filterUnclaimedItems(items, 'jeans')).toHaveLength(1);
      expect(filterUnclaimedItems(items, 'c3-10')).toHaveLength(1);
      expect(filterUnclaimedItems(items, 'khong-ton-tai')).toHaveLength(0);
    });
  });
});


