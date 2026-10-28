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
