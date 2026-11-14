// Mutation routes verified against OrderController and CounterController.
export const phase4Contract = {
  revision: '1.0',
  gates: { read: true, scan: true, shipment: true, label: true, handover: true },
  operations: {
    read: {
      method: 'get',
      path: '/orders/:orderId',
      supported: true,
    },
    scan: { method: 'post', path: '/orders/:orderId/pack/scan' },
    shipment: { method: 'post', path: '/orders/:orderId/shipment' },
    label: { method: 'get', path: '/orders/:orderId/shipment/label?size=A5' },
    handover: { method: 'post', path: '/counter/handover' },
  },
};

export function operationReady(operation) {
  const config = phase4Contract.operations[operation];
  return !!(phase4Contract.revision && phase4Contract.gates[operation] &&
    config?.supported !== false && config?.path);
}
