import React, { StrictMode } from 'react';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { useCounter } from '../../src/features/moderator/hooks/useCounter.jsx';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import { counterService } from '../../src/features/moderator/services/warehouseApi.js';
import { Phase2Error } from '../../src/features/moderator/models/warehouseModel.js';

const auth = vi.hoisted(() => ({ user: { id: 'mod-a', role: 'MODERATOR', warehouseId: 'warehouse-a' } }));
vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: true, user: auth.user }),
}));

const member = { memberId: '11111111-1111-4111-8111-111111111111', memberCode: 'MB001', fullName: 'Member thật', phone: '0912345678' };
const freshMember = { ...member, memberId: '22222222-2222-4222-8222-222222222222', fullName: 'Hồ sơ mới' };
function Wrapper({ children }) {
  return <StrictMode><MemoryRouter><Phase2Provider>{children}</Phase2Provider></MemoryRouter></StrictMode>;
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
  auth.user = { id: 'mod-a', role: 'MODERATOR', warehouseId: 'warehouse-a' };
  vi.spyOn(counterService, 'lookup').mockResolvedValue([member]);
  vi.spyOn(counterService, 'confirm').mockImplementation(async (memberId) => ({ memberId, identityToken: `proof-${memberId}` }));
  vi.spyOn(counterService, 'tasks').mockResolvedValue({ pendingForms: [], pendingWithdrawals: [], pendingEndOfTerm: [] });
});
afterEach(() => vi.useRealTimers());

describe('Member gần đây tại quầy', () => {
  it('hides empty recent members and reopens through lookup, confirming the fresh account ID', async () => {
    const user = userEvent.setup();
    render(<CounterPage />, { wrapper: Wrapper });
    expect(screen.queryByText('Đã phục vụ gần đây')).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Mã Member' }), member.memberCode);
    await user.click(screen.getByRole('button', { name: 'Tra cứu' }));
    await user.click(await screen.findByRole('button', { name: `Chọn Member ${member.memberCode}` }));
    expect(screen.queryByRole('button', { name: 'Mở lại' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }));
    await screen.findByText('Đã xác nhận danh tính');
    expect(screen.getByText('Đã phục vụ gần đây')).toBeInTheDocument();
    const pending = deferred();
    counterService.lookup.mockReturnValue(pending.promise);
    counterService.tasks.mockClear();
    await user.click(screen.getByRole('button', { name: 'Mở lại' }));
    expect(screen.getByRole('button', { name: 'Mở lại' })).toBeDisabled();
    expect(screen.queryByText('Đã xác nhận danh tính')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tôi đã đối chiếu đúng Member' })).not.toBeInTheDocument();
    expect(counterService.lookup).toHaveBeenLastCalledWith({ memberCode: member.memberCode }, expect.anything());
    await act(async () => pending.resolve([freshMember]));
    expect(await screen.findByRole('heading', { name: freshMember.fullName })).toBeInTheDocument();
    expect(counterService.tasks).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Tôi đã đối chiếu đúng Member' }));
    await screen.findByText('Đã xác nhận danh tính');
    expect(counterService.confirm).toHaveBeenLastCalledWith(freshMember.memberId, expect.anything());
    expect(counterService.tasks).toHaveBeenLastCalledWith(freshMember.memberId, expect.anything());
    expect(screen.getAllByRole('button', { name: 'Mở lại' })).toHaveLength(1);
  });

  it.each([403, 404])('does not remember or load tasks after confirmation returns %s', async (status) => {
    counterService.confirm.mockRejectedValue(new Phase2Error(`Lỗi ${status}`, status));
    const { result } = renderHook(useCounter, { wrapper: Wrapper });
    act(() => result.current.choose(member));
    await act(async () => result.current.sections.CounterIdentityPanel.confirmIdentity());
    expect(result.current.confirmed).toBe(false);
    expect(result.current.recentServed).toEqual([]);
    expect(result.current.results.error.status).toBe(status);
    expect(counterService.tasks).not.toHaveBeenCalled();
  });

  it.each([[], new Phase2Error('Không có quyền', 403), new Phase2Error('Không tìm thấy', 404)])('keeps the old profile closed when reopening fails (%s)', async (response) => {
    const { result } = renderHook(useCounter, { wrapper: Wrapper });
    act(() => result.current.choose(member));
    await act(async () => result.current.sections.CounterIdentityPanel.confirmIdentity());
    counterService.tasks.mockClear();
    if (response instanceof Error) counterService.lookup.mockRejectedValue(response);
    else counterService.lookup.mockResolvedValue(response);
    act(() => result.current.reopen(member));
    await waitFor(() => expect(result.current.results.error).toBeTruthy());
    expect(result.current.selected).toBeNull();
    expect(result.current.confirmed).toBe(false);
    expect(counterService.tasks).not.toHaveBeenCalled();
  });

  it('ignores late confirmation even after switching away and back to the same member', async () => {
    const pending = deferred();
    counterService.confirm.mockReturnValue(pending.promise);
    const { result } = renderHook(useCounter, { wrapper: Wrapper });
    act(() => result.current.choose(member));
    act(() => { result.current.sections.CounterIdentityPanel.confirmIdentity(); });
    act(() => result.current.choose(freshMember));
    act(() => result.current.choose(member));
    await act(async () => pending.resolve({ memberId: member.memberId, identityToken: 'late' }));
    expect(result.current.confirmed).toBe(false);
    expect(result.current.recentServed).toEqual([]);
    expect(counterService.tasks).not.toHaveBeenCalled();
  });

  it('ignores a late reopen lookup after another selection', async () => {
    const pending = deferred();
    counterService.lookup.mockReturnValue(pending.promise);
    const { result } = renderHook(useCounter, { wrapper: Wrapper });
    act(() => result.current.reopen(member));
    await waitFor(() => expect(counterService.lookup).toHaveBeenCalled());
    act(() => result.current.choose(freshMember));
    await act(async () => pending.resolve([member]));
    expect(result.current.selected).toEqual(freshMember);
    expect(result.current.confirmed).toBe(false);
  });

  it('keeps five unique members in most recently served order across remount without restoring identity', async () => {
    const { result, unmount } = renderHook(useCounter, { wrapper: Wrapper });
    const members = Array.from({ length: 6 }, (_, i) => ({ ...member, memberId: `account-${i}`, memberCode: `MB${i}` }));
    for (const item of members) {
      act(() => result.current.choose(item));
      await act(async () => result.current.sections.CounterIdentityPanel.confirmIdentity());
    }
    expect(result.current.recentServed.map((item) => item.memberCode)).toEqual(['MB5', 'MB4', 'MB3', 'MB2', 'MB1']);
    act(() => result.current.choose(members[2]));
    await act(async () => result.current.sections.CounterIdentityPanel.confirmIdentity());
    expect(result.current.recentServed.map((item) => item.memberCode)).toEqual(['MB2', 'MB5', 'MB4', 'MB3', 'MB1']);
    unmount();
    const next = renderHook(useCounter, { wrapper: Wrapper });
    expect(next.result.current.recentServed.map((item) => item.memberCode)).toEqual(['MB2', 'MB5', 'MB4', 'MB3', 'MB1']);
    expect(next.result.current.selected).toBeNull();
    expect(next.result.current.confirmed).toBe(false);
    expect(JSON.stringify(localStorage)).not.toContain('proof-');
    expect(next.result.current.recentServed[0].servedAt).toBeTruthy();
  });

  it('resets at Vietnam midnight while mounted and after reload', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-11-07T16:59:59.000Z'));
    const { result, unmount } = renderHook(useCounter, { wrapper: Wrapper });
    act(() => result.current.choose(member));
    await act(async () => result.current.sections.CounterIdentityPanel.confirmIdentity());
    expect(result.current.recentServed).toHaveLength(1);
    await act(async () => vi.advanceTimersByTime(1000));
    expect(result.current.recentServed).toEqual([]);
    unmount();
    const next = renderHook(useCounter, { wrapper: Wrapper });
    expect(next.result.current.recentServed).toEqual([]);
  });

  it('does not restore yesterday entries when reopening the next Vietnam day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-07T16:59:59Z'));
    const first = renderHook(useCounter, { wrapper: Wrapper });
    act(() => first.result.current.choose(member));
    await act(async () => first.result.current.sections.CounterIdentityPanel.confirmIdentity());
    first.unmount();
    vi.setSystemTime(new Date('2026-11-07T17:00:01Z'));
    const next = renderHook(useCounter, { wrapper: Wrapper });
    expect(next.result.current.recentServed).toEqual([]);
  });

  it.each([
    { id: 'mod-b', role: 'MODERATOR', warehouseId: 'warehouse-a' },
    { id: 'mod-a', role: 'MODERATOR', warehouseId: 'warehouse-b' },
  ])('isolates stored recent members by moderator and warehouse: %s', async (otherUser) => {
    const first = renderHook(useCounter, { wrapper: Wrapper });
    act(() => first.result.current.choose(member));
    await act(async () => first.result.current.sections.CounterIdentityPanel.confirmIdentity());
    first.unmount();
    auth.user = otherUser;
    const other = renderHook(useCounter, { wrapper: Wrapper });
    expect(other.result.current.recentServed).toEqual([]);
    other.unmount();
    auth.user = { id: 'mod-a', role: 'MODERATOR', warehouseId: 'warehouse-a' };
    const original = renderHook(useCounter, { wrapper: Wrapper });
    expect(original.result.current.recentServed[0].memberCode).toBe('MB001');
  });

  it('still serves members when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
    const { result } = renderHook(useCounter, { wrapper: Wrapper });
    act(() => result.current.choose(member));
    await act(async () => result.current.sections.CounterIdentityPanel.confirmIdentity());
    expect(result.current.confirmed).toBe(true);
    expect(result.current.recentServed[0].memberCode).toBe('MB001');
  });
});
