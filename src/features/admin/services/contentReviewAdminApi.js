import baseApi from '../../../services/baseApi.js';

function unwrap(res) {
  if (!res) return null;
  return res.data?.result ?? res.data?.data ?? res.data;
}

export const contentReviewAdminApi = {
  async listPending(kind = 'POST', { page = 0, size = 20 } = {}) {
    const res = await baseApi.get(`/content-reviews/${encodeURIComponent(kind)}`, {
      params: { page, size },
    });
    return unwrap(res);
  },

  async resolve(kind, id, { approved, version, reason } = {}) {
    const payload = {
      approved: Boolean(approved),
      version,
      ...(reason ? { reason } : {}),
    };
    const res = await baseApi.post(
      `/content-reviews/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/decision`,
      payload
    );
    return unwrap(res);
  },
};

export default contentReviewAdminApi;
