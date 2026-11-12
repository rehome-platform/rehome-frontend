import { DEFAULT_SYSTEM_CONFIGS, readEffectiveConsignmentConfig } from '../../../configs/systemParams.config.js';

export function normalizeProductResponse(res) {
  if (!res) return null;
  const sku = res.id || res.sku || '';
  return {
    ...res,
    sku,
    id: sku,
    name: res.name || '',
    status: res.status || 'ON_SALE',
  };
}

function normalizePercent(value, fallback) {
  if (value == null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num <= 1 ? Number((num * 100).toPrecision(15)) : num;
}

/**
 * Resolves term length, commission percentages, and floor price for an inventory product
 * using product-level receipt snapshot fields first, then cached admin system config,
 * and finally DEFAULT_SYSTEM_CONFIGS.
 */
export function resolveInventoryTermAndRates(data, effectiveConfig = readEffectiveConsignmentConfig()) {
  const currentTerm = Number(data?.currentTerm) || 1;
  const daysIntoTerm = Number(data?.daysIntoTerm) || 1;
  const termLengthDays =
    Number(data?.termLengthDays) ||
    Number(effectiveConfig?.termLengthDays) ||
    DEFAULT_SYSTEM_CONFIGS.consignment.termDays;

  const commissionTerm1 = normalizePercent(
    data?.commissionRateTerm1 ?? effectiveConfig?.commissionTerm1,
    DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm1,
  );
  const commissionTerm2 = normalizePercent(
    data?.commissionRateTerm2 ?? effectiveConfig?.commissionTerm2,
    DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm2,
  );
  const commissionTerm3 = normalizePercent(
    data?.commissionRateTerm3 ?? effectiveConfig?.commissionTerm3,
    DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.commissionTerm3,
  );

  const termRate =
    currentTerm >= 3 ? commissionTerm3 : currentTerm === 2 ? commissionTerm2 : commissionTerm1;
  const commissionPercent =
    data?.commissionRate != null
      ? normalizePercent(data.commissionRate, termRate)
      : data?.currentCommissionRate != null
        ? normalizePercent(data.currentCommissionRate, termRate)
        : termRate;

  const floorPricePercent = normalizePercent(
    data?.floorPriceRatio ?? effectiveConfig?.floorPricePercent,
    DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.floorPricePercent,
  );

  const degradedCompensationRatePercent = normalizePercent(
    data?.degradedCompensationRate ?? effectiveConfig?.degradedCompensationRate,
    DEFAULT_SYSTEM_CONFIGS.pricingAndCommission.degradedCompensationRate,
  );

  const sellingPrice = data?.currentPrice ?? data?.agreedPrice;
  const floorPrice =
    data?.floorPrice != null
      ? data.floorPrice
      : sellingPrice != null
        ? Math.round(Number(sellingPrice) * (floorPricePercent / 100))
        : null;

  return {
    currentTerm,
    daysIntoTerm,
    termLengthDays,
    commissionPercent,
    commissionTerm1,
    commissionTerm2,
    commissionTerm3,
    floorPricePercent,
    floorPrice,
    degradedCompensationRatePercent,
  };
}
