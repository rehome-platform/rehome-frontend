/** Load fixture data only after the caller explicitly selects fixture mode. */
export async function fixtureRequest(operation, args) {
  const fixtures = await import('../fixtures/warehouseFixtures.js');
  return fixtures.fixtureRequest(operation, args);
}

export function fixtureFallback(operation, args) {
  return () => fixtureRequest(operation, args);
}
