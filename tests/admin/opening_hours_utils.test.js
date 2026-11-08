import { describe, it, expect } from 'vitest';
import {
  DAYS_OF_WEEK,
  formatOpeningHours,
  parseOpeningHours,
} from '../../src/features/admin/utils/openingHoursUtils.js';

describe('openingHoursUtils', () => {
  it('formats opening hours with default all 7 days', () => {
    const formatted = formatOpeningHours('08:00', '20:00', DAYS_OF_WEEK);
    expect(formatted).toBe('08:00 - 20:00 (Thứ 2 - Chủ nhật)');
  });

  it('formats opening hours for Monday to Saturday', () => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const formatted = formatOpeningHours('08:30', '18:00', days);
    expect(formatted).toBe('08:30 - 18:00 (Thứ 2 - Thứ 7)');
  });

  it('formats opening hours for Monday to Friday', () => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];
    const formatted = formatOpeningHours('09:00', '17:30', days);
    expect(formatted).toBe('09:00 - 17:30 (Thứ 2 - Thứ 6)');
  });

  it('formats custom days', () => {
    const days = ['Thứ 2', 'Thứ 4', 'Thứ 6'];
    const formatted = formatOpeningHours('08:00', '12:00', days);
    expect(formatted).toBe('08:00 - 12:00 (Thứ 2, Thứ 4, Thứ 6)');
  });

  it('parses complete string with Monday to Sunday', () => {
    const parsed = parseOpeningHours('08:00-20:00 (Thứ 2 - Chủ nhật)');
    expect(parsed.openTime).toBe('08:00');
    expect(parsed.closeTime).toBe('20:00');
    expect(parsed.selectedDays).toEqual(DAYS_OF_WEEK);
  });

  it('parses string with Monday to Saturday', () => {
    const parsed = parseOpeningHours('08:00 - 18:00 (Thứ 2 - Thứ 7)');
    expect(parsed.openTime).toBe('08:00');
    expect(parsed.closeTime).toBe('18:00');
    expect(parsed.selectedDays).toEqual(['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']);
  });

  it('parses legacy string without days safely', () => {
    const parsed = parseOpeningHours('07:30 - 20:30');
    expect(parsed.openTime).toBe('07:30');
    expect(parsed.closeTime).toBe('20:30');
    expect(parsed.selectedDays).toEqual(DAYS_OF_WEEK);
  });

  it('parses invalid/empty string to sensible defaults', () => {
    const parsed = parseOpeningHours('');
    expect(parsed.openTime).toBe('08:00');
    expect(parsed.closeTime).toBe('20:00');
    expect(parsed.selectedDays).toEqual(DAYS_OF_WEEK);
  });
});

