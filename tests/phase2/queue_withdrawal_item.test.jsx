import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ConsignmentQueuePage from '../../src/features/moderator/pages/ConsignmentQueuePage.jsx';
import CounterPage from '../../src/features/moderator/pages/CounterPage.jsx';
import { WORK_TYPES } from '../../src/features/moderator/pages/ConsignmentQueuePage.config.js';
import { QUEUE_TYPE_LABELS, taskTypeLabel } from '../../src/features/moderator/models/queueModel.js';
import { CounterHandoverTask } from '../../src/features/moderator/components/counter/CounterHandoverTask.jsx';
import { CounterHandoverDialog } from '../../src/features/moderator/components/counter/CounterSections.jsx';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { counterService, queueService } from '../../src/features/moderator/services/warehouseApi.js';

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
        type: 'WITHDRAWAL',
        refId: 'w-1',
        targetName: 'Áo thun Vintage',
        subjectSubtitle: 'Nguyễn Văn A · Miễn phí · Kệ: A1-02',
        memberCode: 'MB-001',
        accountId: 'acc-1',
        createdAt: new Date().toISOString(),
      },
    ]),
    claim: vi.fn().mockResolvedValue({ id: 'q-with-1', claimedBy: 'mod-1' }),
    release: vi.fn().mockResolvedValue(true),
  },
  counterService: {
    lookup: vi.fn().mockResolvedValue([
      {
        memberId: 'acc-1',
        memberCode: 'MB-001',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        avatarUrl: null,
      },
    ]),
    confirm: vi.fn().mockResolvedValue({ memberId: 'acc-1', identityToken: 'token-123' }),
    tasks: vi.fn().mockResolvedValue({
      pendingForms: [],
      pendingWithdrawals: [
        {
          id: 'w-1',
          productId: 'P-001',
          productName: 'Áo thun Vintage',
          sku: 'SKU-VTG-01',
          feeCharged: 0,
          pickupDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
        },
      ],
      pendingEndOfTerm: [],
    }),
    handover: vi.fn().mockResolvedValue({ success: true }),
  },
}));

function Wrapper({ children, initialEntries = ['/moderator/queue'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Phase2Provider>{children}</Phase2Provider>
    </MemoryRouter>
  );
}

describe('ConsignmentQueuePage - WITHDRAWAL in Work Queue (HQ-01)', () => {
  it('defines WITHDRAWAL in WORK_TYPES and QUEUE_TYPE_LABELS with label Rút hàng', () => {
    const withdrawalType = WORK_TYPES.find((t) => t.key === 'WITHDRAWAL');
    expect(withdrawalType).toBeDefined();
    expect(withdrawalType.label).toBe('Rút hàng');

    expect(QUEUE_TYPE_LABELS.WITHDRAWAL).toBe('Rút hàng');
    expect(taskTypeLabel({ type: 'WITHDRAWAL' })).toBe('Rút hàng');
  });

  it('renders tab for Rút hàng and displays item', async () => {
    render(<ConsignmentQueuePage />, { wrapper: Wrapper });

    // Tab "Rút hàng" should be rendered
    const tabBtn = screen.getByRole('tab', { name: 'Rút hàng' });
    expect(tabBtn).toBeInTheDocument();

    // Click tab
    fireEvent.click(tabBtn);

    // Queue item should appear
    const itemText = await screen.findByText('Áo thun Vintage');
    expect(itemText).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Văn A · Miễn phí · Kệ: A1-02/i)).toBeInTheDocument();
  });

  it('renders Mở việc link with memberCode and refId when task is claimed by moderator', async () => {
    queueService.list.mockResolvedValue([
      {
        id: 'q-with-1',
        queueId: 'q-with-1',
        type: 'WITHDRAWAL',
        refId: 'w-1',
        targetName: 'Áo thun Vintage',
        subjectSubtitle: 'Nguyễn Văn A · Miễn phí · Kệ: A1-02',
        memberCode: 'MB-001',
        accountId: 'acc-1',
        claimedBy: 'mod-1',
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]);

    render(<ConsignmentQueuePage />, { wrapper: Wrapper });

    const tabBtn = screen.getByRole('tab', { name: 'Rút hàng' });
    fireEvent.click(tabBtn);

    const openLink = await screen.findByRole('link', { name: /Mở việc/i });
    expect(openLink).toBeInTheDocument();
    expect(openLink.getAttribute('href')).toContain('/moderator/counter');
    expect(openLink.getAttribute('href')).toContain('refId=w-1');
    expect(openLink.getAttribute('href')).toContain('memberCode=MB-001');
    expect(openLink.getAttribute('href')).toContain('accountId=acc-1');
  });
});

describe('Counter Handover Flow - Reuse Existing Rút hàng giữa kỳ (BG-01)', () => {
  it('renders CounterHandoverTask with Bàn giao button for ITEM_WITHDRAWAL', () => {
    const setConfirmHandover = vi.fn();
    const item = {
      id: 'w-1',
      productId: 'P-001',
      productName: 'Áo thun Vintage',
      sku: 'SKU-VTG-01',
      feeCharged: 0,
      pickupDeadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    };

    render(
      <CounterHandoverTask
        item={item}
        context="ITEM_WITHDRAWAL"
        setConfirmHandover={setConfirmHandover}
      />
    );

    expect(screen.getByText('Áo thun Vintage')).toBeInTheDocument();
    expect(screen.getByText(/Hạn lấy:/i)).toBeInTheDocument();

    const handoverBtn = screen.getByRole('button', { name: /Bàn giao cho khách/i });
    expect(handoverBtn).toBeInTheDocument();

    fireEvent.click(handoverBtn);
    expect(setConfirmHandover).toHaveBeenCalledWith({ item, context: 'ITEM_WITHDRAWAL' });
  });

  it('renders CounterHandoverDialog with Xác nhận bàn giao and calls executeHandover', () => {
    const executeHandover = vi.fn();
    const setConfirmHandover = vi.fn();
    const confirmHandover = {
      item: {
        id: 'w-1',
        productId: 'P-001',
        productName: 'Áo thun Vintage',
        sku: 'SKU-VTG-01',
      },
      context: 'ITEM_WITHDRAWAL',
    };
    const selected = {
      memberId: 'acc-1',
      memberCode: 'MB-001',
      fullName: 'Nguyễn Văn A',
    };

    render(
      <CounterHandoverDialog
        confirmHandover={confirmHandover}
        selected={selected}
        handoverLoading={false}
        setConfirmHandover={setConfirmHandover}
        executeHandover={executeHandover}
      />
    );

    // Verify SKU match and check identity box
    const skuInput = screen.getByLabelText(/Nhập mã SKU/i);
    fireEvent.change(skuInput, { target: { value: 'SKU-VTG-01' } });

    const identityCheck = screen.getByRole('checkbox');
    fireEvent.click(identityCheck);

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận bàn giao' });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    expect(executeHandover).toHaveBeenCalledWith(confirmHandover.item, 'ITEM_WITHDRAWAL');
  });

  it('auto-lookups member and displays counter page when navigated with memberCode param', async () => {
    render(
      <Wrapper initialEntries={['/moderator/counter?memberCode=MB-001&refId=w-1']}>
        <CounterPage />
      </Wrapper>
    );

    await waitFor(() => {
      expect(counterService.lookup).toHaveBeenCalledWith(
        expect.objectContaining({ memberCode: 'MB-001' }),
        expect.anything()
      );
    });

    // Member profile should appear
    const memberHeadings = await screen.findAllByText('Nguyễn Văn A');
    expect(memberHeadings.length).toBeGreaterThan(0);
  });
});
