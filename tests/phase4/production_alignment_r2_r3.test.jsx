import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  canPack,
  canShip,
  normalizePackingOrder,
} from '../../src/features/moderator/models/packingModel.js';
import { queueService } from '../../src/features/moderator/services/queueApi.js';
import { warehouseHistoryService } from '../../src/features/moderator/services/warehouseHistoryApi.js';
import { WarehouseHistoryTabs } from '../../src/features/moderator/components/WarehouseHistoryTabs.jsx';
import { WaybillPrintModal } from '../../src/features/moderator/components/packing/WaybillPrintModal.jsx';
import { PackingDetail } from '../../src/features/moderator/pages/PackingOrdersPage.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { packingService } from '../../src/features/moderator/services/packingApi.js';
import { callBackend } from '../../src/features/moderator/services/warehouseTransport.js';
import { orderFixture, scope } from './fixtures.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-a', warehouseId: 'warehouse-a' },
    isAuthenticated: true,
  }),
}));

vi.mock('../../src/features/moderator/services/warehouseTransport.js', () => ({
  callBackend: vi.fn(),
}));

describe('Requirement R2: Moderator Packing Gating & Timing Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks canShip and canPack when order status is invalid (CANCELLED, DELIVERED, COMPLETED)', () => {
    const base = orderFixture();
    base.scannedProductIds = ['sku-a', 'SKU-B'];
    base.scannedCount = 2;
    base.totalCount = 2;

    for (const invalidStatus of ['CANCELLED', 'DELIVERED', 'COMPLETED', 'PENDING_PAYMENT']) {
      const order = { ...base, status: invalidStatus };
      expect(canShip(order, scope)).toBe(false);
      expect(canPack(order, scope)).toBe(false);
    }
  });

  it('permits canShip and canPack when order status is PAID or PACKING', () => {
    const base = orderFixture();
    base.scannedProductIds = ['sku-a', 'SKU-B'];
    base.scannedCount = 2;
    base.totalCount = 2;

    for (const validStatus of ['PAID', 'PACKING']) {
      const order = { ...base, status: validStatus };
      expect(canShip(order, scope)).toBe(true);
      expect(canPack(order, scope)).toBe(true);
    }
  });

  it('normalizes order with explicit shipmentCreatedAt and expectedDeliveryDate properties', () => {
    const normalizedDefault = normalizePackingOrder({ id: 'ord-1' }, scope);
    expect(normalizedDefault.shipmentCreatedAt).toBeNull();
    expect(normalizedDefault.expectedDeliveryDate).toBeNull();
    expect(normalizedDefault.status).toBe('PAID');

    const normalizedWithDates = normalizePackingOrder(
      {
        id: 'ord-2',
        shipmentCreatedAt: '2026-11-14T05:00:00Z',
        expectedDeliveryDate: '2026-11-16T10:00:00Z',
      },
      scope
    );
    expect(normalizedWithDates.shipmentCreatedAt).toBe('2026-11-14T05:00:00Z');
    expect(normalizedWithDates.expectedDeliveryDate).toBe('2026-11-16T10:00:00Z');
  });

  it('auto-computes waitingMinutes and fallbacks orderCreatedAt in queueService.list', async () => {
    const now = Date.now();
    const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();

    callBackend.mockResolvedValue([
      {
        id: 'q-1',
        createdAt: tenMinutesAgo,
        orderCreatedAt: null,
        waitingMinutes: null,
      },
      {
        id: 'q-2',
        orderCreatedAt: tenMinutesAgo,
        waitingMinutes: 15, // Explicit value should be preserved
      },
    ]);

    const items = await queueService.list({ type: 'PACKING' });
    const item1 = items.find((i) => i.id === 'q-1');
    const item2 = items.find((i) => i.id === 'q-2');

    expect(item1.orderCreatedAt).toBe(tenMinutesAgo);
    expect(item1.waitingMinutes).toBeGreaterThanOrEqual(9);
    expect(item1.waitingMinutes).toBeLessThanOrEqual(11);

    expect(item2.orderCreatedAt).toBe(tenMinutesAgo);
    expect(item2.waitingMinutes).toBe(15);
  });

  it('renders unclaim (Nhả việc) action in PackingDetail header when claimed by current moderator', async () => {
    const order = {
      ...orderFixture(),
      id: 'ord-unclaim',
      orderId: 'ord-unclaim',
      queueId: 'queue-unclaim',
      claimedBy: scope.userId,
      warehouseId: scope.warehouseId,
      status: 'PAID',
      ghnTrackingCode: null,
    };

    vi.spyOn(packingService, 'read').mockResolvedValue(order);
    const releaseSpy = vi.spyOn(queueService, 'release').mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={['/moderator/packing?orderId=ord-unclaim']}>
        <Phase2Provider>
          <PackingDetail orderId="ord-unclaim" />
        </Phase2Provider>
      </MemoryRouter>
    );

    const unclaimBtn = await screen.findByRole('button', { name: 'Nhả việc' });
    expect(unclaimBtn).toBeInTheDocument();

    fireEvent.click(unclaimBtn);
    await waitFor(() => expect(releaseSpy).toHaveBeenCalledWith('queue-unclaim'));
  });
});

describe('Requirement R3: Warehouse Activity History & GHN A5 Printing Alignment', () => {
  it('renders dual-schema Spring backend DTO in WarehouseHistoryTabs with target link and translated action', async () => {
    vi.spyOn(warehouseHistoryService, 'list').mockResolvedValue({
      content: [
        {
          timestamp: '2026-11-14T03:30:00Z',
          target: 'ORDER DH-00244',
          action: 'CREATE_SHIPMENT',
          actor: 'mod@rehome.vn',
          result: 'SUCCESS',
        },
        {
          timestamp: '2026-11-14T04:00:00Z',
          target: 'CONSIGNMENT_FORM CF-0012',
          action: 'STOCK_IN',
          actor: 'Nhân viên kho Q7',
          result: 'APPROVED',
        },
      ],
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={['/moderator/packing?view=history']}>
        <Phase2Provider>
          <WarehouseHistoryTabs type="PACKING">
            <p>Tab công việc</p>
          </WarehouseHistoryTabs>
        </Phase2Provider>
      </MemoryRouter>
    );

    expect(await screen.findByText('ORDER DH-00244')).toBeInTheDocument();
    const orderLink = screen.getByRole('link', { name: 'ORDER DH-00244' });
    expect(orderLink).toHaveAttribute('href', '/moderator/packing?orderId=DH-00244');

    expect(screen.getByText('Tạo vận đơn GHN')).toBeInTheDocument();
    expect(screen.getByText('mod@rehome.vn')).toBeInTheDocument();

    expect(screen.getByText('CONSIGNMENT_FORM CF-0012')).toBeInTheDocument();
    const formLink = screen.getByRole('link', { name: 'CONSIGNMENT_FORM CF-0012' });
    expect(formLink).toHaveAttribute('href', '/moderator/consignments/CF-0012');
    expect(screen.getByText('Nhập kho')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên kho Q7')).toBeInTheDocument();
  });

  it('safely catches non-URL values in WaybillPrintModal without throwing unhandled TypeError', async () => {
    const order = { id: 'ord-bad-url', ghnTrackingCode: 'GHN-REAL', items: [] };

    vi.spyOn(packingService, 'read').mockResolvedValue(order);
    vi.spyOn(packingService, 'label').mockResolvedValue({
      size: 'A5',
      printUrl: 'not-a-valid-url-string',
    });

    const popup = { opener: {}, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup);

    render(
      <Phase2Provider>
        <WaybillPrintModal isOpen order={order} onClose={() => {}} />
      </Phase2Provider>
    );

    const printButton = await screen.findByRole('button', { name: 'In vận đơn A5' });
    fireEvent.click(printButton);

    expect(
      await screen.findByText('Đường dẫn phiếu A5 từ GHN không hợp lệ.')
    ).toBeInTheDocument();

    expect(popup.close).toHaveBeenCalled();
  });
});
