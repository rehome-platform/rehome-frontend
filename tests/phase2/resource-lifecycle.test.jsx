import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Phase2Provider, useResource } from '../../src/features/moderator/phase2/hooks.jsx';
import { Phase2Error } from '../../src/features/moderator/phase2/model.js';

const user = { id: 'mod-a', warehouseId: 'warehouse-a' };
vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ user, isAuthenticated: true }),
}));
const wrapper = ({ children }) => <Phase2Provider>{children}</Phase2Provider>;

describe('resource error and cancellation contracts', () => {
  it.each([
    [0, '', true], [500, '', true], [503, '', true],
    [0, 'CONTRACT_BLOCKED', false], [422, '', false], [409, '', false], [403, '', false],
  ])('preserves mutation feedback and uncertainty for status %s / %s', async (status, code, uncertain) => {
    const loader = vi.fn(async () => ({ name: 'Server' }));
    const onUncertain = vi.fn();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useResource(loader), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ name: 'Server' }));
    const error = new Phase2Error('Action failed', status, code, { name: 'Invalid' });
    let outcome;
    await act(async () => {
      outcome = await result.current.mutate(async () => { throw error; }, { onUncertain, onSuccess });
    });
    expect(outcome).toBe(false);
    expect(result.current.busy).toBe(false);
    expect(result.current.actionError).toBe(error);
    expect(result.current.error.fields).toEqual({ name: 'Invalid' });
    expect(onUncertain).toHaveBeenCalledTimes(uncertain ? 1 : 0);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(loader).toHaveBeenCalledTimes(status === 409 ? 2 : 1);
    expect(result.current.data).toEqual(status === 403 ? null : { name: 'Server' });
    act(() => result.current.clearActionError());
    expect(result.current.error).toBeNull();
  });
  it('awaits success before refreshing and releases the mutation lock', async () => {
    const loader = vi.fn(async () => null);
    const { result } = renderHook(() => useResource(loader), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let finish;
    const onSuccess = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    let pending;
    await act(async () => {
      pending = result.current.mutate(async () => 'saved', { onSuccess });
    });
    expect(onSuccess).toHaveBeenCalledExactlyOnceWith('saved');
    expect(result.current.busy).toBe(true);
    expect(loader).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); expect(await pending).toBe(true); });
    expect(loader).toHaveBeenCalledTimes(2);
    expect(result.current.busy).toBe(false);
  });
  it('aborts old loaders and mutations on dependency changes and ignores late results', async () => {
    const loads = [];
    const loader = vi.fn((options) => new Promise((resolve) => loads.push({ ...options, resolve })));
    const { result, rerender } = renderHook(({ id }) => useResource(loader, [id]), {
      initialProps: { id: 'a' }, wrapper,
    });
    let finishMutation, mutationSignal, pending;
    const onSuccess = vi.fn();
    act(() => {
      pending = result.current.mutate((options) => {
        mutationSignal = options.signal;
        return new Promise((resolve) => { finishMutation = resolve; });
      }, { onSuccess });
    });
    rerender({ id: 'b' });
    expect(loads[0].signal.aborted).toBe(true);
    expect(mutationSignal.aborted).toBe(true);
    await act(async () => {
      loads[1].resolve({ name: 'New' });
      loads[0].resolve({ name: 'Old' });
      finishMutation('late');
      expect(await pending).toBe(false);
    });
    expect(result.current.data).toEqual({ name: 'New' });
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
