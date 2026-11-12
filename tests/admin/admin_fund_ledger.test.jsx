import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminFundLedgerSection from '../../src/features/admin/components/AdminFundLedgerSection.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getFundReconciliation: vi.fn(),
    getFundLedger: vi.fn(),
  },
}));

describe('AdminFundLedgerSection', () => {
  const balancedRec = {
    status: 'BALANCED',
    difference: 0,
    fundBalance: 3000000,
    ledgerBalance: 3000000,
    memberWalletBalance: 2000000,
    memberLedgerBalance: 2000000,
    memberDifference: 0,
    ledgerNetTotal: 0,
    unmatchedEntries: 0,
    unbalancedPairs: 0,
    checkedAt: '2026-11-11T10:15:00Z',
  };

  const samplePage = {
    content: [
      {
        id: 'tx-1',
        transactionNo: 'FTX-1001',
        type: 'ORDER_PAYOUT',
        amount: -900000,
        balanceAfter: 2100000,
        status: 'SUCCESS',
        note: 'Giải ngân cho người bán',
        createdAt: '2026-11-11T09:00:00Z',
        relatedAccount: { accountId: 'acc-1', email: 'seller@rehome.vn' },
        referenceTransaction: { id: 'mtx-1', transactionNo: 'MTX-9001', type: 'ORDER_PAYOUT', amount: 900000 },
        relatedOrderId: 'ord-1',
        relatedOrderNo: 'ORD-2026-001',
        commissionAmount: 100000,
      },
      {
        id: 'tx-2',
        transactionNo: 'FTX-1000',
        type: 'COMMISSION_REVENUE',
        amount: 100000,
        balanceAfter: 3000000,
        status: 'SUCCESS',
        note: 'Thu hoa hồng',
        createdAt: '2026-11-11T08:30:00Z',
        relatedAccount: null,
        referenceTransaction: null,
        relatedOrderNo: null,
        commissionAmount: null,
      },
    ],
    page: 0,
    size: 10,
    totalElements: 12,
    totalPages: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getFundReconciliation.mockResolvedValue(balancedRec);
    adminApi.getFundLedger.mockResolvedValue(samplePage);
  });

  it('renders balanced reconciliation status, checked time, and ledger entries including null legacy counterparts', async () => {
    render(<AdminFundLedgerSection from="2026-11-01" to="2026-11-11" />);

    expect(await screen.findByText('Đối soát: Khớp')).toBeInTheDocument();
    expect(screen.getByText('FTX-1001')).toBeInTheDocument();
    expect(screen.getByText('seller@rehome.vn')).toBeInTheDocument();
    expect(screen.getByText('MTX-9001')).toBeInTheDocument();
    expect(screen.getByText(/ORD-2026-001/)).toBeInTheDocument();
    expect(screen.getByText('FTX-1000')).toBeInTheDocument();

    const region = screen.getByRole('region', { name: 'Bảng bút toán sổ quỹ nền tảng' });
    expect(region).toHaveAttribute('tabindex', '0');

    expect(adminApi.getFundLedger).toHaveBeenCalledWith({
      from: '2026-11-01',
      to: '2026-11-11',
      type: undefined,
      page: 0,
      size: 10,
    });
  });

  it('renders MISMATCHED reconciliation status with difference values and supports manual re-check', async () => {
    adminApi.getFundReconciliation
      .mockResolvedValueOnce({
        ...balancedRec,
        status: 'MISMATCHED',
        difference: 50000,
        memberDifference: -10000,
        ledgerNetTotal: 40000,
        unmatchedEntries: 2,
        unbalancedPairs: 1,
      })
      .mockResolvedValueOnce(balancedRec);

    render(<AdminFundLedgerSection from="2026-11-01" to="2026-11-11" />);

    expect(await screen.findByText('Đối soát: Có chênh lệch')).toBeInTheDocument();
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra lại/i }));
    expect(await screen.findByText('Đối soát: Khớp')).toBeInTheDocument();
    expect(adminApi.getFundReconciliation).toHaveBeenCalledTimes(2);
  });

  it('filters by transaction type, paginates, and ignores stale responses', async () => {
    let resolveSlow;
    adminApi.getFundLedger
      .mockResolvedValueOnce(samplePage)
      .mockResolvedValueOnce({
        content: [
          {
            id: 'tx-p2',
            transactionNo: 'FTX-PAGE2',
            type: 'WITHDRAWAL_FEE_REVENUE',
            amount: 25000,
            balanceAfter: 3025000,
            status: 'SUCCESS',
            note: 'Phí rút trang 2',
            createdAt: '2026-11-11T11:00:00Z',
            relatedAccount: null,
            referenceTransaction: null,
          },
        ],
        page: 1,
        size: 10,
        totalElements: 12,
        totalPages: 2,
      })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSlow = resolve; }))
      .mockResolvedValueOnce({
        content: [
          {
            id: 'tx-next',
            transactionNo: 'FTX-FAST',
            type: 'WITHDRAWAL_FEE_REVENUE',
            amount: 25000,
            balanceAfter: 3025000,
            status: 'SUCCESS',
            note: 'Phí rút nhanh',
            createdAt: '2026-11-11T11:00:00Z',
            relatedAccount: null,
            referenceTransaction: null,
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      });

    render(<AdminFundLedgerSection from="2026-11-01" to="2026-11-11" />);
    await screen.findByText('FTX-1001');

    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    expect(await screen.findByText('FTX-PAGE2')).toBeInTheDocument();
    expect(adminApi.getFundLedger).toHaveBeenLastCalledWith({
      from: '2026-11-01',
      to: '2026-11-11',
      type: undefined,
      page: 1,
      size: 10,
    });

    fireEvent.change(screen.getByLabelText('Lọc loại bút toán'), {
      target: { value: 'ORDER_PAYOUT' },
    });

    await waitFor(() =>
      expect(adminApi.getFundLedger).toHaveBeenLastCalledWith({
        from: '2026-11-01',
        to: '2026-11-11',
        type: 'ORDER_PAYOUT',
        page: 0,
        size: 10,
      })
    );

    fireEvent.change(screen.getByLabelText('Lọc loại bút toán'), {
      target: { value: 'WITHDRAWAL_FEE_REVENUE' },
    });
    expect(await screen.findByText('FTX-FAST')).toBeInTheDocument();

    resolveSlow({
      content: [
        {
          id: 'tx-stale',
          transactionNo: 'FTX-STALE',
          type: 'REFUND',
          amount: -1000,
          balanceAfter: 0,
          status: 'SUCCESS',
          createdAt: '2026-11-11T07:00:00Z',
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    });

    await waitFor(() => {
      expect(screen.queryByText('FTX-STALE')).not.toBeInTheDocument();
      expect(screen.getByText('FTX-FAST')).toBeInTheDocument();
    });
  });
});
