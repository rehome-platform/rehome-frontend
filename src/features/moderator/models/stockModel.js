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

export const STOCK_MOVEMENT_CONFIG = {
  STOCK_IN: { label: 'Nhập kho ban đầu', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  SHELF_MOVE: { label: 'Điều chuyển kệ', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  WITHDRAWAL_OUT: { label: 'Rút hàng trả Member', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  RETURN_IN: { label: 'Nhận hàng trả về kho', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DONATED_OUT: { label: 'Chuyển giao từ thiện', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  DESTROYED: { label: 'Tiêu hủy sản phẩm', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

function movementLocation(movement) {
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

  return locationText;
}

export function formatStockMovement(movement) {
  if (!movement) return null;
  const type = movement.type || movement.movementType || 'SHELF_MOVE';
  const config = STOCK_MOVEMENT_CONFIG[type] || {
    label: type,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return {
    id: movement.id || movement.movementId || null,
    type,
    label: config.label,
    badgeClass: config.color,
    fromLocation: movement.fromLocation || null,
    toLocation: movement.toLocation || movement.shelfLocation || null,
    locationText: movementLocation(movement),
    note: movement.note || null,
    createdAt: movement.createdAt || new Date().toISOString(),
  };
}

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
