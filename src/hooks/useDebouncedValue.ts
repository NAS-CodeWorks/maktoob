import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce a fast-changing value.
 * Commonly used for search inputs, autocomplete filtering, and throttled queries.
 *
 * @param value The value to debounce
 * @param delayMs Delay in milliseconds (default: 200ms)
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
