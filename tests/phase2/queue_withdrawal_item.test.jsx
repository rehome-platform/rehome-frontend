import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import { WORK_TYPES } from '../../src/features/moderator/pages/ConsignmentQueuePage.config.js';
import { QUEUE_TYPE_LABELS, taskTypeLabel } from '../../src/features/moderator/models/queueModel.js';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';

const auth = vi.hoisted(() => ({
  user: { id: 'mod-1', role: 'moderator', warehouseId: 'wh-1' },
  isAuthenticated: true,
}));
vi.mock('../../src/context/AuthContext.jsx', () => ({ useAuth: () => auth }));

vi.mock('../../src/features/moderator/services/warehouseApi.js', () => ({
  queueService: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'q-with-1',
        queueId: 'q-with-1',
        type: 'ITEM_WITHDRAWAL',
        refId: 'w-1',
        targetName: 'Áo thun Vintage',
        subjectSubtitle: 'Nguyễn Văn A · Miễn phí · Kệ: A1-02',
        createdAt: new Date().toISOString(),
      },
    ]),
    claim: vi.fn().mockResolvedValue({ id: 'q-with-1', claimedBy: 'mod-1' }),
    release: vi.fn().mockResolvedValue(true),
  },
}));

function Wrapper({ children }) {
  return (
    <MemoryRouter>
      <Phase2Provider>{children}</Phase2Provider>
    </MemoryRouter>
  );
}

describe('ConsignmentQueuePage - ITEM_WITHDRAWAL in Work Queue (HQ-01)', () => {
  it('defines ITEM_WITHDRAWAL in WORK_TYPES and QUEUE_TYPE_LABELS', () => {
    const itemWithdrawalType = WORK_TYPES.find((t) => t.key === 'ITEM_WITHDRAWAL');
    expect(itemWithdrawalType).toBeDefined();
    expect(itemWithdrawalType.label).toBe('Yêu cầu rút hàng');

    expect(QUEUE_TYPE_LABELS.ITEM_WITHDRAWAL).toBe('Yêu cầu rút hàng');
    expect(taskTypeLabel({ type: 'ITEM_WITHDRAWAL' })).toBe('Yêu cầu rút hàng');
  });

  it('renders tab for Yêu cầu rút hàng and displays item', async () => {
    render(<ConsignmentQueuePage />, { wrapper: Wrapper });

    // Tab should be rendered
    const tabBtn = screen.getByRole('tab', { name: 'Yêu cầu rút hàng' });
    expect(tabBtn).toBeInTheDocument();

    // Click tab
    fireEvent.click(tabBtn);

    // Queue item should appear
    const itemText = await screen.findByText('Áo thun Vintage');
    expect(itemText).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Văn A · Miễn phí · Kệ: A1-02/i)).toBeInTheDocument();
  });
});
