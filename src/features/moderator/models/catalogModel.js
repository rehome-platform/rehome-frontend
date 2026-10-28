export const TRYON_SLOT_CONFIG = {
  TOP: {
    code: 'TOP',
    label: 'Áo (TOP)',
    description: 'Áo thun, sơ mi, áo khoác, áo len, áo kiểu...',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  BOTTOM: {
    code: 'BOTTOM',
    label: 'Quần / Váy (BOTTOM)',
    description: 'Quần jeans, quần tây, quần short, chân váy...',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  DRESS: {
    code: 'DRESS',
    label: 'Đầm / Liền thân (DRESS)',
    description: 'Đầm dạ hội, váy liền, jumpsuit, áo dài...',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export const SUPPORTED_TRYON_SLOTS = ['TOP', 'BOTTOM', 'DRESS'];

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
