import baseApi from '../../../services/baseApi.js';

/**
 * Trích xuất dữ liệu trả về từ Spring Boot ApiResponse envelope.
 */
function unwrap(res) {
  if (!res) return null;
  return res.data?.result ?? res.data?.data ?? res.data;
}

export const receiptClauseAdminApi = {
  async list() {
    const res = await baseApi.get('/api/admin/receipt-clause-templates');
    return unwrap(res);
  },

  async create(payload) {
    const res = await baseApi.post('/api/admin/receipt-clause-templates', payload);
    return unwrap(res);
  },

  async update(id, payload) {
    const res = await baseApi.put(`/api/admin/receipt-clause-templates/${id}`, payload);
    return unwrap(res);
  },

  async remove(id) {
    const res = await baseApi.delete(`/api/admin/receipt-clause-templates/${id}`);
    return unwrap(res);
  },

  async toggle(id) {
    const res = await baseApi.patch(`/api/admin/receipt-clause-templates/${id}/toggle`);
    return unwrap(res);
  },
};

export default receiptClauseAdminApi;
