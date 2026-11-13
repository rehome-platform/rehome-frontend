import baseApi from '../../../services/baseApi.js';

/**
 * Trích xuất dữ liệu trả về từ Spring Boot ApiResponse envelope.
 */
function unwrap(res) {
  if (!res) return null;
  return res.data?.result ?? res.data?.data ?? res.data;
}

/**
 * Loại bỏ các tham số undefined, null hoặc chuỗi rỗng, giữ nguyên số 0 và boolean false.
 */
function cleanParams(params = {}) {
  const cleaned = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    cleaned[key] = value;
  }
  return cleaned;
}

export const membershipAdminApi = {
  async getPlans() {
    const res = await baseApi.get('/api/admin/membership-plans');
    return unwrap(res);
  },

  async getPlanById(id) {
    const res = await baseApi.get(`/api/admin/membership-plans/${id}`);
    return unwrap(res);
  },

  async updatePlan(id, payload) {
    const res = await baseApi.put(`/api/admin/membership-plans/${id}`, payload);
    return unwrap(res);
  },

  async getSubscriptions(params = {}) {
    const res = await baseApi.get('/api/admin/membership-subscriptions', {
      params: cleanParams(params),
    });
    return unwrap(res);
  },

  async getSubscriptionById(id) {
    const res = await baseApi.get(`/api/admin/membership-subscriptions/${id}`);
    return unwrap(res);
  },

  async grantSubscription(payload) {
    const res = await baseApi.post('/api/admin/membership-subscriptions/grant', payload);
    return unwrap(res);
  },

  async cancelSubscription(id, reason) {
    const res = await baseApi.post(`/api/admin/membership-subscriptions/${id}/cancel`, { reason });
    return unwrap(res);
  },

  async getVoucherTemplates() {
    const res = await baseApi.get('/api/admin/voucher-templates');
    return unwrap(res);
  },

  async createVoucherTemplate(payload) {
    const res = await baseApi.post('/api/admin/voucher-templates', payload);
    return unwrap(res);
  },

  async updateVoucherTemplate(id, payload) {
    const res = await baseApi.put(`/api/admin/voucher-templates/${id}`, payload);
    return unwrap(res);
  },

  async deactivateVoucherTemplate(id) {
    const res = await baseApi.post(`/api/admin/voucher-templates/${id}/deactivate`);
    return unwrap(res);
  },

  async getMembershipStats({ from, to } = {}) {
    const res = await baseApi.get('/api/admin/membership-stats', {
      params: cleanParams({ from, to }),
    });
    return unwrap(res);
  },

  async getVoucherStats({ from, to } = {}) {
    const res = await baseApi.get('/api/admin/voucher-stats', {
      params: cleanParams({ from, to }),
    });
    return unwrap(res);
  },

  async getPayments({ from, to, tier, method, page, size } = {}) {
    const res = await baseApi.get('/api/admin/membership-payments', {
      params: cleanParams({ from, to, tier, method, page, size }),
    });
    return unwrap(res);
  },
};

export default membershipAdminApi;

