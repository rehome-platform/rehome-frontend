import { callBackend } from './warehouseTransport.js';

export const warehouseHistoryService = {
  list: (type, { page = 0, size = 20 } = {}, options = {}) => callBackend({
    method: 'get', url: '/moderator/warehouse-history', params: { type, page, size },
  }, { signal: options.signal }),
};
