import { useState, useEffect } from 'react';

/**
 * useDebounce hook for delaying state updates (search inputs, filters)
 * @param {any} value
 * @param {number} delay (ms)
 * @returns {any}
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
