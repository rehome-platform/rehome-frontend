import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';
import adminApi from '../services/adminApi.js';

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại bút toán' },
  { value: 'ORDER_PAYMENT', label: 'Thanh toán đơn hàng' },
  { value: 'ORDER_PAYOUT', label: 'Trả tiền người bán' },
  { value: 'COMMISSION_REVENUE', label: 'Thu hoa hồng' },
  { value: 'WITHDRAWAL_FEE', label: 'Phí rút hàng (Member)' },
  { value: 'WITHDRAWAL_FEE_REVENUE', label: 'Thu phí rút hàng' },
  { value: 'WITHDRAWAL', label: 'Rút tiền về ngân hàng' },
  { value: 'REFUND', label: 'Hoàn tiền đơn hàng' },
  { value: 'DEGRADED_COMPENSATION', label: 'Đền bù hàng xuống cấp' },
];

const TYPE_LABELS = Object.fromEntries(
  TRANSACTION_TYPE_OPTIONS.filter((o) => o.value !== 'ALL').map((o) => [o.value, o.label])
);

const PAGE_SIZE = 10;

function formatSignedAmount(amount) {
  const num = Number(amount || 0);
  const absFormatted = formatCurrencyVND(Math.abs(num));
  if (num > 0) return `+${absFormatted}`;
  if (num < 0) return `-${absFormatted}`;
  return absFormatted;
}

/**
 * Nhật ký ghi sổ kép Quỹ nền tảng & Đối soát quỹ (GET /api/admin/fund/ledger & /reconciliation).
 * Nhận { from, to } đồng bộ từ bộ lọc chung của AdminDashboardPage.
 */
export default function AdminFundLedgerSection({ from, to }) {
  const [reconciliation, setReconciliation] = useState(null);
  const [recLoading, setRecLoading] = useState(true);
  const [recError, setRecError] = useState(null);

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [ledgerPage, setLedgerPage] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState(null);

  const recSeqRef = useRef(0);
  const ledgerSeqRef = useRef(0);

  const loadReconciliation = useCallback(async () => {
    const reqId = ++recSeqRef.current;
    try {
      setRecLoading(true);
      setRecError(null);
      const data = await adminApi.getFundReconciliation();
      if (reqId === recSeqRef.current) {
        setReconciliation(data || null);
      }
    } catch (err) {
      if (reqId === recSeqRef.current) {
        console.error('Lỗi tải đối soát quỹ:', err);
        setRecError('Không thể kiểm tra đối soát quỹ nền tảng.');
      }
    } finally {
      if (reqId === recSeqRef.current) {
        setRecLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadReconciliation();
  }, [loadReconciliation]);

  useEffect(() => {
    setPage(0);
  }, [from, to]);

  const loadLedger = useCallback(async (targetPage = page, targetType = typeFilter) => {
    const reqId = ++ledgerSeqRef.current;
    try {
      setLedgerLoading(true);
      setLedgerError(null);
      const data = await adminApi.getFundLedger({
        from,
        to,
        type: targetType === 'ALL' ? undefined : targetType,
        page: targetPage,
        size: PAGE_SIZE,
      });
      if (reqId === ledgerSeqRef.current && data) {
        setLedgerPage({
          content: Array.isArray(data.content) ? data.content : [],
          page: data.page ?? targetPage,
          size: data.size ?? PAGE_SIZE,
          totalElements: data.totalElements ?? 0,
          totalPages: data.totalPages ?? 0,
        });
      }
    } catch (err) {
      if (reqId === ledgerSeqRef.current) {
        console.error('Lỗi tải sổ quỹ nền tảng:', err);
        setLedgerError('Không thể tải danh sách bút toán sổ quỹ.');
      }
    } finally {
      if (reqId === ledgerSeqRef.current) {
        setLedgerLoading(false);
      }
    }
  }, [from, to, page, typeFilter]);

  useEffect(() => {
    loadLedger(page, typeFilter);
  }, [loadLedger, page, typeFilter]);

  const handleTypeChange = (event) => {
    setTypeFilter(event.target.value);
    setPage(0);
  };

  const isBalanced = reconciliation?.status === 'BALANCED';
  const totalPages = Math.max(ledgerPage.totalPages || 0, 1);
  const currentPage = ledgerPage.page ?? page;

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8E0] pb-3">
        <div>
          <h3 id="ledger-heading" className="text-base font-bold text-[#191C19] font-heading">
            Nhật Ký Ghi Sổ Kép (Quỹ Nền Tảng ↔ Ví Member)
          </h3>
          <p className="text-xs text-[#717971]">
            Mọi giao dịch thanh toán, rút tiền và hoa hồng được hạch toán đối ứng tự động
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {recLoading ? (
            <Badge variant="outline">Đang đối soát...</Badge>
          ) : recError ? (
            <Badge variant="danger">Lỗi đối soát</Badge>
          ) : isBalanced ? (
            <Badge variant="success">Đối soát: Khớp</Badge>
          ) : (
            <Badge variant="danger">Đối soát: Có chênh lệch</Badge>
          )}
          <button
            type="button"
            onClick={loadReconciliation}
            disabled={recLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-[#F8FAF8] hover:bg-[#E9F0E5] text-xs font-semibold text-[#414942] disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${recLoading ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Kiểm tra lại</span>
          </button>
        </div>
      </div>

      {/* Chi tiết trạng thái đối soát */}
      {recError ? (
        <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
          {recError}
        </div>
      ) : reconciliation && (
        <div className="rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#717971]">
            <span>
              Kiểm tra lúc: <strong className="text-[#191C19]">{formatDateTime(reconciliation.checkedAt)}</strong>
            </span>
            <span>
              Số dư quỹ: <strong className="text-[#191C19]">{formatCurrencyVND(reconciliation.fundBalance)}</strong>
              {' · '}
              Tổng ví Member: <strong className="text-[#191C19]">{formatCurrencyVND(reconciliation.memberWalletBalance)}</strong>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="bg-white rounded-lg border border-[#E2E8E0] p-2">
              <p className="text-[10px] text-[#717971]">Chênh lệch quỹ</p>
              <p className={`font-bold mt-0.5 ${Number(reconciliation.difference) !== 0 ? 'text-[#DC2626]' : 'text-[#006B2C]'}`}>
                {formatCurrencyVND(reconciliation.difference)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E2E8E0] p-2">
              <p className="text-[10px] text-[#717971]">Chênh lệch ví Member</p>
              <p className={`font-bold mt-0.5 ${Number(reconciliation.memberDifference) !== 0 ? 'text-[#DC2626]' : 'text-[#006B2C]'}`}>
                {formatCurrencyVND(reconciliation.memberDifference)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E2E8E0] p-2">
              <p className="text-[10px] text-[#717971]">Tổng ròng sổ kép</p>
              <p className={`font-bold mt-0.5 ${Number(reconciliation.ledgerNetTotal) !== 0 ? 'text-[#DC2626]' : 'text-[#006B2C]'}`}>
                {formatCurrencyVND(reconciliation.ledgerNetTotal)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E2E8E0] p-2">
              <p className="text-[10px] text-[#717971]">Chưa đối ứng</p>
              <p className={`font-bold mt-0.5 ${Number(reconciliation.unmatchedEntries) > 0 ? 'text-[#DC2626]' : 'text-[#191C19]'}`}>
                {reconciliation.unmatchedEntries ?? 0} dòng
              </p>
            </div>
            <div className="bg-white rounded-lg border border-[#E2E8E0] p-2">
              <p className="text-[10px] text-[#717971]">Cặp lệch tiền</p>
              <p className={`font-bold mt-0.5 ${Number(reconciliation.unbalancedPairs) > 0 ? 'text-[#DC2626]' : 'text-[#191C19]'}`}>
                {reconciliation.unbalancedPairs ?? 0} cặp
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bộ lọc loại bút toán */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="ledger-type-select" className="text-xs font-medium text-[#414942]">
            Loại bút toán:
          </label>
          <select
            id="ledger-type-select"
            aria-label="Lọc loại bút toán"
            value={typeFilter}
            onChange={handleTypeChange}
            className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs font-medium text-[#191C19] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
          >
            {TRANSACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-[#717971]">
          Tổng số: <strong className="text-[#191C19]">{ledgerPage.totalElements}</strong> bút toán
        </span>
      </div>

      {/* Bảng sổ bút toán */}
      {ledgerLoading ? (
        <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center text-xs text-[#717971]">
          Đang tải sổ bút toán quỹ nền tảng...
        </div>
      ) : ledgerError ? (
        <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2">
          <p className="text-xs font-semibold text-[#B91C1C]">{ledgerError}</p>
          <button
            type="button"
            onClick={() => loadLedger(currentPage, typeFilter)}
            className="px-3 py-1.5 rounded-lg bg-[#006B2C] text-white text-xs font-semibold"
          >
            Thử lại
          </button>
        </div>
      ) : ledgerPage.content.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0] text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-2xl font-light">receipt_long</span>
          </div>
          <h4 className="text-xs font-bold text-[#191C19]">
            Chưa có bút toán ghi sổ kép phát sinh
          </h4>
          <p className="text-[11px] text-[#717971] mt-0.5 max-w-sm">
            Các giao dịch hoàn thành và biến động số dư giữa Quỹ nền tảng và Ví thành viên trong khoảng lọc sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <>
          <div
            role="region"
            aria-label="Bảng bút toán sổ quỹ nền tảng"
            tabIndex={0}
            className="overflow-x-auto rounded-xl border border-[#E2E8E0] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
          >
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-[#F8FAF8] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#E2E8E0]">
                <tr>
                  <th className="py-3 px-4">Thời gian &amp; Mã BT</th>
                  <th className="py-3 px-4">Loại &amp; Diễn giải</th>
                  <th className="py-3 px-4 text-right">Số tiền &amp; Số dư sau</th>
                  <th className="py-3 px-4">Tài khoản liên quan</th>
                  <th className="py-3 px-4">Giao dịch tham chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E0]">
                {ledgerPage.content.map((entry) => {
                  const amountNum = Number(entry.amount || 0);
                  const isInflow = amountNum > 0;
                  const isOutflow = amountNum < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-[#F8FAF8]/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        <p className="font-bold font-mono text-[#191C19]">
                          {entry.transactionNo || '—'}
                        </p>
                        <p className="text-[11px] text-[#717971] mt-0.5">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#006B2C] font-bold text-[10px]">
                          {TYPE_LABELS[entry.type] || entry.type}
                        </span>
                        <p className="text-[11px] text-[#414942] mt-1">
                          {entry.note || '—'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap align-top">
                        <p
                          className={`font-extrabold font-mono ${
                            isInflow ? 'text-[#006B2C]' : isOutflow ? 'text-[#DC2626]' : 'text-[#191C19]'
                          }`}
                        >
                          {formatSignedAmount(entry.amount)}
                        </p>
                        <p className="text-[11px] text-[#717971] mt-0.5">
                          Số dư: {formatCurrencyVND(entry.balanceAfter)}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap align-top">
                        {entry.relatedAccount ? (
                          <span className="font-mono text-[#191C19]">
                            {entry.relatedAccount.email || entry.relatedAccount.accountId}
                          </span>
                        ) : (
                          <span className="text-[#717971]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top">
                        {entry.referenceTransaction ? (
                          <div className="space-y-0.5">
                            <p className="font-mono font-semibold text-[#191C19]">
                              {entry.referenceTransaction.transactionNo || '—'}
                            </p>
                            <p className="text-[11px] text-[#717971]">
                              {TYPE_LABELS[entry.referenceTransaction.type] || entry.referenceTransaction.type}
                              {' · '}
                              {formatSignedAmount(entry.referenceTransaction.amount)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#717971]">—</span>
                        )}
                        {entry.relatedOrderNo && (
                          <p className="text-[11px] text-[#00685F] font-mono mt-0.5">
                            Đơn: {entry.relatedOrderNo}
                          </p>
                        )}
                        {entry.commissionAmount != null && (
                          <p className="text-[11px] text-[#717971] mt-0.5">
                            Hoa hồng giữ: {formatCurrencyVND(entry.commissionAmount)}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#717971]">
            <span>
              Trang <strong className="text-[#191C19]">{currentPage + 1}</strong> / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage <= 0}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-white hover:bg-[#F8FAF8] text-[#191C19] font-semibold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={currentPage + 1 >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-white hover:bg-[#F8FAF8] text-[#191C19] font-semibold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
