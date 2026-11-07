// Enrich visible rows without caching mutable detail data or failing the whole page
// when one detail is unavailable. The same signal owns list and detail requests.
export async function enrichListRows(rows, needsDetail, enrich, { signal } = {}) {
  const result = [...rows];
  let next = 0;
  let cancelled = false;
  const checkCancelled = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };
  checkCancelled();
  async function worker() {
    while (!cancelled && next < rows.length) {
      checkCancelled();
      const index = next++;
      const row = rows[index];
      if (!needsDetail(row)) continue;
      try {
        result[index] = await enrich(row);
        checkCancelled();
      } catch (error) {
        if (signal?.aborted || error?.code === 'ERR_CANCELED' || error?.name === 'AbortError') {
          cancelled = true;
          throw error;
        }
        // Keep the list row and its unavailable fields; never substitute sample data.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, rows.length) }, worker));
  checkCancelled();
  return result;
}
