export const TRYON_SLOT_CONFIG = {
  TOP: {
    code: 'TOP',
    label: 'Áo (TOP)',
    description: 'Áo thun, sơ mi, áo khoác, áo len, áo kiểu...',
    badgeClass: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  },
  BOTTOM: {
    code: 'BOTTOM',
    label: 'Quần / Váy (BOTTOM)',
    description: 'Quần jeans, quần tây, quần short, chân váy...',
    badgeClass: 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]',
  },
  DRESS: {
    code: 'DRESS',
    label: 'Đầm / Liền thân (DRESS)',
    description: 'Đầm dạ hội, váy liền, jumpsuit, áo dài...',
    badgeClass: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
  },
};

export const SUPPORTED_TRYON_SLOTS = ['TOP', 'BOTTOM', 'DRESS'];

export function normalizeTryOnSlot(itemOrSlot) {
  const raw =
    typeof itemOrSlot === 'string'
      ? itemOrSlot
      : itemOrSlot?.tryonSlot || itemOrSlot?.slot || '';
  const upper = String(raw || '').trim().toUpperCase();
  return SUPPORTED_TRYON_SLOTS.includes(upper) ? upper : '';
}

export function inferTryOnSlotFromName(name = '') {
  const normalized = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (/(đầm|váy liền|jumpsuit|áo dài|liền thân)/i.test(normalized)) return 'DRESS';
  if (/(quần|chân váy|jeans|kaki|short|jogger|legging|culottes|skirt|pants|trouser)/i.test(normalized)) return 'BOTTOM';
  if (/(áo|sơ mi|thun|polo|hoodie|blazer|khoác|cardigan|sweater|gile|shirt|jacket)/i.test(normalized)) return 'TOP';
  return null;
}

export function groupCategoriesBySlot(categories = []) {
  const hasAnySlot = categories.some((item) => Boolean(normalizeTryOnSlot(item)));
  if (!hasAnySlot) {
    return [{ key: 'ALL', label: null, items: categories }];
  }
  const groups = SUPPORTED_TRYON_SLOTS.map((slot) => ({
    key: slot,
    label: TRYON_SLOT_CONFIG[slot]?.label || slot,
    items: categories.filter((item) => normalizeTryOnSlot(item) === slot),
  }));
  const other = categories.filter((item) => !normalizeTryOnSlot(item));
  if (other.length > 0) {
    groups.push({ key: 'OTHER', label: 'Khác / Chưa phân slot', items: other });
  }
  return groups.filter((group) => group.items.length > 0);
}

export function formatTryOnSlot(slot) {
  if (!slot) {
    return {
      code: '',
      label: 'Không xác định',
      description: '',
      badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    };
  }
  const key = String(slot).toUpperCase();
  return (
    TRYON_SLOT_CONFIG[key] || {
      code: key,
      label: `Slot ${slot}`,
      description: '',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    }
  );
}

export function validateCatalogInput(kind, data = {}) {
  const { name, tryonSlot, slot } = data;
  const trimmedName = String(name || '').trim().replace(/\s+/g, ' ');

  if (!trimmedName) {
    return {
      valid: false,
      message: `Vui lòng nhập tên ${kind === 'category' ? 'danh mục' : 'thương hiệu'}.`,
    };
  }
  if (trimmedName.length > 255) {
    return {
      valid: false,
      message: 'Tên không được vượt quá 255 ký tự.',
    };
  }

  if (kind === 'category') {
    const rawSlot = tryonSlot || slot;
    const selectedSlot = String(rawSlot || '').toUpperCase();
    if (!SUPPORTED_TRYON_SLOTS.includes(selectedSlot)) {
      return {
        valid: false,
        message: 'Slot thử đồ AI phải là TOP, BOTTOM hoặc DRESS.',
      };
    }
    return {
      valid: true,
      value: { name: trimmedName, tryonSlot: selectedSlot },
    };
  }

  return {
    valid: true,
    value: { name: trimmedName },
  };
}

export function filterCatalogItems(items = [], keyword = '') {
  if (!keyword || !keyword.trim()) return items;
  const term = keyword.trim().toLowerCase();
  return items.filter((item) => {
    const name = String(item.name || '').toLowerCase();
    const slot = String(item.slot || item.tryonSlot || '').toLowerCase();
    return name.includes(term) || slot.includes(term);
  });
}
