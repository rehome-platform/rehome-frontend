import React from 'react';

const YEAR_CHOICES = 6; // năm hiện tại và 5 năm trước đó

const INPUT_CLASS =
  'rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 disabled:opacity-50';

/**
 * Bộ lọc khoảng thời gian dùng chung của các trang Admin (xem useAdminPeriod).
 *
 * - Chọn nhanh: hôm nay, tuần này, tháng này, 30 ngày gần nhất, năm nay, toàn thời gian.
 * - Chọn cụ thể: một ngày, một tuần, một tháng, một năm, hoặc khoảng từ ngày - đến ngày.
 *
 * `name` thêm hậu tố vào tên truy cập (aria-label) để nhiều bộ lọc cùng nằm trên một trang vẫn phân biệt được,
 * ví dụ name="biểu đồ" -> "Khoảng thời gian biểu đồ". `allowAll=false` ẩn "Toàn thời gian" (khối không hỗ trợ).
 * `label` đổi chữ hiển thị (và cả aria-label) khi bộ lọc lọc theo một mốc cụ thể hơn là "khoảng thời gian"
 * chung chung, ví dụ label="Ngày tạo" ở trang Tài khoản (lọc theo ngày tạo tài khoản).
 * `children` là chỗ đặt nút hành động đi kèm (ví dụ Xuất báo cáo Excel).
 */
export default function AdminPeriodFilter({
  filter, disabled = false, name = '', allowAll = true, label = 'Khoảng thời gian', children,
}) {
  const {
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
    limits,
  } = filter;
  const suffix = name ? ` ${name}` : '';
  const years = Array.from({ length: YEAR_CHOICES }, (_, i) => String(limits.year - i));

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex items-center gap-2 text-xs text-[#414942]">
        <span className="shrink-0">{label}</span>
        <select
          aria-label={`${label}${suffix}`}
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          disabled={disabled}
          className={INPUT_CLASS}
        >
          <optgroup label="Chọn nhanh">
            <option value="TODAY">Hôm nay</option>
            <option value="WEEK">Tuần này</option>
            <option value="MONTH">Tháng này</option>
            <option value="LAST30">30 ngày gần nhất</option>
            <option value="YEAR">Năm nay</option>
            {allowAll && <option value="ALL">Toàn thời gian</option>}
          </optgroup>
          <optgroup label="Chọn cụ thể">
            <option value="DAY">Một ngày</option>
            <option value="WEEK_PICK">Một tuần</option>
            <option value="MONTH_PICK">Một tháng</option>
            <option value="YEAR_PICK">Một năm</option>
            <option value="CUSTOM">Từ ngày - đến ngày</option>
          </optgroup>
        </select>
      </label>

      {period === 'DAY' && (
        <label className="flex flex-col gap-1 text-xs text-[#414942]">
          <span>Ngày</span>
          <input
            type="date"
            aria-label={`Chọn ngày${suffix}`}
            value={pickedDay}
            max={limits.day}
            onChange={(e) => setPickedDay(e.target.value)}
            disabled={disabled}
            className={INPUT_CLASS}
          />
        </label>
      )}

      {period === 'WEEK_PICK' && (
        <label className="flex flex-col gap-1 text-xs text-[#414942]">
          <span>Tuần</span>
          <input
            type="week"
            aria-label={`Chọn tuần${suffix}`}
            value={pickedWeek}
            max={limits.week}
            onChange={(e) => setPickedWeek(e.target.value)}
            disabled={disabled}
            className={INPUT_CLASS}
          />
        </label>
      )}

      {period === 'MONTH_PICK' && (
        <label className="flex flex-col gap-1 text-xs text-[#414942]">
          <span>Tháng</span>
          <input
            type="month"
            aria-label={`Chọn tháng${suffix}`}
            value={pickedMonth}
            max={limits.month}
            onChange={(e) => setPickedMonth(e.target.value)}
            disabled={disabled}
            className={INPUT_CLASS}
          />
        </label>
      )}

      {period === 'YEAR_PICK' && (
        <label className="flex flex-col gap-1 text-xs text-[#414942]">
          <span>Năm</span>
          <select
            aria-label={`Chọn năm${suffix}`}
            value={pickedYear}
            onChange={(e) => setPickedYear(e.target.value)}
            disabled={disabled}
            className={INPUT_CLASS}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      )}

      {period === 'CUSTOM' && (
        <>
          <label className="flex flex-col gap-1 text-xs text-[#414942]">
            <span>Từ ngày</span>
            <input
              type="date"
              aria-label={`Từ ngày${suffix}`}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              disabled={disabled}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#414942]">
            <span>Đến ngày</span>
            <input
              type="date"
              aria-label={`Đến ngày${suffix}`}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              disabled={disabled}
              className={INPUT_CLASS}
            />
          </label>
        </>
      )}

      {children}
    </div>
  );
}
