import { useEffect, useState } from 'react';

export const MIN_SEARCH_LENGTH = 2;
export const DEFAULT_DEBOUNCE_MS = 400;
export const SEARCH_MIN_LENGTH_HINT = `Nhập ít nhất ${MIN_SEARCH_LENGTH} ký tự để tìm kiếm`;

/**
 * Debounces a server-backed search query and enforces a minimum trimmed length.
 * - Empty / whitespace-only input resets debouncedQuery to '' immediately.
 * - Input shorter than minLength does not update debouncedQuery and flags isTooShort.
 * - Input with trimmed.length >= minLength updates debouncedQuery after `delay` ms.
 */
export function useDebouncedSearch(
  value,
  { minLength = MIN_SEARCH_LENGTH, delay = DEFAULT_DEBOUNCE_MS } = {},
) {
  const trimmed = String(value ?? '').trim();
  const isTooShort = trimmed.length > 0 && trimmed.length < minLength;

  const [debouncedQuery, setDebouncedQuery] = useState(() =>
    trimmed.length >= minLength ? trimmed : '',
  );

  useEffect(() => {
    if (trimmed.length === 0) {
      setDebouncedQuery('');
      return undefined;
    }

    if (trimmed.length < minLength) {
      return undefined;
    }

    if (trimmed === debouncedQuery) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, delay);

    return () => clearTimeout(timer);
  }, [trimmed, minLength, delay, debouncedQuery]);

  const isPending = trimmed.length >= minLength && trimmed !== debouncedQuery;
  const hint = `Nhập ít nhất ${minLength} ký tự để tìm kiếm`;

  return {
    debouncedQuery,
    isTooShort,
    isPending,
    minLength,
    hint,
  };
}
