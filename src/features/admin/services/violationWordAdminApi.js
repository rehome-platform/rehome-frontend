import baseApi from '../../../services/baseApi.js';

/**
 * Trích xuất dữ liệu trả về từ Spring Boot ApiResponse envelope.
 */
function unwrap(res) {
  if (!res) return null;
  return res.data?.result ?? res.data?.data ?? res.data;
}

function cleanParams(params = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export const violationWordAdminApi = {
  async search({ keyword, category, severity, isActive, page = 0, size = 20 } = {}) {
    const res = await baseApi.get('/api/admin/violation-words', {
      params: cleanParams({ keyword, category, severity, isActive, page, size }),
    });
    return unwrap(res);
  },

  async create(payload) {
    const res = await baseApi.post('/api/admin/violation-words', payload);
    return unwrap(res);
  },

  async update(id, payload) {
    const res = await baseApi.put(`/api/admin/violation-words/${id}`, payload);
    return unwrap(res);
  },

  async remove(id) {
    const res = await baseApi.delete(`/api/admin/violation-words/${id}`);
    return unwrap(res);
  },

  async toggle(id) {
    const res = await baseApi.patch(`/api/admin/violation-words/${id}/toggle`);
    return unwrap(res);
  },
};

export default violationWordAdminApi;
