// Compatibility facade: callers can migrate to domain services incrementally.
export { request } from './warehouseTransport.js';
export { queueService } from './queueApi.js';
export { counterService } from './counterApi.js';
export { consignmentService } from './consignmentApi.js';
export { inventoryService } from './inventoryApi.js';
export { catalogService } from './catalogApi.js';
export { endTermService } from './endTermApi.js';
export { returnService } from './returnApi.js';
export { orgVerificationService } from './orgVerificationApi.js';
export { violationReportService } from './violationReportApi.js';
export { warehouseInboxService } from './warehouseInboxApi.js';
