import { fixtureFallback } from './fixtureTransport.js';
import { catalogResult, catalogPayload } from '../models/catalogApiModel.js';

import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";

import { callBackend } from './warehouseTransport.js';

export const catalogService = {
  // API 44: GET /categories, GET /brands
  list: async (options) => {
    const fallback = fixtureFallback('catalogList', options);

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    try {
      // Backend mặc định chỉ trả ACTIVE nếu không truyền status.
      // Gọi song song cả ACTIVE và HIDDEN để gộp danh sách đầy đủ cho Moderator.
      const responses = await Promise.all([
        callBackend(
          { method: 'get', url: API_ENDPOINTS.MODERATOR.CATEGORIES, params: { status: 'ACTIVE' } },
          { signal: options?.signal }
        ),
        callBackend(
          { method: 'get', url: API_ENDPOINTS.MODERATOR.CATEGORIES, params: { status: 'HIDDEN' } },
          { signal: options?.signal }
        ).catch(() => []),
        callBackend(
          { method: 'get', url: API_ENDPOINTS.MODERATOR.BRANDS, params: { status: 'ACTIVE' } },
          { signal: options?.signal }
        ),
        callBackend(
          { method: 'get', url: API_ENDPOINTS.MODERATOR.BRANDS, params: { status: 'HIDDEN' } },
          { signal: options?.signal }
        ).catch(() => []),
      ]);

      return catalogResult(responses);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 45 (POST /categories), API 46 (POST /brands), API 47 (PUT /categories/{id}, PUT /brands/{id})
  save: async (kind, id, data, options) => {
    const isCategory = kind === 'category';
    const fallback = fixtureFallback(`${kind}${id ? 'Update' : 'Create'}`, { ids: { id }, data, ...options });

    const method = id ? 'put' : 'post';
    const baseUrl = isCategory ? API_ENDPOINTS.MODERATOR.CATEGORIES : API_ENDPOINTS.MODERATOR.BRANDS;
    const url = id
      ? (isCategory ? API_ENDPOINTS.MODERATOR.CATEGORY_DETAIL(id) : API_ENDPOINTS.MODERATOR.BRAND_DETAIL(id))
      : baseUrl;

    const payload = catalogPayload(kind, id, data);

    return callBackend(
      {
        method,
        url,
        data: payload,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 48: PATCH /categories/{id}/hide, PATCH /brands/{id}/hide
  hide: async (kind, id, options) => {
    const isCategory = kind === 'category';
    const fallback = fixtureFallback(`${kind}Hide`, { ids: { id }, ...options });

    const url = isCategory
      ? API_ENDPOINTS.MODERATOR.HIDE_CATEGORY(id)
      : API_ENDPOINTS.MODERATOR.HIDE_BRAND(id);

    return callBackend(
      {
        method: 'patch',
        url,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};
