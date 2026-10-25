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
  return Array.isArray(data) ? data : (data?.items ?? []);
}
export function validMoney(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}
export function canStockIn(receipt) {
  return !!receipt?.confirmedAt && !receipt?.productSku;
}
export function ownsClaim(item, userId) {
  return !!userId && item?.claimedBy === userId;
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
  const isMod = user?.role === 'staff' || String(user?.rawRole || '').toUpperCase().includes('MODERATOR');
  return {
    id: user?.warehouseId ?? user?.warehouse?.id ?? (isMod ? (user?.id ? `wh-${String(user.id).slice(0, 8)}` : 'wh-default') : null),
    name: user?.warehouseName ?? user?.warehouse?.name ?? (isMod ? 'Kho ReHome' : ''),
  };
}
