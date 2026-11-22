import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../../../configs/api.config.js';

/**
 * Axios client riêng cho các endpoint công khai (permitAll) trên Trang Tiếp thị.
 * Không dùng baseApi để tránh đính kèm JWT cũ/hết hạn hoặc kích hoạt sự kiện auth:expired.
 */
export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Kiểm tra URL ảnh trỏ về localhost khi frontend đang dùng API từ xa (tránh lỗi kết nối ảnh seed).
 */
export function isUnreachableLocalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const isLocalAsset = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\//i.test(url);
  const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(API_BASE_URL);
  return isLocalAsset && !isLocalApi;
}

/**
 * Kiểm tra các URL ảnh seed lỗi đã biết (localhost không chạy local BE hoặc ảnh 404 cố định từ dummyjson).
 */
export function isBrokenSeedAssetUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (isUnreachableLocalUrl(url)) return true;
  return /^https?:\/\/cdn\.dummyjson\.com\/product-images\/mens-shirts\/men-cotton-jacket\//i.test(
    url.trim()
  );
}

/**
 * Ưu tiên sắp xếp các sản phẩm có ảnh hợp lệ lên đầu danh sách (giữ nguyên thứ tự tương đối).
 */
export function prioritizeVisualProducts(items = []) {
  if (!Array.isArray(items) || items.length <= 1) {
    return Array.isArray(items) ? items : [];
  }
  const withValidPhoto = [];
  const withoutValidPhoto = [];
  for (const item of items) {
    const url = item?.thumbnailUrl;
    if (url && !isBrokenSeedAssetUrl(url)) {
      withValidPhoto.push(item);
    } else {
      withoutValidPhoto.push(item);
    }
  }
  return [...withValidPhoto, ...withoutValidPhoto];
}

/**
 * Bóc tách mảng dữ liệu an toàn từ cả dạng mảng thô (như GET /warehouses)
 * lẫn dạng bọc ApiResponse / PageResponse.
 */
export function unwrapApiList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  if (Array.isArray(payload.result)) {
    return payload.result;
  }
  if (Array.isArray(payload.result?.content)) {
    return payload.result.content;
  }
  if (Array.isArray(payload.content)) {
    return payload.content;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

/**
 * Bóc tách phản hồi có phân trang từ ApiResponse<PageResponse<T>>, PageResponse<T> hoặc mảng thô.
 */
export function unwrapApiPage(payload) {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      totalElements: payload.length,
      totalPages: payload.length > 0 ? 1 : 0,
    };
  }
  if (!payload || typeof payload !== 'object') {
    return {
      items: [],
      totalElements: 0,
      totalPages: 0,
    };
  }

  const pageObj =
    payload.result && typeof payload.result === 'object' && !Array.isArray(payload.result)
      ? payload.result
      : payload;

  if (Array.isArray(pageObj.content)) {
    const totalElements = Number(pageObj.totalElements);
    const totalPages = Number(pageObj.totalPages);
    return {
      items: pageObj.content,
      totalElements: Number.isFinite(totalElements) ? totalElements : pageObj.content.length,
      totalPages: Number.isFinite(totalPages) ? totalPages : pageObj.content.length > 0 ? 1 : 0,
    };
  }

  const items = unwrapApiList(payload);
  return {
    items,
    totalElements: items.length,
    totalPages: items.length > 0 ? 1 : 0,
  };
}

export async function fetchPublicProducts({ page = 0, size = 6, categoryId } = {}) {
  const params = { page, size };
  if (categoryId) {
    params.categoryId = categoryId;
  }
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.PRODUCTS, { params });
  return unwrapApiPage(response.data);
}

export async function fetchPublicWarehouses() {
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.WAREHOUSES);
  return unwrapApiList(response.data);
}

export async function fetchPublicCampaigns({ page = 0, size = 4 } = {}) {
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.CAMPAIGNS, {
    params: { page, size },
  });
  return unwrapApiPage(response.data);
}

export async function fetchPublicOrganizations({ page = 0, size = 6 } = {}) {
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.ORGANIZATIONS, {
    params: { page, size },
  });
  return unwrapApiPage(response.data);
}

export async function fetchPublicMembershipPlans() {
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.MEMBERSHIP_PLANS);
  const plans = unwrapApiList(response.data);
  return [...plans].sort((a, b) => (Number(a?.sortOrder) || 0) - (Number(b?.sortOrder) || 0));
}

export async function fetchPublicCategories() {
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.CATEGORIES);
  return unwrapApiList(response.data).filter((item) => item?.status !== 'HIDDEN');
}

export async function fetchPublicBrands() {
  const response = await publicApi.get(API_ENDPOINTS.PUBLIC.BRANDS);
  return unwrapApiList(response.data).filter((item) => item?.status !== 'HIDDEN');
}

export async function fetchLandingData() {
  const keys = [
    'products',
    'warehouses',
    'campaigns',
    'organizations',
    'plans',
    'categories',
    'brands',
  ];

  const settled = await Promise.allSettled([
    fetchPublicProducts({ page: 0, size: 12 }),
    fetchPublicWarehouses(),
    fetchPublicCampaigns({ page: 0, size: 4 }),
    fetchPublicOrganizations({ page: 0, size: 6 }),
    fetchPublicMembershipPlans(),
    fetchPublicCategories(),
    fetchPublicBrands(),
  ]);

  const errors = [];
  let successCount = 0;

  settled.forEach((entry, idx) => {
    if (entry.status === 'fulfilled') {
      successCount += 1;
    } else {
      errors.push(keys[idx]);
    }
  });

  const productsPage =
    settled[0].status === 'fulfilled'
      ? settled[0].value
      : { items: [], totalElements: 0, totalPages: 0 };
  const prioritizedProducts = prioritizeVisualProducts(productsPage.items);
  const warehouses = settled[1].status === 'fulfilled' ? settled[1].value : [];
  const campaignsPage =
    settled[2].status === 'fulfilled'
      ? settled[2].value
      : { items: [], totalElements: 0, totalPages: 0 };
  const organizationsPage =
    settled[3].status === 'fulfilled'
      ? settled[3].value
      : { items: [], totalElements: 0, totalPages: 0 };
  const plans = settled[4].status === 'fulfilled' ? settled[4].value : [];
  const categories = settled[5].status === 'fulfilled' ? settled[5].value : [];
  const brands = settled[6].status === 'fulfilled' ? settled[6].value : [];

  return {
    stats: {
      productsTotal: productsPage.totalElements,
      warehousesTotal: warehouses.length,
      campaignsTotal: campaignsPage.totalElements,
      organizationsTotal: organizationsPage.totalElements,
      categoriesTotal: categories.length,
      brandsTotal: brands.length,
    },
    products: prioritizedProducts,
    warehouses,
    campaigns: campaignsPage.items,
    organizations: organizationsPage.items,
    plans,
    categories,
    brands,
    errors,
    hasLiveData: successCount > 0,
  };
}
