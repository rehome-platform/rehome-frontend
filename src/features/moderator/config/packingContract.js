// Mutation routes verified against OrderController and CounterController.
export const phase4Contract = {
  revision: '1.0',
  gates: { read: false, scan: true, shipment: true, handover: true },
  operations: {
    read: {
      method: 'get', path: null, supported: false,
      reason: 'Chưa thể xem chi tiết đơn hàng để đóng gói. Vui lòng liên hệ quản trị viên.',
      limitation: 'GET /orders/{id} is Member-only and does not provide the warehouse packing DTO.',
    },
    scan: { method: 'post', path: '/orders/:orderId/pack/scan' },
    shipment: { method: 'post', path: '/orders/:orderId/shipment' },
    handover: { method: 'post', path: '/counter/handover' },
  },
};

export function operationReady(operation) {
  const config = phase4Contract.operations[operation];
  return !!(phase4Contract.revision && phase4Contract.gates[operation] &&
    config?.supported !== false && config?.path);
}
