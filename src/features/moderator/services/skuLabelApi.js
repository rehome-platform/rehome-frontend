import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { normalizeError, Phase2Error } from '../models/warehouseModel.js';
import { callBackend } from './warehouseTransport.js';

export const skuLabelService = {
  list: (options) => callBackend({ method: 'get', url: API_ENDPOINTS.MODERATOR.SKU_LABELS }, options),
  pdf: async (skus, options = {}) => {
    try {
      const response = await baseApi.post(API_ENDPOINTS.MODERATOR.SKU_LABELS_PDF, { skus }, {
        responseType: 'blob', signal: options.signal, noReplay: true,
      });
      if (!response.data?.size || !response.data.type?.includes('pdf')) {
        throw new Phase2Error('Máy chủ không trả về file PDF hợp lệ.', 502);
      }
      return response.data;
    } catch (error) { throw normalizeError(error); }
  },
  markPrinted: (skus, options) => callBackend({
    method: 'post', url: API_ENDPOINTS.MODERATOR.SKU_LABELS_PRINTED, data: { skus },
  }, options),
};

export function downloadLabelPdf(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'rehome-tem-sku.pdf';
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
