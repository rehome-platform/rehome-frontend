import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DEBOUNCE_MS,
  MIN_SEARCH_LENGTH,
  SEARCH_MIN_LENGTH_HINT,
  useDebouncedSearch,
} from '../../src/hooks/useDebouncedSearch.js';

function Probe({ value, minLength, delay }) {
  const result = useDebouncedSearch(value, { minLength, delay });
  return (
    <div>
      <span data-testid="query">{result.debouncedQuery}</span>
      <span data-testid="too-short">{String(result.isTooShort)}</span>
      <span data-testid="pending">{String(result.isPending)}</span>
      <span data-testid="hint">{result.hint}</span>
    </div>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedSearch', () => {
  it('returns empty query initially and does not flag isTooShort', () => {
    render(<Probe value="" />);
    expect(MIN_SEARCH_LENGTH).toBe(2);
    expect(DEFAULT_DEBOUNCE_MS).toBe(400);
    expect(screen.getByTestId('query')).toHaveTextContent('');
    expect(screen.getByTestId('too-short')).toHaveTextContent('false');
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
    expect(screen.getByTestId('hint')).toHaveTextContent(SEARCH_MIN_LENGTH_HINT);
  });

  it('flags isTooShort for 1-char and padded 1-char input without updating debouncedQuery', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe value="a" />);
    expect(screen.getByTestId('too-short')).toHaveTextContent('true');
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('');

    rerender(<Probe value="  a  " />);
    expect(screen.getByTestId('too-short')).toHaveTextContent('true');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('');
  });

  it('debounces valid queries (>= 2 chars) by 400ms', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe value="" />);

    rerender(<Probe value="RH" />);
    expect(screen.getByTestId('too-short')).toHaveTextContent('false');
    expect(screen.getByTestId('pending')).toHaveTextContent('true');
    expect(screen.getByTestId('query')).toHaveTextContent('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(399);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('RH');
    expect(screen.getByTestId('pending')).toHaveTextContent('false');
  });

  it('resets immediately to empty string when cleared or given whitespace-only', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe value="RH-12" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('RH-12');

    rerender(<Probe value="" />);
    expect(screen.getByTestId('query')).toHaveTextContent('');
    expect(screen.getByTestId('too-short')).toHaveTextContent('false');

    rerender(<Probe value="RH-99" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('RH-99');

    rerender(<Probe value="   " />);
    expect(screen.getByTestId('query')).toHaveTextContent('');
    expect(screen.getByTestId('too-short')).toHaveTextContent('false');
  });

  it('does not emit a 1-char query when backspacing from a valid query', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Probe value="ab" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('ab');

    rerender(<Probe value="a" />);
    expect(screen.getByTestId('too-short')).toHaveTextContent('true');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByTestId('query')).toHaveTextContent('ab');
  });
});
