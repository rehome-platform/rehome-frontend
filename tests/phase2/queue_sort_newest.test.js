import { describe, expect, it } from 'vitest';
import { sortQueueItemsNewestFirst } from '../../src/features/moderator/models/queueModel.js';

describe('Task 2: Sort queue tasks by newest creation time', () => {
  it('sorts items descending by createdAt or queuedAt and places missing timestamps last', () => {
    const items = [
      { queueId: 'q-old', createdAt: '2026-11-18T08:00:00Z' },
      { queueId: 'q-missing' },
      { queueId: 'q-newest', createdAt: '2026-11-19T12:30:00Z' },
      { queueId: 'q-mid', queuedAt: '2026-11-19T09:00:00Z' },
      { queueId: 'q-invalid', createdAt: 'not-a-date' },
    ];

    const originalOrder = items.map((i) => i.queueId);
    const sorted = sortQueueItemsNewestFirst(items);

    expect(sorted.map((i) => i.queueId)).toEqual([
      'q-newest',
      'q-mid',
      'q-old',
      'q-missing',
      'q-invalid',
    ]);
    // Does not mutate input array
    expect(items.map((i) => i.queueId)).toEqual(originalOrder);
  });
});
