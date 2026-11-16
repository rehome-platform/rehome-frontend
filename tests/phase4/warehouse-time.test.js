import { expect, it } from 'vitest';
import { warehouseDateTime, waitingDuration } from '../../src/features/moderator/models/warehouseTime.js';

it('formats server timestamps in Vietnam even when the browser timezone differs', () => {
  const value = warehouseDateTime('2026-11-14T01:05:00Z');
  expect(value).toContain('08:05');
  expect(value).toContain('14/11/26');
});
it('preserves zero and uses a missing state instead of sample waiting times', () => {
  expect(waitingDuration(0)).toBe('0 phút');
  expect(waitingDuration(125)).toBe('2 giờ 5 phút');
  expect(waitingDuration(null)).toBe('Chưa có thông tin');
  expect(warehouseDateTime('invalid')).toBe('Chưa có thông tin');
});
