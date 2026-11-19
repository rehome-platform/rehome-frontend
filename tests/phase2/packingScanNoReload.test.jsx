import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext } from '../../src/context/AuthContext.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { usePackingDetail } from '../../src/features/moderator/hooks/usePackingDetail.jsx';
import { packingService } from '../../src/features/moderator/services/packingApi.js';

function Harness({ orderId, onOrderRender }) {
  const model = usePackingDetail({ orderId, onChanged: () => {} });
  onOrderRender(model.order);
  return (
    <div>
      <div data-testid="order-present">{model.order ? 'YES' : 'NO'}</div>
      <div data-testid="scanned-count">{model.order?.scannedCount ?? -1}</div>
      <button type="button" onClick={() => model.scan('SKU-001')}>
        Scan SKU-001
      </button>
    </div>
  );
}

describe('Task 4: Packing SKU verification without wiping order / reloading page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps order mounted (never null) and updates scanned progress on SKU scan', async () => {
    const initialOrder = {
      id: 'ord-1',
      orderNo: 'RH-001',
      status: 'PACKING',
      warehouseId: 'wh-1',
      claimedBy: 'mod-1',
      claimExpiresAt: new Date(Date.now() + 600000).toISOString(),
      shipmentOutcome: 'NOT_CREATED',
      allowedActions: ['SCAN', 'CREATE_SHIPMENT'],
      scannedProductIds: [],
      scannedCount: 0,
      totalCount: 2,
      items: [
        { id: 'p1', productId: 'p1', sku: 'SKU-001', name: 'Áo sơ mi', scanned: false },
        { id: 'p2', productId: 'p2', sku: 'SKU-002', name: 'Quần tây', scanned: false },
      ],
    };

    const updatedOrder = {
      ...initialOrder,
      scannedProductIds: ['p1'],
      scannedCount: 1,
      items: [
        { ...initialOrder.items[0], scanned: true },
        initialOrder.items[1],
      ],
    };

    let readCount = 0;
    vi.spyOn(packingService, 'read').mockImplementation(async () => {
      readCount += 1;
      if (readCount === 1) return initialOrder;
      // Delay second read slightly to simulate network round-trip
      await new Promise((r) => setTimeout(r, 30));
      return updatedOrder;
    });

    vi.spyOn(packingService, 'scan').mockResolvedValueOnce({
      matched: true,
      scannedCount: 1,
      totalCount: 2,
      scannedProductId: 'p1',
    });

    const seenAfterInitialLoad = [];
    let loadedOnce = false;

    render(
      <AuthContext.Provider value={{ user: { id: 'mod-1', role: 'MODERATOR', warehouseId: 'wh-1' }, isAuthenticated: true }}>
        <Phase2Provider>
          <Harness
            orderId="ord-1"
            onOrderRender={(order) => {
              if (order) loadedOnce = true;
              if (loadedOnce) seenAfterInitialLoad.push(order);
            }}
          />
        </Phase2Provider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('order-present').textContent).toBe('YES');
      expect(screen.getByTestId('scanned-count').textContent).toBe('0');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scan SKU-001' }));

    await waitFor(() => {
      expect(screen.getByTestId('scanned-count').textContent).toBe('1');
    });

    // Order must NEVER have become null after initial load (no unmount/reload flash)
    expect(seenAfterInitialLoad.every((o) => o !== null)).toBe(true);
  });
});
