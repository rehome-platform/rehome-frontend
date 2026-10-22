// Proposed contract. Enable only after a reviewed backend hand-off.
export const phase4Contract = {
  revision: null,
  gates: { read: false, scan: false, shipment: false, handover: false },
  operations: {
    read: { method: 'get', path: null },
    scan: { method: 'post', path: '/api/v1/orders/:orderId/pack/scan' },
    shipment: { method: 'post', path: '/api/v1/orders/:orderId/shipment' },
    handover: { method: 'post', path: '/api/v1/counter/handover' },
  },
};

export function operationReady(operation) {
  return !!(phase4Contract.revision && phase4Contract.gates[operation] &&
    phase4Contract.operations[operation]?.path);
}
