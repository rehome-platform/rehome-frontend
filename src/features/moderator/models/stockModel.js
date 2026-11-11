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
