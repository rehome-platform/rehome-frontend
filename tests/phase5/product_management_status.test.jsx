import React from 'react';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUS_FALLBACK,
  PRODUCT_TABS,
  WAREHOUSE_REASON,
  WAREHOUSE_UNCLASSIFIED_LABEL,
  productStatusKey,
  productStatusLabelByKey,
  resolveProductStatusLabel,
  warehouseReasonOf,
} from '../../src/constants/productStatus.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import WarehouseInventoryPage from '../../src/features/moderator/pages/WarehouseInventoryPage.jsx';
import { WORK_TYPES } from '../../src/features/moderator/pages/ConsignmentQueuePage.config.js';
import { QUEUE_TYPE_LABELS } from '../../src/features/moderator/models/queueModel.js';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import AuthContext from '../../src/context/AuthContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function ModeratorWrapper({ initialEntries = ['/moderator/inventory'], children }) {
  return (
    <AuthContext.Provider value={{ user: { role: 'MODERATOR', fullName: 'Mod Test' }, loading: false }}>
      <ToastProvider>
        <Phase2Provider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </Phase2Provider>
      </ToastProvider>
    </AuthContext.Provider>
  );
}

describe('productStatus constants and helpers', () => {
  it('maps all 9 single ProductStatus enums to exact Vietnamese labels', () => {
    expect(PRODUCT_STATUS_LABELS).toEqual({
      ON_SALE: 'Đang bán',
      RESERVED: 'Đang giữ giỏ',
      SOLD: 'Đã bán',
      RETURNED: 'Chờ phân loại hoàn',
      WITHDRAWN: 'Đã hoàn trả người bán',
      UNCLAIMED: 'Quá hạn nhận lại',
      PLATFORM_OWNED: 'Tài sản nền tảng',
      DONATED: 'Đã quyên góp',
      DESTROYED: 'Đã tiêu hủy',
    });
  });

  it('defines 9 tabs in the agreed order', () => {
    expect(PRODUCT_TABS.map((t) => t.label)).toEqual([
      'Đang bán',
      'Đang giữ giỏ',
      'Đã bán',
      'Chờ phân loại hoàn',
      'Hàng xuống cấp',
      'Hết hạn ký gửi',
      'Đã hoàn trả người bán',
      'Quá hạn nhận lại',
      'Tài sản nền tảng / Đã xử lý',
    ]);
  });

  it('resolves WAREHOUSE by business reason and falls back cleanly for unknown/null/undefined', () => {
    expect(resolveProductStatusLabel({ status: 'WAREHOUSE', warehouseReason: WAREHOUSE_REASON.DEGRADED })).toBe('Hàng xuống cấp');
    expect(resolveProductStatusLabel({ status: 'WAREHOUSE', warehouseReason: WAREHOUSE_REASON.TERM_EXPIRED })).toBe('Hết hạn ký gửi');
    expect(resolveProductStatusLabel({ status: 'WAREHOUSE', warehouseReason: WAREHOUSE_REASON.NEGOTIATING })).toBe('Đang thương lượng');
    expect(resolveProductStatusLabel({ status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_APPROVAL' })).toBe('Chờ duyệt rút hàng');
    expect(resolveProductStatusLabel({ status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_PICKUP' })).toBe('Chờ nhận lại');
    expect(resolveProductStatusLabel({ status: 'WITHDRAWN', activeWithdrawalStatus: 'PENDING_PICKUP' })).toBe('Chờ nhận lại');
    expect(resolveProductStatusLabel({ status: 'WITHDRAWN', activeWithdrawalStatus: null })).toBe('Đã hoàn trả người bán');
    expect(resolveProductStatusLabel({ status: 'WAREHOUSE' })).toBe(WAREHOUSE_UNCLASSIFIED_LABEL);

    expect(resolveProductStatusLabel({ status: 'UNKNOWN_ENUM' })).toBe(PRODUCT_STATUS_FALLBACK);
    expect(resolveProductStatusLabel({ status: null })).toBe(PRODUCT_STATUS_FALLBACK);
    expect(resolveProductStatusLabel({ status: undefined })).toBe(PRODUCT_STATUS_FALLBACK);
    expect(resolveProductStatusLabel(null)).toBe(PRODUCT_STATUS_FALLBACK);
    expect(productStatusLabelByKey('RAW_ENGLISH_ENUM')).toBe(PRODUCT_STATUS_FALLBACK);
    expect(productStatusKey({ status: 'WAREHOUSE', warehouseReason: 'TERM_EXPIRED' })).toBe('WAREHOUSE_TERM_EXPIRED');
    expect(productStatusKey({ status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_APPROVAL' })).toBe('WAREHOUSE_WITHDRAWAL_PENDING_APPROVAL');
    expect(productStatusKey({ status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_PICKUP' })).toBe('WAREHOUSE_WITHDRAWAL_PENDING_PICKUP');
    expect(productStatusKey({ status: 'WITHDRAWN', activeWithdrawalStatus: 'PENDING_PICKUP' })).toBe('WAREHOUSE_WITHDRAWAL_PENDING_PICKUP');
  });

  it('derives warehouseReasonOf from activeWithdrawalStatus and EndOfTermDecision/negotiation fields', () => {
    expect(warehouseReasonOf({ status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_APPROVAL' })).toBe('WITHDRAWAL_PENDING_APPROVAL');
    expect(warehouseReasonOf({ status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_PICKUP' })).toBe('WITHDRAWAL_PENDING_PICKUP');
    expect(warehouseReasonOf({ status: 'WAREHOUSE', pricingEligible: true })).toBe('NEGOTIATING');
    expect(warehouseReasonOf({ status: 'WAREHOUSE', reConsignStatus: 'PROPOSAL_SENT' })).toBe('NEGOTIATING');
    expect(warehouseReasonOf({ status: 'WAREHOUSE', decisionId: 'dec-1' })).toBe('TERM_EXPIRED');
    expect(warehouseReasonOf({ status: 'WAREHOUSE' })).toBeUndefined();
    expect(warehouseReasonOf({ status: 'ON_SALE', decisionId: 'dec-1' })).toBeUndefined();
  });
});

describe('inventoryService.list TERM_EXPIRED and PLATFORM_FINAL', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('TERM_EXPIRED reuses end-of-term WAREHOUSE logic and excludes degraded/WITHDRAWN/UNCLAIMED', async () => {
    const requestedStatuses = [];
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        requestedStatuses.push(status);
        if (status === 'WAREHOUSE') {
          return HttpResponse.json({
            content: [
              { id: 'SKU-EXP', name: 'Áo hết hạn', status: 'WAREHOUSE' },
              { id: 'SKU-DEG', name: 'Áo xuống cấp', status: 'WAREHOUSE' },
              { id: 'SKU-NEG', name: 'Áo thương lượng', status: 'WAREHOUSE' },
              { id: 'SKU-WDR', name: 'Áo đang rút', status: 'WAREHOUSE', activeWithdrawalStatus: 'PENDING_APPROVAL' },
            ],
            totalElements: 4,
            totalPages: 1,
          });
        }
        return HttpResponse.json({ content: [], totalElements: 0, totalPages: 0 });
      }),
      http.get(`${API_BASE_URL}/products/:sku`, ({ params }) => {
        if (params.sku === 'SKU-EXP') {
          return HttpResponse.json({ id: 'SKU-EXP', name: 'Áo hết hạn', status: 'WAREHOUSE', decisionId: 'dec-1' });
        }
        if (params.sku === 'SKU-NEG') {
          return HttpResponse.json({ id: 'SKU-NEG', name: 'Áo thương lượng', status: 'WAREHOUSE', decisionId: 'dec-2' });
        }
        return HttpResponse.json({ id: 'SKU-DEG', name: 'Áo xuống cấp', status: 'WAREHOUSE' });
      }),
      http.get(`${API_BASE_URL}/end-of-term-decisions/pending-pricing`, () =>
        HttpResponse.json([{ decisionId: 'dec-2', productId: 'SKU-NEG', productName: 'Áo thương lượng', currentPrice: 120000 }]),
      ),
    );

    const res = await inventoryService.list({ status: 'TERM_EXPIRED', page: 0, size: 20 });
    expect(requestedStatuses).toEqual(['WAREHOUSE']);
    expect(res.items.map((i) => i.sku)).toEqual(['SKU-EXP', 'SKU-NEG']);
    expect(res.items[0].warehouseReason).toBe('TERM_EXPIRED');
    expect(res.items[1].warehouseReason).toBe('NEGOTIATING');
  });

  it('PLATFORM_FINAL concatenates PLATFORM_OWNED, DONATED, DESTROYED with offset pagination', async () => {
    const datasets = {
      PLATFORM_OWNED: Array.from({ length: 5 }, (_, i) => ({ id: `PO-${i + 1}`, name: `PO ${i + 1}`, status: 'PLATFORM_OWNED' })),
      DONATED: Array.from({ length: 3 }, (_, i) => ({ id: `DN-${i + 1}`, name: `DN ${i + 1}`, status: 'DONATED' })),
      DESTROYED: Array.from({ length: 4 }, (_, i) => ({ id: `DS-${i + 1}`, name: `DS ${i + 1}`, status: 'DESTROYED' })),
    };

    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const page = Number(url.searchParams.get('page') || 0);
        const size = Number(url.searchParams.get('size') || 20);
        const all = datasets[status] || [];
        return HttpResponse.json({
          content: all.slice(page * size, (page + 1) * size),
          totalElements: all.length,
          totalPages: Math.ceil(all.length / size),
        });
      }),
    );

    const page0 = await inventoryService.list({ status: 'PLATFORM_FINAL', page: 0, size: 4 });
    expect(page0.totalElements).toBe(12);
    expect(page0.totalPages).toBe(3);
    expect(page0.items.map((i) => i.sku)).toEqual(['PO-1', 'PO-2', 'PO-3', 'PO-4']);

    const page1 = await inventoryService.list({ status: 'PLATFORM_FINAL', page: 1, size: 4 });
    expect(page1.items.map((i) => i.sku)).toEqual(['PO-5', 'DN-1', 'DN-2', 'DN-3']);

    const page2 = await inventoryService.list({ status: 'PLATFORM_FINAL', page: 2, size: 4 });
    expect(page2.items.map((i) => i.sku)).toEqual(['DS-1', 'DS-2', 'DS-3', 'DS-4']);
  });
});

describe('WarehouseInventoryPage UI & QueueType coverage', () => {
  it('renders page title "Quản lý sản phẩm", 9 status tabs + "Tất cả", and Vietnamese status badges', async () => {
    const queried = [];
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status') || '';
        queried.push(status);
        return HttpResponse.json({
          content: [
            { id: 'SKU-1', name: 'Đầm linen', status: status || 'RETURNED', currentTerm: 1, daysIntoTerm: 5, currentPrice: 200000 },
          ],
          totalElements: 1,
          totalPages: 1,
        });
      }),
    );

    render(
      <ModeratorWrapper>
        <WarehouseInventoryPage />
      </ModeratorWrapper>,
    );

    expect(screen.getByRole('heading', { name: /Quản lý sản phẩm/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
    for (const tab of PRODUCT_TABS) {
      expect(screen.getByRole('button', { name: tab.label })).toBeInTheDocument();
    }

    await waitFor(() => {
      expect(screen.getByText('Đầm linen')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Chờ phân loại hoàn').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('RETURNED')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đang giữ giỏ' }));
    await waitFor(() => {
      expect(queried).toContain('RESERVED');
    });
  });

  it('covers all 12 backend QueueType values including RETURN_SHIP_BACK, DONATION_PREP and LEGAL_CHANGE', () => {
    const backendQueueTypes = [
      'FORM_REVIEW',
      'INSPECTION',
      'PACKING',
      'RETURN',
      'RETURN_SHIP_BACK',
      'ORG_VERIFICATION',
      'LEGAL_CHANGE',
      'VIOLATION_REPORT',
      'WITHDRAWAL',
      'DONATION_PICKUP',
      'DONATION_REASSIGN',
      'DONATION_PREP',
    ];
    const uiKeys = WORK_TYPES.map((t) => t.key);
    for (const key of backendQueueTypes) {
      expect(uiKeys).toContain(key);
      expect(QUEUE_TYPE_LABELS[key]).toBeTruthy();
    }
  });
});
