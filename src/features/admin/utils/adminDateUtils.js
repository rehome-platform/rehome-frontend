/**
 * Vietnam calendar (Asia/Ho_Chi_Minh) date utilities for Admin Dashboard & Reports.
 * All calendar arithmetic uses UTC after extracting VN calendar components so results
 * never depend on the browser's local timezone.
 */

export function getVietnamToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function getPeriodDateRange(period, now = new Date()) {
  const to = getVietnamToday(now);
  if (period === 'ALL') {
    return {
      apiFrom: undefined,
      apiTo: undefined,
      exportFrom: '1970-01-01',
      exportTo: to,
    };
  }
  if (period === 'TODAY') {
    return {
      apiFrom: to,
      apiTo: to,
      exportFrom: to,
      exportTo: to,
    };
  }

  const start = new Date(`${to}T00:00:00Z`);
  if (period === 'WEEK') {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  } else {
    start.setUTCDate(1);
  }
  const from = start.toISOString().slice(0, 10);
  return {
    apiFrom: from,
    apiTo: to,
    exportFrom: from,
    exportTo: to,
  };
}

export function getDefaultGrowthRange(days = 30, now = new Date()) {
  const to = getVietnamToday(now);
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - Math.max(days - 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to,
  };
}

export function validateDateRange(from, to) {
  if (!from || !to) return null;
  if (from > to) {
    return 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.';
  }
  return null;
}
