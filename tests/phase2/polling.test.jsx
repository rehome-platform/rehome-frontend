import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider, useResource } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: testUser, isAuthenticated: true }),
}));
const testUser = { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' };
function Wrapper({ children }) {
  return (
    <StrictMode>
      <Phase2Provider>{children}</Phase2Provider>
    </StrictMode>
  );
}
function Probe({ loader, done }) {
  const resource = useResource(loader, [], { poll: true, done });
  return (
    <>
      <p>{resource.data?.name}</p>
      <p>{resource.pollExpired ? 'MANUAL' : 'POLLING'}</p>
      <button onClick={resource.refresh}>Refresh</button>
    </>
  );
}
afterEach(() => vi.useRealTimers());
describe('bounded polling', () => {
  it('polls every five seconds, pauses while hidden, refreshes on focus and stops when complete', async () => {
    vi.useFakeTimers();
    let completed = false;
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const loader = vi.fn(async () => ({
      name: 'Receipt',
      confirmedAt: completed ? '2026-10-18' : null,
    }));
    render(<Probe loader={loader} done={(value) => !!value?.confirmedAt} />, { wrapper: Wrapper });
    await act(async () => {});
    const initial = loader.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(loader).toHaveBeenCalledTimes(initial + 1);
    visibility.mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(loader).toHaveBeenCalledTimes(initial + 1);
    completed = true;
    visibility.mockReturnValue('visible');
    await act(async () => fireEvent(document, new Event('visibilitychange')));
    expect(loader).toHaveBeenCalledTimes(initial + 2);
    await act(async () => vi.advanceTimersByTimeAsync(30000));
    expect(loader).toHaveBeenCalledTimes(initial + 2);
  });
  it('backs off network failures and switches to manual refresh after ten minutes', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const loader = vi.fn(async () => {
      throw new Error('offline');
    });
    render(<Probe loader={loader} />, { wrapper: Wrapper });
    await act(async () => {});
    const initial = loader.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(loader).toHaveBeenCalledTimes(initial);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(loader).toHaveBeenCalledTimes(initial + 1);
    await act(async () => vi.advanceTimersByTimeAsync(620000));
    expect(screen.getByText('MANUAL')).toBeInTheDocument();
    const stopped = loader.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(60000));
    expect(loader).toHaveBeenCalledTimes(stopped);
  });
  it('aborts and clears server data immediately on logout', async () => {
    const signals = [];
    const loader = vi.fn(async (options) => {
      signals.push(options.signal);
      return { name: 'Private data' };
    });
    render(<Probe loader={loader} />, { wrapper: Wrapper });
    await act(async () => {});
    expect(screen.getByText('Private data')).toBeInTheDocument();
    await act(async () => window.dispatchEvent(new CustomEvent('auth:logout')));
    expect(screen.queryByText('Private data')).not.toBeInTheDocument();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});
