function entries(response) {
  return Array.isArray(response) ? response : response?.result || [];
}

function category(item) {
  return { ...brand(item), slot: item.tryonSlot, tryonSlot: item.tryonSlot };
}

function brand(item) {
  return { id: item.id, name: item.name, hidden: item.status === 'HIDDEN', status: item.status || 'ACTIVE' };
}

function uniqueSorted(active, hidden, normalize) {
  const map = new Map();
  for (const item of [...entries(active), ...entries(hidden)]) {
    if (!map.has(item.id)) map.set(item.id, normalize(item));
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export function catalogResult([catsActive, catsHidden, brandsActive, brandsHidden]) {
  return {
    categories: uniqueSorted(catsActive, catsHidden, category),
    brands: uniqueSorted(brandsActive, brandsHidden, brand),
  };
}

function catalogStatus(data) {
  if (data.status) return data.status;
  if (data.hidden === false) return 'ACTIVE';
  if (data.hidden === true) return 'HIDDEN';
  return undefined;
}

export function catalogPayload(kind, id, data) {
  const name = data.name ? String(data.name).trim().replace(/\s+/g, ' ') : '';
  const status = catalogStatus(data);
  const payload = { name, ...(id && status ? { status } : {}) };
  if (kind === 'category') payload.tryonSlot = data.tryonSlot || data.slot || 'TOP';
  return payload;
}
