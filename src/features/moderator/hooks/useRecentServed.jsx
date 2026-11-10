import { useCallback, useEffect, useRef, useState } from 'react';

const DAY_MS = 86400000;
const vietnamDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});

function dayOf(value) {
  const parts = vietnamDate.formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function todayEntries(items) {
  const now = Date.now();
  const day = dayOf(now);
  const codes = new Set();
  return (Array.isArray(items) ? items : []).filter((item) => {
    const servedAt = Date.parse(item?.servedAt);
    if (!item || typeof item.memberCode !== 'string' || !item.memberCode ||
        typeof item.memberId !== 'string' || !item.memberId ||
        !Number.isFinite(servedAt) || servedAt > now || dayOf(servedAt) !== day || codes.has(item.memberCode)) return false;
    codes.add(item.memberCode);
    return true;
  }).slice(0, 5).map((item) => ({
    name: typeof item.name === 'string' ? item.name : '',
    memberCode: item.memberCode,
    memberId: item.memberId,
    phone: typeof item.phone === 'string' ? item.phone : '',
    taskNote: typeof item.taskNote === 'string' ? item.taskNote : '',
    servedAt: item.servedAt,
  }));
}

function read(key, fallback = []) {
  if (!key) return todayEntries(fallback);
  try {
    return todayEntries(JSON.parse(window.localStorage.getItem(key) || '[]'));
  } catch {
    return todayEntries(fallback);
  }
}

function write(key, items) {
  if (!key) return;
  try {
    if (items.length) window.localStorage.setItem(key, JSON.stringify(items));
    else window.localStorage.removeItem(key);
  } catch {
    // A blocked/full browser store must not prevent service at the counter.
  }
}

export function useRecentServed(scope) {
  const key = scope?.userId && scope?.warehouseId
    ? `rehome:counter:recent:v1:${encodeURIComponent(scope.userId)}:${encodeURIComponent(scope.warehouseId)}`
    : null;
  const [recentServed, setRecentServed] = useState(() => read(key));
  const current = useRef(recentServed);

  useEffect(() => {
    let timer;
    const synchronize = () => {
      const items = read(key, current.current);
      current.current = items;
      setRecentServed(items);
      write(key, items);
      clearTimeout(timer);
      const nextMidnight = Date.parse(`${dayOf(Date.now())}T00:00:00+07:00`) + DAY_MS;
      timer = setTimeout(synchronize, Math.max(1, nextMidnight - Date.now()));
    };
    const onStorage = (event) => {
      if (key && (event.key === key || event.key === null)) synchronize();
    };
    synchronize();
    window.addEventListener('focus', synchronize);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', synchronize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', synchronize);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', synchronize);
    };
  }, [key]);

  const rememberServed = useCallback((member, taskNote = 'Vừa phục vụ tại quầy') => {
    if (!member?.memberId || !member?.memberCode) return;
    const items = todayEntries([
      {
        name: member.fullName || member.name || '',
        memberCode: member.memberCode,
        memberId: member.memberId,
        phone: member.phone || '',
        taskNote,
        servedAt: new Date().toISOString(),
      },
      ...read(key, current.current).filter((item) => item.memberCode !== member.memberCode),
    ]);
    current.current = items;
    setRecentServed(items);
    write(key, items);
  }, [key]);

  return { recentServed, rememberServed };
}
