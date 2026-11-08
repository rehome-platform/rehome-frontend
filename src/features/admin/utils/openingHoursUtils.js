export const DAYS_OF_WEEK = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật',
];

export const DAY_SHORT_LABELS = {
  'Thứ 2': 'T2',
  'Thứ 3': 'T3',
  'Thứ 4': 'T4',
  'Thứ 5': 'T5',
  'Thứ 6': 'T6',
  'Thứ 7': 'T7',
  'Chủ nhật': 'CN',
};

/**
 * Ghép giờ mở - đóng cửa và các ngày thành chuỗi chuẩn cho backend
 * Ví dụ: "08:00 - 20:00 (Thứ 2 - Chủ nhật)"
 */
export function formatOpeningHours(openTime = '08:00', closeTime = '20:00', selectedDays = DAYS_OF_WEEK) {
  const cleanOpen = (openTime || '08:00').trim();
  const cleanClose = (closeTime || '20:00').trim();
  const timePart = `${cleanOpen} - ${cleanClose}`;

  if (!selectedDays || selectedDays.length === 0 || selectedDays.length === 7) {
    return `${timePart} (Thứ 2 - Chủ nhật)`;
  }

  const isMonToSat =
    selectedDays.length === 6 &&
    !selectedDays.includes('Chủ nhật');
  if (isMonToSat) {
    return `${timePart} (Thứ 2 - Thứ 7)`;
  }

  const isMonToFri =
    selectedDays.length === 5 &&
    !selectedDays.includes('Thứ 7') &&
    !selectedDays.includes('Chủ nhật');
  if (isMonToFri) {
    return `${timePart} (Thứ 2 - Thứ 6)`;
  }

  // Sắp xếp theo đúng thứ tự tuần
  const sortedDays = DAYS_OF_WEEK.filter((d) => selectedDays.includes(d));
  return `${timePart} (${sortedDays.join(', ')})`;
}

/**
 * Phân tích chuỗi openingHours thành { openTime, closeTime, selectedDays }
 */
export function parseOpeningHours(rawStr) {
  const defaults = {
    openTime: '08:00',
    closeTime: '20:00',
    selectedDays: [...DAYS_OF_WEEK],
  };

  if (!rawStr || typeof rawStr !== 'string') {
    return defaults;
  }

  const str = rawStr.trim();
  const timeMatch = str.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  let openTime = defaults.openTime;
  let closeTime = defaults.closeTime;

  if (timeMatch) {
    openTime = timeMatch[1].padStart(5, '0');
    closeTime = timeMatch[2].padStart(5, '0');
  }

  const parenMatch = str.match(/\((.*?)\)/);
  if (!parenMatch) {
    return {
      openTime,
      closeTime,
      selectedDays: defaults.selectedDays,
    };
  }

  const daysPart = parenMatch[1].trim();

  if (
    daysPart.includes('Thứ 2 - Chủ nhật') ||
    daysPart.includes('T2 - CN') ||
    daysPart.includes('T2-CN') ||
    daysPart.toLowerCase().includes('hàng ngày') ||
    daysPart.toLowerCase().includes('cả tuần')
  ) {
    return { openTime, closeTime, selectedDays: [...DAYS_OF_WEEK] };
  }

  if (daysPart.includes('Thứ 2 - Thứ 7') || daysPart.includes('T2 - T7') || daysPart.includes('T2-T7')) {
    return {
      openTime,
      closeTime,
      selectedDays: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
    };
  }

  if (daysPart.includes('Thứ 2 - Thứ 6') || daysPart.includes('T2 - T6') || daysPart.includes('T2-T6')) {
    return {
      openTime,
      closeTime,
      selectedDays: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'],
    };
  }

  const matchedDays = DAYS_OF_WEEK.filter((day) => daysPart.includes(day));
  if (matchedDays.length > 0) {
    return { openTime, closeTime, selectedDays: matchedDays };
  }

  return { openTime, closeTime, selectedDays: defaults.selectedDays };
}

