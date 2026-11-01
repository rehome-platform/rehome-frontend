/** Load fixture data only after the caller explicitly selects fixture mode. */
import { getUser } from '../../../services/baseApi.js';

function resolveScope(scope) {
  if (scope?.userId && scope?.warehouseId) return scope;
  const u = getUser() || {};
  return {
    userId: scope?.userId || u.accountId || u.id || 'mod-qa',
    warehouseId: scope?.warehouseId || u.warehouseId || 'warehouse-a',
    ...scope,
  };
}

export async function fixtureRequest(operation, args = {}) {
  const fixtures = await import('../fixtures/warehouseFixtures.js');
  const scope = resolveScope(args.scope);
  return fixtures.fixtureRequest(operation, { ...args, scope });
}

export function fixtureFallback(operation, args = {}) {
  return () => fixtureRequest(operation, args);
}
