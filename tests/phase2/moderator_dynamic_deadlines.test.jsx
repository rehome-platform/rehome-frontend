import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Phase2Provider, usePhase2 } from '../../src/features/moderator/hooks/warehouseHooks.jsx';
import { consignmentService, inventoryService, queueService } from '../../src/features/moderator/services/warehouseApi.js';
import { normalizeConsignmentForm } from '../../src/features/moderator/models/consignmentModel.js';
import { saveEffectiveConsignmentConfig } from '../../src/configs/systemParams.config.js';
import ConsignmentDetailPage from '../../src/features/moderator/pages/ConsignmentDetailPage.jsx';
import InventoryDetailPage from '../../src/features/moderator/pages/InventoryDetailPage.jsx';
import { CounterHandoverTask } from '../../src/features/moderator/components/counter/CounterHandoverTask.jsx';
import { WithdrawalCheckModal } from '../../src/features/moderator/components/queue/QueueSections.jsx';
import { DegradedCaseSummary } from '../../src/features/moderator/components/DegradedCaseDetails.jsx';
import { formatCountdown, formatDeadlineWithCountdown } from '../../src/features/moderator/components/WarehouseUi.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'mod-a', role: 'staff', warehouseId: 'warehouse-a' },
    isAuthenticated: true,
  }),
}));

const pendingForm = {
  id: 'form-deadline', formId: 'form-deadline', name: 'Áo ký gửi',
  status: 'PENDING', allowedActions: ['APPROVE', 'REJECT'], claimedBy: 'mod-a',
};

function renderPage(path, route, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Phase2Provider>
        <Routes><Route path={route} element={element} /></Routes>
      </Phase2Provider>
    </MemoryRouter>,
  );
}

describe('Moderator uses stored consignment deadlines', () => {
  it.each([
    ['approval response', { bringInDeadline: '2026-12-19' }],
    ['detail reload', {}],
  ])('shows the actual deadline from %s after approval', async (_, response) => {
    const approved = {
      ...pendingForm, status: 'APPROVED', allowedActions: [],
      bringInDeadline: '2026-12-19', bringDeadline: '2026-12-19',
    };
    vi.spyOn(consignmentService, 'read')
      .mockResolvedValueOnce(pendingForm).mockResolvedValue(approved);
    vi.spyOn(queueService, 'approve').mockResolvedValue({ status: 'APPROVED', ...response });

    renderPage('/moderator/consignments/form-deadline', '/moderator/consignments/:formId', <ConsignmentDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Duyệt form/ }));

    expect(await screen.findByText(/Đã duyệt form ký gửi thành công.*19\/12\/2026/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Hạn mang đến kho').parentElement).toHaveTextContent('19/12/2026');
    });
    expect(screen.queryByText(/có 7 ngày/)).not.toBeInTheDocument();
  });

  it.each(['missing', 'failed'])('keeps approval successful when the detail deadline is %s', async (scenario) => {
    const read = vi.spyOn(consignmentService, 'read').mockResolvedValueOnce(pendingForm);
    if (scenario === 'failed') read.mockRejectedValue(new Error('Detail unavailable'));
    else read.mockResolvedValue({ ...pendingForm, status: 'APPROVED', allowedActions: [] });
    vi.spyOn(queueService, 'approve').mockResolvedValue({ status: 'APPROVED' });

    renderPage('/moderator/consignments/form-deadline', '/moderator/consignments/:formId', <ConsignmentDetailPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Duyệt form/ }));

    expect(await screen.findByText('Đã duyệt form ký gửi thành công!')).toBeInTheDocument();
    expect(screen.queryByText(/có 7 ngày/)).not.toBeInTheDocument();
  });

  it.each([
    [{}, 'Chưa có thông tin thời hạn'],
    [{ deadline: '2026-12-19T10:00:00Z' }, '19/12/2026'],
  ])('shows counter deadline data without inventing a duration (%j)', (item, expected) => {
    render(<CounterHandoverTask item={{ id: 'task-1', ...item }} context="END_OF_TERM_TAKE_BACK" setConfirmHandover={() => {}} />);
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
    expect(screen.queryByText(/30 ngày/)).not.toBeInTheDocument();
  });

  it.each([
    [undefined, undefined],
    [0, 'còn 0 ngày'],
    [12, 'còn 12 ngày'],
  ])('only shows remaining pickup days supplied by inventory (%s)', async (daysToTakeBack, expected) => {
    vi.spyOn(inventoryService, 'read').mockResolvedValue({
      id: 'product-1', sku: 'RH-1', name: 'Hàng cuối kỳ', decision: 'TAKE_BACK',
      status: 'WITHDRAWN', daysToTakeBack, degradedCaseId: null,
    });
    vi.spyOn(inventoryService, 'movements').mockResolvedValue([]);
    renderPage('/moderator/inventory/RH-1', '/moderator/inventory/:sku', <InventoryDetailPage />);

    const notice = await screen.findByText(/Khách đã chọn nhận lại hàng/);
    if (expected) expect(notice).toHaveTextContent(expected);
    else expect(notice).not.toHaveTextContent(/còn \d+ ngày/);
    expect(notice).not.toHaveTextContent('30 ngày');
  });

  it('formats countdowns accurately for future and expired deadlines', () => {
    const now = new Date('2026-11-11T10:00:00Z').getTime();
    expect(formatCountdown('2026-11-13T15:00:00Z', now)).toBe('còn 2 ngày 5 giờ');
    expect(formatCountdown('2026-11-11T13:30:00Z', now)).toBe('còn 3 giờ 30 phút');
    expect(formatCountdown('2026-11-11T10:25:00Z', now)).toBe('còn 25 phút');
    expect(formatCountdown('2026-11-10T10:00:00Z', now)).toBe('Đã quá hạn');
    expect(formatDeadlineWithCountdown(null, 'Chưa có thông tin thời hạn', now)).toBe('Chưa có thông tin thời hạn');
  });

  it('WithdrawalCheckModal uses stored pickupDeadline with countdown and does not invent +7 days from createdAt', () => {
    const { rerender } = render(
      <MemoryRouter>
        <WithdrawalCheckModal
          target={{
            id: 'w-no-deadline',
            targetName: 'Áo sơ mi Linen',
            createdAt: '2026-11-01T10:00:00Z',
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('Chưa có thông tin thời hạn')).toBeInTheDocument();
    expect(screen.queryByText(/7 ngày kể từ ngày yêu cầu/)).not.toBeInTheDocument();

    const futureDeadline = new Date(Date.now() + (3 * 24 + 4) * 3600000).toISOString();
    rerender(
      <MemoryRouter>
        <WithdrawalCheckModal
          target={{
            id: 'w-with-deadline',
            targetName: 'Áo sơ mi Linen',
            pickupDeadline: futureDeadline,
          }}
          onClose={() => {}}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/còn 3 ngày/)).toBeInTheDocument();
  });

  it('DegradedCaseSummary displays countdown on decisionDeadline and pickupDeadline', () => {
    const futureDecision = new Date(Date.now() + 2 * 24 * 3600000).toISOString();
    const futurePickup = new Date(Date.now() + 5 * 24 * 3600000).toISOString();
    render(
      <DegradedCaseSummary
        item={{
          id: 'dc-1',
          productName: 'Túi da',
          productId: 'P-1',
          decision: 'PARTIAL_WITH_ITEM_BACK',
          decisionDeadline: futureDecision,
          pickupDeadline: futurePickup,
        }}
      />
    );
    expect(screen.getByText(/Hạn chọn phương án:.*còn/)).toBeInTheDocument();
    expect(screen.getByText(/Hạn nhận hàng:.*còn/)).toBeInTheDocument();
  });

  it('ConsignmentDetailPage reflects backend consignmentConfig termLengthDays (e.g. 20 days) in term schedule and options', async () => {
    localStorage.clear();
    const inspectingForm = normalizeConsignmentForm({
      id: 'form-zara',
      productName: 'Áo khoác Zara',
      status: 'INSPECTING',
      claimedBy: 'mod-a',
      member: { id: 'member-1', fullName: 'Nguyễn An', memberCode: 'MB-001' },
      consignmentConfig: {
        termLengthDays: 20,
        maxRenewals: 2,
        freeWithdrawalWindowDays: 7,
        floorPriceRatio: 0.5,
        commissionRateTerm1: 0.1,
        commissionRateTerm2: 0.15,
        commissionRateTerm3: 0.2,
      },
    });
    vi.spyOn(consignmentService, 'read').mockResolvedValue(inspectingForm);

    function IdentitySetter() {
      const { setIdentity } = usePhase2();
      React.useEffect(() => {
        setIdentity({ memberId: 'member-1', memberCode: 'MB-001', identityToken: 'token-1' });
      }, [setIdentity]);
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/moderator/consignments/form-zara']}>
        <Phase2Provider>
          <IdentitySetter />
          <Routes>
            <Route path="/moderator/consignments/:formId" element={<ConsignmentDetailPage />} />
          </Routes>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const priceInput = await screen.findByLabelText(/Giá chốt thỏa thuận/i);
    fireEvent.change(priceInput, { target: { value: '500000' } });

    expect(screen.getByText('Ngày 0 – 20')).toBeInTheDocument();
    expect(screen.getByText('Ngày 21 – 40')).toBeInTheDocument();
    expect(screen.getByText('Ngày 41 – 60')).toBeInTheDocument();
    expect(screen.queryByText('Ngày 0 – 30')).not.toBeInTheDocument();
    expect(screen.getByText(/Mặc định mỗi kỳ 20 ngày, tối đa 2 lần gia hạn \(tổng 3 kỳ · 60 ngày\)\./)).toBeInTheDocument();

    const termSelect = screen.getByLabelText(/Độ dài kỳ ký gửi/i);
    expect(termSelect).toHaveTextContent('20 ngày / kỳ (tối đa 2 lần gia hạn)');
  });

  it('ConsignmentDetailPage falls back to synced Admin consignment config when backend detail omits consignmentConfig', async () => {
    localStorage.clear();
    saveEffectiveConsignmentConfig({
      consignment: { termDays: 20, maxRenewals: 2, freeWithdrawalDays: 7 },
      pricingAndCommission: {
        floorPricePercent: 50,
        commissionTerm1: 10,
        commissionTerm2: 15,
        commissionTerm3: 20,
      },
    });

    const inspectingForm = normalizeConsignmentForm({
      id: 'form-zara-2',
      productName: 'Áo khoác Zara',
      status: 'INSPECTING',
      claimedBy: 'mod-a',
      member: { id: 'member-1', fullName: 'Nguyễn An', memberCode: 'MB-001' },
    });
    vi.spyOn(consignmentService, 'read').mockResolvedValue(inspectingForm);

    function IdentitySetter() {
      const { setIdentity } = usePhase2();
      React.useEffect(() => {
        setIdentity({ memberId: 'member-1', memberCode: 'MB-001', identityToken: 'token-1' });
      }, [setIdentity]);
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/moderator/consignments/form-zara-2']}>
        <Phase2Provider>
          <IdentitySetter />
          <Routes>
            <Route path="/moderator/consignments/:formId" element={<ConsignmentDetailPage />} />
          </Routes>
        </Phase2Provider>
      </MemoryRouter>,
    );

    const priceInput = await screen.findByLabelText(/Giá chốt thỏa thuận/i);
    fireEvent.change(priceInput, { target: { value: '500000' } });

    expect(screen.getByText('Ngày 0 – 20')).toBeInTheDocument();
    expect(screen.getByText('Ngày 21 – 40')).toBeInTheDocument();
    expect(screen.getByText('Ngày 41 – 60')).toBeInTheDocument();
    localStorage.clear();
  });
});
