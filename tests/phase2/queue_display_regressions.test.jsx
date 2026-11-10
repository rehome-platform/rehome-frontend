import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Phase2Provider } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { inventoryService, queueService, skuLabelService } from '../../src/features/moderator/services/warehouseApi.js';
import WarehouseHomePage from '../../src/features/moderator/pages/WarehouseHomePage.jsx';
import ConsignmentPrintQueuePage from '../../src/features/moderator/pages/ConsignmentPrintQueuePage.jsx';
import { ConsignmentSummary } from '../../src/features/moderator/components/consignment/ConsignmentDetailSections.jsx';
import { QueueClaimDialog, QueueReleaseDialog } from '../../src/features/moderator/components/queue/QueueSections.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' } }),
}));

function renderPage(page) {
  return render(<MemoryRouter><Phase2Provider>{page}</Phase2Provider></MemoryRouter>);
}

describe('Moderator queue display regressions', () => {
  it('shows the backend target and member name with a day/hour wait on the dashboard', async () => {
    const now = new Date('2026-11-07T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    vi.spyOn(inventoryService, 'list').mockResolvedValue([]);
    vi.spyOn(queueService, 'list').mockImplementation(async ({ type }) => type === 'FORM_REVIEW' ? [{
      queueId: 'queue-1', refId: 'form-1', formId: 'form-1', type,
      targetName: 'Áo khoác len', subjectSubtitle: 'Nguyễn Minh An', claimedBy: null,
      createdAt: '2026-11-06T11:00:00Z',
    }] : []);
    renderPage(<WarehouseHomePage />);
    const row = (await screen.findByText('form-1')).closest('tr');
    expect(within(row).getByText('Áo khoác len')).toBeInTheDocument();
    expect(within(row).getByText('Nguyễn Minh An')).toBeInTheDocument();
    expect(within(row).getByText('1 ngày 1 giờ')).toBeInTheDocument();
  });

  it('places the empty print-queue message inside a full-width table cell once', async () => {
    vi.spyOn(skuLabelService, 'list').mockResolvedValue([]);
    renderPage(<ConsignmentPrintQueuePage />);
    const message = await screen.findByText('Chưa có dữ liệu phù hợp.');
    expect(message.closest('td')).toHaveAttribute('colspan', '6');
    expect(message.closest('tbody')).not.toBeNull();
    expect(screen.getAllByText('Chưa có dữ liệu phù hợp.')).toHaveLength(1);
  });

  it('does not invent a brand when the form has none', () => {
    render(<ConsignmentSummary form={{ name: 'Áo chưa rõ thương hiệu' }} />);
    const brandRow = screen.getByText('Thương hiệu').parentElement;
    expect(within(brandRow).getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('Uniqlo')).not.toBeInTheDocument();
  });

  it('uses day/hour waits in the claim dialog', () => {
    render(<QueueClaimDialog claimTarget={{ queueId: 'q-1', name: 'Áo', hours: 25 }} resource={{}} />);
    expect(screen.getByText(/Áo · chờ 1 ngày 1 giờ/)).toBeInTheDocument();
  });

  it('uses claim age rather than queue age in the release dialog', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-07T12:00:00Z').getTime());
    render(<QueueReleaseDialog releaseTarget={{
      queueId: 'q-1', name: 'Áo', hours: 48, claimedAt: '2026-11-06T11:00:00Z',
    }} resource={{}} />);
    expect(screen.getByText(/Áo · Bạn đang nhận việc này 1 ngày 1 giờ/)).toBeInTheDocument();
  });
});
