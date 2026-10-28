import { describe, expect, it } from 'vitest';
import { API_ENDPOINTS, getSockJsUrl, normalizeApiBaseUrl } from '../../src/configs/api.config.js';
import { phase2Contract } from '../../src/features/moderator/config/warehouseContract.js';
import { operationReady, phase4Contract } from '../../src/features/moderator/config/packingContract.js';
import { packingService } from '../../src/features/moderator/services/packingApi.js';

describe('backend API configuration', () => {
  it('trims the backend URL without changing valid path prefixes', () => {
    expect(normalizeApiBaseUrl('  https://example.test///  ')).toBe('https://example.test');
    expect(normalizeApiBaseUrl('https://example.test/api/')).toBe('https://example.test/api');
    expect(getSockJsUrl(normalizeApiBaseUrl(' https://example.test/ '))).toBe('https://example.test/ws');
  });

  it('keeps reserved characters inside Moderator identifiers instead of changing the route', () => {
    const id = 'A/B?type=OTHER# 2';
    expect(API_ENDPOINTS.MODERATOR.PRODUCT_BY_SKU(id)).toBe('/products/A%2FB%3Ftype%3DOTHER%23%202');
    expect(API_ENDPOINTS.MODERATOR.COUNTER_TASKS(id)).toBe('/counter/members/A%2FB%3Ftype%3DOTHER%23%202/tasks');
    expect(API_ENDPOINTS.MODERATOR.SCAN_PACKING_PRODUCT(id)).toBe('/orders/A%2FB%3Ftype%3DOTHER%23%202/pack/scan');
  });

  it('only publishes concrete routes or explicit unsupported operations', () => {
    for (const contract of [phase2Contract, phase4Contract]) {
      for (const operation of Object.values(contract.operations)) {
        if (operation.path) expect(operation.path).not.toMatch(/^\/api\/v1(?:\/|$)/);
        else expect(operation).toMatchObject({ supported: false, reason: expect.any(String) });
      }
    }
    expect(API_ENDPOINTS.MODERATOR.ORDERS_PACKING).toBeUndefined();
    expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/api/auth/login');
    expect(API_ENDPOINTS.ADMIN.DASHBOARD).toBe('/api/admin/dashboard');
  });

  it('enables backend mutations while exposing the missing Moderator order read separately', async () => {
    expect(operationReady('scan')).toBe(true);
    expect(operationReady('shipment')).toBe(true);
    expect(operationReady('handover')).toBe(true);
    expect(operationReady('read')).toBe(false);
    await expect(packingService.read('order-1', {
      scope: { userId: 'mod-1', warehouseId: 'warehouse-1' },
    })).rejects.toMatchObject({ status: 501, code: 'OPERATION_UNSUPPORTED' });
  });
});
