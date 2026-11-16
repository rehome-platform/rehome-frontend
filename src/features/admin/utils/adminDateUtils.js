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

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tuần ISO (thứ Hai là ngày đầu tuần) của hôm nay theo giờ VN, dạng "2026-W46" (giá trị của <input type="week">). */
export function getVietnamIsoWeek(now = new Date()) {
  const d = new Date(`${getVietnamToday(now)}T00:00:00Z`);
  // Tuần ISO thuộc về năm chứa ngày thứ Năm của tuần đó
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((d - firstThursday) / (7 * 86400000));
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** "2026-W46" -> { from: thứ Hai, to: Chủ nhật } hoặc null nếu sai định dạng. */
export function getIsoWeekRange(value) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7));
  const from = addDays(mondayOfWeek1.toISOString().slice(0, 10), (week - 1) * 7);
  return { from, to: addDays(from, 6) };
}

/** "2026-11" -> { from: "2026-11-01", to: "2026-11-30" } hoặc null. */
export function getMonthRange(value) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(Number(m[1]), month, 0)).getUTCDate();
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, '0')}` };
}

/** "2026" -> { from: "2026-01-01", to: "2026-12-31" } hoặc null. */
export function getYearRange(value) {
  const y = String(value || '').trim();
  if (!/^\d{4}$/.test(y)) return null;
  return { from: `${y}-01-01`, to: `${y}-12-31` };
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
  if (period === 'LAST30') {
    const from = addDays(to, -29);
    return { apiFrom: from, apiTo: to, exportFrom: from, exportTo: to };
  }
  if (period === 'YEAR') {
    const from = `${to.slice(0, 4)}-01-01`;
    return { apiFrom: from, apiTo: to, exportFrom: from, exportTo: to };
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

/**
 * Độ chi tiết mặc định của biểu đồ theo khoảng đang chọn, để số cột luôn vừa phải và không vượt giới hạn
 * 366 kỳ của API: tới ~3 tháng theo ngày, tới nửa năm theo tuần, dài hơn (cả một năm, hoặc "toàn thời gian")
 * theo tháng.
 */
export function pickTrendGranularity(from, to, now = new Date()) {
  if (!from) return 'month';
  const end = to || getVietnamToday(now);
  const days = Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
  if (!Number.isFinite(days)) return 'month';
  if (days <= 92) return 'day';
  if (days <= 183) return 'week';
  return 'month';
}

export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day
  );
}

export function validateDateRange(from, to) {
  if (!from && !to) return null;
  if (from && !isValidCalendarDate(from)) {
    return 'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.';
  }
  if (to && !isValidCalendarDate(to)) {
    return 'Ngày kết thúc không đúng định dạng YYYY-MM-DD.';
  }
  if (from && to && from > to) {
    return 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.';
  }
  return null;
}

/**
 * Đổi lựa chọn của bộ lọc thời gian Admin thành khoảng ngày gọi API.
 * state: { period, customFrom, customTo, pickedDay, pickedWeek, pickedMonth, pickedYear }
 * period: TODAY | WEEK | MONTH | LAST30 | YEAR | ALL (chọn nhanh) hoặc
 *         DAY | WEEK_PICK | MONTH_PICK | YEAR_PICK | CUSTOM (chọn cụ thể).
 * Khoảng chọn cụ thể ở tương lai bị cắt tại hôm nay; chọn hẳn thời gian chưa tới thì báo lỗi.
 * Trả { range: { apiFrom, apiTo, exportFrom, exportTo }, error }. Có error thì không được gọi API.
 */
export function resolvePeriodRange(state, now = new Date()) {
  const today = getVietnamToday(now);
  const noRange = { apiFrom: undefined, apiTo: undefined, exportFrom: '1970-01-01', exportTo: today };
  const { period } = state;

  if (period === 'CUSTOM') {
    const { customFrom, customTo } = state;
    return {
      error: validateDateRange(customFrom, customTo),
      range: {
        apiFrom: customFrom || undefined,
        apiTo: customTo || undefined,
        exportFrom: customFrom || '1970-01-01',
        exportTo: customTo || today,
      },
    };
  }

  let picked = null;
  let missing = null;
  if (period === 'DAY') {
    if (isValidCalendarDate(state.pickedDay)) picked = { from: state.pickedDay, to: state.pickedDay };
    else missing = 'Vui lòng chọn ngày.';
  } else if (period === 'WEEK_PICK') {
    picked = getIsoWeekRange(state.pickedWeek);
    if (!picked) missing = 'Vui lòng chọn tuần.';
  } else if (period === 'MONTH_PICK') {
    picked = getMonthRange(state.pickedMonth);
    if (!picked) missing = 'Vui lòng chọn tháng.';
  } else if (period === 'YEAR_PICK') {
    picked = getYearRange(state.pickedYear);
    if (!picked) missing = 'Vui lòng chọn năm.';
  } else {
    return { error: null, range: getPeriodDateRange(period, now) };
  }

  if (!picked) return { error: missing, range: noRange };
  if (picked.from > today) return { error: 'Không thể chọn thời gian ở tương lai.', range: noRange };
  const to = picked.to > today ? today : picked.to;
  return { error: null, range: { apiFrom: picked.from, apiTo: to, exportFrom: picked.from, exportTo: to } };
}

// Số ngày trong `month` (1-12) của `year`: dùng khi lấy "cùng ngày tháng/năm trước" có thể vượt quá số
// ngày của tháng đích (ví dụ 31/03 -> tháng trước chỉ có 28 hoặc 29 ngày)
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// "2026-11" dịch đi `delta` tháng (có thể âm), trả về "YYYY-MM"
function shiftMonth(yyyyMm, delta) {
  const [y, m] = yyyyMm.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

const PREVIOUS_PERIOD_LABELS = {
  TODAY: 'hôm qua',
  DAY: 'ngày liền trước',
  WEEK: 'tuần trước',
  WEEK_PICK: 'tuần liền trước',
  MONTH: 'tháng trước',
  MONTH_PICK: 'tháng liền trước',
  YEAR: 'năm trước',
  YEAR_PICK: 'năm liền trước',
  LAST30: '30 ngày trước đó',
  CUSTOM: 'kỳ liền trước',
};

/**
 * Nhãn hiển thị cho kỳ trước ứng với lựa chọn hiện tại của bộ lọc (dùng trong "so với {nhãn}"),
 * hoặc null nếu là "Toàn thời gian" (không có kỳ trước để so sánh).
 */
export function getPreviousPeriodLabel(period) {
  return PREVIOUS_PERIOD_LABELS[period] || null;
}

/**
 * Khoảng thời gian liền trước để so sánh tăng trưởng %, tương ứng lựa chọn hiện tại của bộ lọc (cùng
 * `state` như resolvePeriodRange). Quy tắc theo từng loại kỳ:
 * - Ngày/tuần/tháng/năm (nhanh hoặc chọn cụ thể) -> kỳ liền trước CÙNG LOẠI theo lịch: ngày liền trước,
 *   tuần liền trước (lùi đúng 7 ngày, giữ nguyên thứ trong tuần), tháng liền trước (cùng số ngày, cắt theo
 *   số ngày thực có của tháng đó), năm liền trước (cùng tháng-ngày, cắt 29/02 nếu năm trước không nhuận).
 *   Nhờ vậy một kỳ đang chạy dở (ví dụ "Tháng này" mới tới ngày 16) vẫn so sánh công bằng với đúng 16
 *   ngày đầu của kỳ trước, không so với trọn kỳ trước.
 * - 30 ngày gần nhất / khoảng tuỳ chọn (CUSTOM) -> không có đơn vị lịch để bám theo, nên lấy đúng số ngày
 *   đó liền kề trước ngày bắt đầu.
 * - Toàn thời gian -> không có "kỳ trước", trả về null.
 * Trả { apiFrom, apiTo } hoặc null (không so sánh được, hoặc bộ lọc đang lỗi/thiếu ngày).
 */
export function getPreviousPeriodRange(state, now = new Date()) {
  const { period } = state;
  if (period === 'ALL') return null;

  const { range, error } = resolvePeriodRange(state, now);
  if (error || !range.apiFrom || !range.apiTo) return null;

  if (period === 'TODAY' || period === 'DAY') {
    const day = addDays(range.apiFrom, -1);
    return { apiFrom: day, apiTo: day };
  }

  if (period === 'WEEK' || period === 'WEEK_PICK') {
    return { apiFrom: addDays(range.apiFrom, -7), apiTo: addDays(range.apiTo, -7) };
  }

  if (period === 'MONTH' || period === 'MONTH_PICK') {
    const prevMonth = shiftMonth(range.apiFrom.slice(0, 7), -1);
    const [py, pm] = prevMonth.split('-').map(Number);
    const clippedDay = Math.min(Number(range.apiTo.slice(8, 10)), daysInMonth(py, pm));
    return { apiFrom: `${prevMonth}-01`, apiTo: `${prevMonth}-${String(clippedDay).padStart(2, '0')}` };
  }

  if (period === 'YEAR' || period === 'YEAR_PICK') {
    const prevYear = Number(range.apiFrom.slice(0, 4)) - 1;
    const month = Number(range.apiTo.slice(5, 7));
    const clippedDay = Math.min(Number(range.apiTo.slice(8, 10)), daysInMonth(prevYear, month));
    return {
      apiFrom: `${prevYear}-01-01`,
      apiTo: `${prevYear}-${String(month).padStart(2, '0')}-${String(clippedDay).padStart(2, '0')}`,
    };
  }

  // LAST30 / CUSTOM (và bất kỳ kỳ nào không bám theo đơn vị lịch nào): đúng số ngày đó, liền kề trước
  const days = Math.round((Date.parse(`${range.apiTo}T00:00:00Z`) - Date.parse(`${range.apiFrom}T00:00:00Z`)) / 86400000) + 1;
  const prevTo = addDays(range.apiFrom, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { apiFrom: prevFrom, apiTo: prevTo };
}
