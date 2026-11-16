import { useMemo, useState } from 'react';
import {
  getPeriodDateRange,
  getPreviousPeriodLabel,
  getPreviousPeriodRange,
  getVietnamIsoWeek,
  getVietnamToday,
  resolvePeriodRange,
} from '../utils/adminDateUtils.js';

/**
 * Trạng thái bộ lọc thời gian dùng chung cho các khối Admin có số liệu theo kỳ (thẻ doanh thu, biểu đồ,
 * sổ quỹ, tăng trưởng tài khoản). Mỗi khối gọi hook này riêng nên bộ lọc của chúng độc lập với nhau.
 *
 * Chọn nhanh: TODAY | WEEK | MONTH | LAST30 | YEAR | ALL.
 * Chọn cụ thể: DAY (một ngày) | WEEK_PICK (một tuần) | MONTH_PICK (một tháng) | YEAR_PICK (một năm) | CUSTOM (từ - đến).
 * Mọi ngày tính theo lịch Việt Nam (xem adminDateUtils).
 */
export default function useAdminPeriod(initialPeriod = 'MONTH') {
  const initial = useMemo(() => {
    const today = getVietnamToday();
    return {
      today,
      month: getPeriodDateRange('MONTH'),
      week: getVietnamIsoWeek(),
      yearMonth: today.slice(0, 7),
      year: today.slice(0, 4),
    };
  }, []);

  const [period, setPeriod] = useState(initialPeriod);
  const [customFrom, setCustomFrom] = useState(initial.month.exportFrom);
  const [customTo, setCustomTo] = useState(initial.month.exportTo);
  const [pickedDay, setPickedDay] = useState(initial.today);
  const [pickedWeek, setPickedWeek] = useState(initial.week);
  const [pickedMonth, setPickedMonth] = useState(initial.yearMonth);
  const [pickedYear, setPickedYear] = useState(initial.year);

  const { range: activeRange, error: dateError } = useMemo(
    () =>
      resolvePeriodRange({
        period,
        customFrom,
        customTo,
        pickedDay,
        pickedWeek,
        pickedMonth,
        pickedYear,
      }),
    [period, customFrom, customTo, pickedDay, pickedWeek, pickedMonth, pickedYear]
  );

  // Kỳ liền trước để so sánh tăng trưởng % (xem getPreviousPeriodRange); null khi không so sánh được
  // (period = ALL) hoặc bộ lọc đang có lỗi/thiếu ngày.
  const previousRange = useMemo(
    () =>
      dateError
        ? null
        : getPreviousPeriodRange({
            period,
            customFrom,
            customTo,
            pickedDay,
            pickedWeek,
            pickedMonth,
            pickedYear,
          }),
    [period, customFrom, customTo, pickedDay, pickedWeek, pickedMonth, pickedYear, dateError]
  );
  const previousPeriodLabel = getPreviousPeriodLabel(period);

  return {
    period,
    setPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    pickedDay,
    setPickedDay,
    pickedWeek,
    setPickedWeek,
    pickedMonth,
    setPickedMonth,
    pickedYear,
    setPickedYear,
    // Mốc "hôm nay" để chặn chọn thời gian ở tương lai
    limits: {
      day: initial.today,
      week: initial.week,
      month: initial.yearMonth,
      year: Number(initial.year),
    },
    dateError,
    activeRange,
    previousRange,
    previousPeriodLabel,
  };
}
