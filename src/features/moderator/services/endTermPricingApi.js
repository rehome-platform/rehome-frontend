import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { getUser } from '../../../services/baseApi.js';
import { callBackend } from './warehouseTransport.js';

export async function pendingPricing(options = {}) {
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (isFixtureMode) {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    const user = getUser() || {};
    return fixtureRequest('endTermPendingPricing', {
      ...options,
      scope: { userId: user.accountId || user.id || 'mod-qa', warehouseId: user.warehouseId || 'warehouse-a', ...options.scope },
    });
  }
  const result = await callBackend({ method: 'get', url: API_ENDPOINTS.MODERATOR.PENDING_PRICING }, { signal: options.signal });
  return Array.isArray(result) ? result : (result?.content || []);
}

export function pricingForProduct(rows, productId) {
  const target = String(productId || '').trim().toUpperCase();
  if (!target || !Array.isArray(rows)) return null;
  return (
    rows.find((row) => {
      const candidate = String(row?.productId || row?.sku || '').trim().toUpperCase();
      return Boolean(candidate) && candidate === target;
    }) || null
  );
}
