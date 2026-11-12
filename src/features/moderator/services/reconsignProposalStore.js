import { getUser } from '../../../services/baseApi.js';

// The API returns a receipt ID only when sending terms. Keep that handoff in
// this tab, scoped to the authenticated account and warehouse; never infer sale
// status from this record. Other devices still require a backend proposal feed.
function key(options) {
  const user = getUser() || {};
  const userId = options?.scope?.userId || user.accountId || user.id;
  const warehouseId = options?.scope?.warehouseId || user.warehouseId;
  return userId && warehouseId ? `rehome:reconsign:${userId}:${warehouseId}` : null;
}

export function readProposals(options) {
  try {
    const storageKey = key(options);
    const rows = storageKey ? JSON.parse(sessionStorage.getItem(storageKey) || '[]') : [];
    return Array.isArray(rows) ? rows.filter(row => row.productId && row.decisionId) : [];
  } catch { return []; }
}

export function proposalForProduct(proposals, product, request) {
  const saved = proposals.find(row => row.productId === (product.id || product.sku));
  if (product.degradedCaseId || product.decisionId || (request && request.decisionId !== saved?.decisionId)) return null;
  return saved || null;
}

export function rememberProposal(proposal, options) {
  try {
    const storageKey = key(options);
    if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify([
      ...readProposals(options).filter(row => row.productId !== proposal.productId), proposal,
    ]));
  } catch { /* Storage may be unavailable; the current page still tracks the handoff. */ }
}

export function forgetProposal(productId, options) {
  try {
    const storageKey = key(options);
    if (storageKey) sessionStorage.setItem(storageKey, JSON.stringify(readProposals(options).filter(row => row.productId !== productId)));
  } catch { /* Storage is optional. */ }
}
