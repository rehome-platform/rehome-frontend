/** Frontend view models; service boundary must map reviewed wire DTOs to these shapes.
 * @typedef {{queueId: string, formId: string, type: string, claimedBy: ?string, status: string}} QueueItem
 * @typedef {{memberId: string, memberCode: string, fullName: string, avatarUrl?: string}} Member
 * @typedef {{receiptId: string, formId: string, confirmedAt: ?string, snapshot: object, productSku?: string}} Receipt
 * @typedef {{sku: string, receiptId: string, warehouseId: string, photos: Array<object>}} Product
 */
export function unwrap(response) {
  if (response.status === 204 || response.data === '') return null;
  const body = response.data;
  if (body && Object.hasOwn(body, 'data')) return body.data;
  if (body && Object.hasOwn(body, 'result')) return body.result;
  return body ?? null;
}

export class Phase2Error extends Error {
  constructor(message, status = 0, code = '', fields = {}) {
    super(message);
    this.name = 'Phase2Error';
    Object.assign(this, { status, code, fields });
  }
}

export function normalizeError(error) {
  if (error instanceof Phase2Error) return error;
  const body = error.response?.data ?? {};
  const status = error.response?.status ?? 0;
  const messages = {
    403: 'Bạn không có quyền truy cập dữ liệu của kho này.',
    404: 'Không tìm thấy dữ liệu.',
    409: 'Dữ liệu đã thay đổi. Vui lòng kiểm tra trạng thái mới.',
    422: 'Vui lòng kiểm tra thông tin nhập.',
  };
  return new Phase2Error(
    messages[status] ||
      body.message ||
      'Không thể kết nối máy chủ. Hãy tải lại trạng thái trước khi thử tiếp.',
    status,
    body.code || '',
    body.fieldErrors || body.errors || {},
  );
}

export function listItems(data) {
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.pendingForms || data?.pendingWithdrawals || data?.pendingEndOfTerm) {
    return [
      ...(data.pendingForms || []),
      ...(data.pendingWithdrawals || []),
      ...(data.pendingEndOfTerm || []),
    ];
  }
  return [];
}

export function normalizeMemberTasks(data) {
  if (!data) {
    return { pendingForms: [], pendingWithdrawals: [], pendingEndOfTerm: [], totalCount: 0 };
  }
  if (Array.isArray(data)) {
    const pendingForms = data.map((item) => ({
      ...item,
      id: item.id || item.formId,
      formId: item.formId || item.id,
      productName: item.productName || item.name || '',
      name: item.name || item.productName || '',
    }));
    return {
      pendingForms,
      pendingWithdrawals: [],
      pendingEndOfTerm: [],
      totalCount: pendingForms.length,
    };
  }
  const pendingForms = (data.pendingForms || []).map((f) => ({
    ...f,
    id: f.id || f.formId,
    formId: f.id || f.formId,
    name: f.productName || f.name || '',
    productName: f.productName || f.name || '',
  }));
  const pendingWithdrawals = (data.pendingWithdrawals || []).map((w) => ({
    ...w,
    id: w.id || w.refId,
    refId: w.id || w.refId,
  }));
  const pendingEndOfTerm = (data.pendingEndOfTerm || []).map((e) => ({
    ...e,
    id: e.id || e.refId,
    refId: e.id || e.refId,
  }));
  return {
    pendingForms,
    pendingWithdrawals,
    pendingEndOfTerm,
    totalCount: pendingForms.length + pendingWithdrawals.length + pendingEndOfTerm.length,
  };
}
export function validMoney(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}
export function extractReceiptId(receipt) {
  if (!receipt) return null;
  return receipt.receiptId || receipt.id || null;
}

export function canStockIn(receipt) {
  return !!receipt?.confirmedAt && !receipt?.productSku && !receipt?.sku;
}

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
export function ownsClaim(item, userId) {
  if (!userId || !item) return false;
  const claimed =
    typeof item.claimedBy === 'object' && item.claimedBy !== null
      ? item.claimedBy.id || item.claimedBy.accountId
      : item.claimedBy;
  if (!claimed) return false;
  return String(claimed).trim().toLowerCase() === String(userId).trim().toLowerCase();
}
export function lookupParams(kind, value) {
  if (!['memberCode', 'phone', 'qrPayload'].includes(kind) || !value?.trim())
    throw new Phase2Error('Nhập thông tin tra cứu hợp lệ.', 422);
  return { [kind]: value.trim() };
}
export function safeDocumentUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function warehouseOf(user) {
  return {
    id: user?.warehouseId ?? user?.warehouse?.id ?? null,
    name: user?.warehouseName ?? user?.warehouse?.name ?? '',
  };
}

export function normalizeConsignmentForm(data, currentUserId) {
  if (!data) return null;
  const status = data.status || 'PENDING';
  let allowedActions = [];
  if (status === 'PENDING') {
    allowedActions = ['APPROVE', 'REJECT'];
  } else if (status === 'APPROVED') {
    allowedActions = ['START_INSPECTION'];
  } else if (status === 'INSPECTING') {
    allowedActions = ['COMPLETE_INSPECTION', 'RETURN_ONSITE'];
  }

  const rawPhotos = data.photos || data.photoUrls || [];
  const photos = Array.isArray(rawPhotos)
    ? rawPhotos.map((p) => (typeof p === 'string' ? { url: p } : p))
    : [];

  return {
    ...data,
    id: data.id || data.formId,
    formId: data.formId || data.id,
    name: data.name || data.productName || 'Sản phẩm ký gửi',
    productName: data.productName || data.name || 'Sản phẩm ký gửi',
    status,
    allowedActions: data.allowedActions || allowedActions,
    claimedBy: data.claimedBy ?? currentUserId ?? null,
    photos,
    desiredPrice: Number(data.desiredPrice || 0),
    bringDeadline: data.bringInDeadline || data.bringDeadline || null,
    rejectReason: data.rejectReason || null,
    receiptId: data.receiptId || null,
  };
}

export function canCompleteInspection(checklistObj, totalRequired, price, term, conditionNote) {
  const checkedCount = Object.values(checklistObj || {}).filter(Boolean).length;
  return (
    checkedCount === totalRequired &&
    validMoney(price) &&
    Boolean(term) &&
    Boolean(conditionNote && String(conditionNote).trim())
  );
}

/**
 * Định cấu hình nhãn và style hiển thị cho các loại biến động kho (StockMovementType)
 */
export const STOCK_MOVEMENT_CONFIG = {
  STOCK_IN: { label: 'Nhập kho ban đầu', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  SHELF_MOVE: { label: 'Điều chuyển kệ', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  WITHDRAWAL_OUT: { label: 'Rút hàng trả Member', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  RETURN_IN: { label: 'Nhận hàng trả về kho', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DONATED_OUT: { label: 'Chuyển giao từ thiện', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  DESTROYED: { label: 'Tiêu hủy sản phẩm', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

/**
 * Chuẩn hóa dữ liệu một bản ghi lịch sử biến động kho cho UI
 */
export function formatStockMovement(movement) {
  if (!movement) return null;
  const type = movement.type || movement.movementType || 'SHELF_MOVE';
  const config = STOCK_MOVEMENT_CONFIG[type] || {
    label: type,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  let locationText = '—';
  if (movement.fromLocation && movement.toLocation) {
    locationText = `${movement.fromLocation} → ${movement.toLocation}`;
  } else if (movement.toLocation) {
    locationText = `Kệ ${movement.toLocation}`;
  } else if (movement.shelfLocation) {
    locationText = `Kệ ${movement.shelfLocation}`;
  } else if (movement.partnerName) {
    locationText = `Đối tác: ${movement.partnerName}`;
  }

  return {
    id: movement.id || movement.movementId || null,
    type,
    label: config.label,
    badgeClass: config.color,
    fromLocation: movement.fromLocation || null,
    toLocation: movement.toLocation || movement.shelfLocation || null,
    locationText,
    note: movement.note || null,
    createdAt: movement.createdAt || new Date().toISOString(),
  };
}

/**
 * Kiểm tra tính hợp lệ của vị trí kệ mới trước khi gửi API
 */
export function validateNewShelf(newShelf, currentShelf) {
  const trimmed = String(newShelf || '').trim();
  if (!trimmed) {
    return { valid: false, message: 'Vui lòng nhập vị trí kệ mới.' };
  }
  if (trimmed.length > 255) {
    return { valid: false, message: 'Vị trí kệ không được vượt quá 255 ký tự.' };
  }
  if (currentShelf && trimmed.toLowerCase() === String(currentShelf).trim().toLowerCase()) {
    return { valid: false, message: 'Vị trí kệ mới phải khác vị trí kệ hiện tại.' };
  }
  return { valid: true, value: trimmed };
}

// =========================================================================
// Task 7: Quản lý Danh mục & Thương hiệu (Kèm Slot Thử đồ AI)
// =========================================================================

/**
 * Cấu hình hiển thị Slot thử đồ AI (TryOnSlot)
 */
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

/**
 * Định dạng nhãn và badge hiển thị của Slot thử đồ AI
 */
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

/**
 * Kiểm tra và chuẩn hóa dữ liệu đầu vào cho Danh mục / Thương hiệu
 */
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

/**
 * Lọc danh sách danh mục / thương hiệu theo từ khóa tìm kiếm (không phân biệt hoa thường)
 */
export function filterCatalogItems(items = [], keyword = '') {
  if (!keyword || !keyword.trim()) return items;
  const term = keyword.trim().toLowerCase();
  return items.filter((item) => {
    const name = String(item.name || '').toLowerCase();
    const slot = String(item.slot || item.tryonSlot || '').toLowerCase();
    return name.includes(term) || slot.includes(term);
  });
}


