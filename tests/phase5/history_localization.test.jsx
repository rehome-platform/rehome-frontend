import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HISTORY_OBJECT_LABELS } from '../../src/constants/historyObjectType.js';
import {
  HISTORY_ACTION_LABELS,
  HISTORY_RESULT_LABELS,
} from '../../src/constants/historyStatus.js';
import {
  HISTORY_TABLE_COLUMNS,
  TABLE_COLUMN_LABELS,
} from '../../src/constants/tableColumns.js';
import {
  PRODUCT_STATUS_LABELS,
  WAREHOUSE_REASON,
  WAREHOUSE_UNCLASSIFIED_LABEL,
} from '../../src/constants/productStatus.js';
import {
  HISTORY_EMPTY_FALLBACK,
  HISTORY_UNKNOWN_FALLBACK,
  formatHistoryAction,
  formatHistoryObjectType,
  formatHistoryResult,
  formatHistoryTarget,
  formatHistoryValue,
} from '../../src/utils/formatHistoryValue.js';
import { WarehouseHistoryTabs } from '../../src/features/moderator/components/WarehouseHistoryTabs.jsx';
import { warehouseHistoryService } from '../../src/features/moderator/services/warehouseHistoryApi.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-1', warehouseId: 'wh-1' },
    isAuthenticated: true,
  }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('historyObjectType, historyStatus, tableColumns constants', () => {
  it('covers all 7 backend AuditLogger targetType enums in Vietnamese', () => {
    const backendTargetTypes = [
      'PRODUCT',
      'CONSIGNMENT_FORM',
      'CONSIGNMENT_RECEIPT',
      'ORDER',
      'DEGRADED_ITEM_CASE',
      'END_OF_TERM_DECISION',
      'RETURN_REQUEST',
    ];
    for (const type of backendTargetTypes) {
      expect(HISTORY_OBJECT_LABELS[type]).toBeTruthy();
      expect(HISTORY_OBJECT_LABELS[type]).not.toBe(type);
    }
  });

  it('covers all backend WarehouseAuditGroup actionType enums', () => {
    const backendActions = [
      'CLAIM_TASK',
      'RELEASE_TASK',
      'SCAN_SKU',
      'UPDATE_PACKING_PHOTOS',
      'CREATE_SHIPMENT',
      'HANDOVER_ORDER',
      'APPROVE_FORM',
      'REJECT_FORM',
      'START_INSPECTION',
      'COMPLETE_INSPECTION',
      'RETURN_ONSITE',
      'CONFIRM_RECEIPT',
      'STOCK_IN',
      'CONFIRM_RECONSIGN',
      'OPEN_DEGRADED_CASE',
      'RESOLVE_DEGRADED_CASE',
      'END_OF_TERM_DECISION',
      'PROPOSE_RECONSIGN_TERMS',
      'HANDOVER_END_OF_TERM',
      'HANDOVER_DEGRADED_ITEM',
      'CONFIRM_UNCLAIMED_TRANSFER',
      'APPLY_RETURN_ITEM_ACTION',
      'UPDATE_PRICE',
    ];
    for (const action of backendActions) {
      expect(HISTORY_ACTION_LABELS[action]).toBeTruthy();
      expect(HISTORY_ACTION_LABELS[action]).not.toBe(action);
    }
  });

  it('reuses PRODUCT_STATUS_LABELS and covers non-product backend results', () => {
    for (const [status, label] of Object.entries(PRODUCT_STATUS_LABELS)) {
      expect(HISTORY_RESULT_LABELS[status]).toBe(label);
    }
    const nonProductResults = [
      'SUCCESS',
      'PASSED',
      'APPROVED',
      'REJECTED',
      'STARTED',
      'CONFIRMED',
      'HANDED_OVER',
      'OPENED',
      'PROPOSED',
      'SHIPPING',
      'TRANSFERRED',
      'TAKE_BACK',
      'RE_CONSIGN',
      'DONATE',
      'FULL_COMPENSATION',
      'PARTIAL_WITH_ITEM_BACK',
      'RELIST',
      'RETURN_TO_SELLER',
      'DISCARD',
    ];
    for (const result of nonProductResults) {
      expect(HISTORY_RESULT_LABELS[result]).toBeTruthy();
      expect(HISTORY_RESULT_LABELS[result]).not.toBe(result);
    }
  });

  it('defines unified Moderator column labels', () => {
    expect(TABLE_COLUMN_LABELS.ACTIONS).toBe('Thao tác');
    expect(TABLE_COLUMN_LABELS.WAITED).toBe('Đã chờ');
    expect(HISTORY_TABLE_COLUMNS).toEqual([
      'Thời gian',
      'Đối tượng',
      'Thao tác',
      'Người thực hiện',
      'Kết quả',
    ]);
  });
});

describe('formatHistoryValue & domain formatters', () => {
  it('returns "—" for empty/null/undefined and "Không xác định" with dev warning for unknown enums', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(formatHistoryValue(null, HISTORY_OBJECT_LABELS)).toBe(HISTORY_EMPTY_FALLBACK);
    expect(formatHistoryValue(undefined, HISTORY_OBJECT_LABELS)).toBe(HISTORY_EMPTY_FALLBACK);
    expect(formatHistoryValue('   ', HISTORY_OBJECT_LABELS)).toBe(HISTORY_EMPTY_FALLBACK);
    expect(warnSpy).not.toHaveBeenCalled();

    expect(formatHistoryObjectType('FUTURE_ENUM')).toBe(HISTORY_UNKNOWN_FALLBACK);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('localizes target prefixes while preserving codes and handling missing types', () => {
    expect(formatHistoryTarget({ target: 'PRODUCT RH-M4T19B' })).toBe('Sản phẩm RH-M4T19B');
    expect(formatHistoryTarget({ target: 'CONSIGNMENT_FORM CF-0001' })).toBe('Phiếu ký gửi CF-0001');
    expect(formatHistoryTarget({ target: 'DEGRADED_ITEM_CASE RH-01' })).toBe('Hồ sơ hàng xuống cấp RH-01');
    expect(formatHistoryTarget({ targetType: 'ORDER', targetLabel: 'DH-0' })).toBe('Đơn hàng DH-0');
    expect(formatHistoryTarget({ targetLabel: 'DH-ONLY' })).toBe('DH-ONLY');
    expect(formatHistoryTarget({})).toBe(HISTORY_EMPTY_FALLBACK);
  });

  it('disambiguates context-sensitive RETURNED and WAREHOUSE results', () => {
    expect(formatHistoryResult({ target: 'CONSIGNMENT_FORM CF-01', action: 'RETURN_ONSITE', result: 'RETURNED' }))
      .toBe('Đã trả tại quầy');
    expect(formatHistoryResult({ target: 'PRODUCT RH-01', result: 'RETURNED' }))
      .toBe('Chờ phân loại hoàn');

    expect(formatHistoryResult({ target: 'PRODUCT RH-01', result: 'WAREHOUSE', warehouseReason: WAREHOUSE_REASON.DEGRADED }))
      .toBe('Hàng xuống cấp');
    expect(formatHistoryResult({ target: 'PRODUCT RH-01', result: 'WAREHOUSE', decisionId: 'dec-1' }))
      .toBe('Hết hạn ký gửi');
    expect(formatHistoryResult({ target: 'PRODUCT RH-01', result: 'WAREHOUSE', pricingEligible: true }))
      .toBe('Đang thương lượng');
    expect(formatHistoryResult({ target: 'PRODUCT RH-01', result: 'WAREHOUSE' }))
      .toBe(WAREHOUSE_UNCLASSIFIED_LABEL);
  });

  it('never leaks raw English enums in formatHistoryAction and formatHistoryResult', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(formatHistoryAction({ action: 'UNKNOWN_ACTION_XYZ' })).toBe(HISTORY_UNKNOWN_FALLBACK);
    expect(formatHistoryResult({ result: 'UNKNOWN_RESULT_XYZ' })).toBe(HISTORY_UNKNOWN_FALLBACK);
    expect(formatHistoryAction({ action: null })).toBe(HISTORY_EMPTY_FALLBACK);
    expect(formatHistoryResult({ result: '' })).toBe(HISTORY_EMPTY_FALLBACK);
  });
});

describe('WarehouseHistoryTabs localized rendering', () => {
  it('renders 100% Vietnamese labels for target, action, and result while keeping raw href routing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(warehouseHistoryService, 'list').mockResolvedValueOnce({
      content: [
        {
          id: 'row-1',
          target: 'PRODUCT RH-M4T19B',
          action: 'UPDATE_PRICE',
          actor: 'Nguyễn Văn A',
          timestamp: '2026-11-20T05:00:00Z',
          result: 'ON_SALE',
        },
        {
          id: 'row-2',
          target: 'RETURN_REQUEST RH-000123',
          action: 'APPLY_RETURN_ITEM_ACTION',
          actor: 'Trần Thị B',
          timestamp: '2026-11-20T05:05:00Z',
          result: 'RELIST',
        },
        {
          id: 'row-3',
          target: 'CONSIGNMENT_FORM CF-0009',
          action: 'RETURN_ONSITE',
          actor: 'Lê Văn C',
          timestamp: '2026-11-20T05:10:00Z',
          result: 'RETURNED',
        },
        {
          id: 'row-4',
          target: 'NEW_BACKEND_ENTITY ID-9',
          action: 'NEW_BACKEND_ACTION',
          actor: 'Mod D',
          timestamp: '2026-11-20T05:15:00Z',
          result: 'NEW_BACKEND_RESULT',
        },
      ],
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={['/moderator/inventory?view=history']}>
        <Phase2Provider>
          <WarehouseHistoryTabs type="INVENTORY">
            <p>Công việc tồn kho</p>
          </WarehouseHistoryTabs>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const productLink = await screen.findByRole('link', { name: 'Sản phẩm RH-M4T19B' });
    expect(productLink).toHaveAttribute('href', '/moderator/inventory/RH-M4T19B');
    expect(screen.getByText('Cập nhật giá')).toBeInTheDocument();
    expect(screen.getByText('Đang bán')).toBeInTheDocument();

    expect(screen.getByText('Yêu cầu trả hàng RH-000123')).toBeInTheDocument();
    expect(screen.getByText('Xử lý món hàng hoàn trả')).toBeInTheDocument();
    expect(screen.getByText('Đăng bán lại')).toBeInTheDocument();

    const formLink = screen.getByRole('link', { name: 'Phiếu ký gửi CF-0009' });
    expect(formLink).toHaveAttribute('href', '/moderator/consignments/CF-0009');
    expect(screen.getByText('Trả hàng tại chỗ')).toBeInTheDocument();
    expect(screen.getByText('Đã trả tại quầy')).toBeInTheDocument();

    // Unknown enums never leak raw English values
    expect(screen.getByText('Không xác định ID-9')).toBeInTheDocument();
    expect(screen.queryByText(/NEW_BACKEND_ENTITY/)).not.toBeInTheDocument();
    expect(screen.queryByText('NEW_BACKEND_ACTION')).not.toBeInTheDocument();
    expect(screen.queryByText('NEW_BACKEND_RESULT')).not.toBeInTheDocument();
    expect(screen.queryByText(/^PRODUCT /)).not.toBeInTheDocument();
    expect(screen.queryByText(/^CONSIGNMENT_FORM /)).not.toBeInTheDocument();
  });
});
