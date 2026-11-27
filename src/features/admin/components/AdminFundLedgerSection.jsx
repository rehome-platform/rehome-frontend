import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Modal, Spinner, TableActionButton } from '../../../components/common/index.js';
import { formatCurrencyVND, formatDateTime } from '../../../utils/formatters.js';
import adminApi from '../services/adminApi.js';
import { validateDateRange } from '../utils/adminDateUtils.js';
import { DEFAULT_STALE_TIME_MS, useAdminCache } from '../hooks/useAdminQuery.jsx';

// Khớp đúng enum WalletTransactionType phía backend (rehome-backend/.../entity/enums/WalletTransactionType.java).
// Trước đây danh sách này có 2 giá trị không tồn tại ở backend (MEMBERSHIP_PAYMENT, VOUCHER_COST) và thiếu
// MEMBERSHIP_REVENUE - chọn nhầm 2 giá trị sai sẽ làm API lỗi 400 vì backend bind thẳng type thành enum.
const TRANSACTION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả loại giao dịch' },
  { value: 'ORDER_PAYMENT', label: 'Thanh toán đơn hàng' },
  { value: 'ORDER_PAYOUT', label: 'Trả tiền người bán' },
  { value: 'REFUND', label: 'Hoàn tiền đơn hàng' },
  { value: 'WITHDRAWAL', label: 'Rút tiền về ngân hàng' },
  { value: 'WITHDRAWAL_FEE', label: 'Phí rút hàng (Member)' },
  { value: 'RETURN_SHIP_BACK_FEE', label: 'Phí gửi lại hàng trả (Member)' },
  { value: 'DEGRADED_COMPENSATION', label: 'Đền bù hàng xuống cấp' },
  { value: 'COMMISSION_REVENUE', label: 'Thu hoa hồng' },
  { value: 'WITHDRAWAL_FEE_REVENUE', label: 'Thu phí rút hàng' },
  { value: 'RETURN_SHIP_BACK_FEE_REVENUE', label: 'Phí gửi lại hàng trả' },
  { value: 'MEMBERSHIP_PURCHASE', label: 'Thanh toán gói VIP (bằng ví)' },
  { value: 'MEMBERSHIP_REVENUE', label: 'Doanh thu gói VIP' },
  { value: 'VOUCHER_DISCOUNT', label: 'Chi phí voucher nền tảng' },
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
 * Giao dịch quỹ nền tảng (GET /api/admin/fund/ledger). Nhận { from, to } đồng bộ từ bộ lọc của trang.
 */
export default function AdminFundLedgerSection({ from, to }) {
  const cache = useAdminCache();
  const [detailEntry, setDetailEntry] = useState(null);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(0);

  const ledgerCacheKey = `admin:fund-ledger:${from || ''}:${to || ''}:${typeFilter}:${page}`;
  const initialCached = cache?.read(ledgerCacheKey)?.data || null;

  const [ledgerPage, setLedgerPage] = useState(() => initialCached || {
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [ledgerLoading, setLedgerLoading] = useState(() => !initialCached);
  const [ledgerError, setLedgerError] = useState(null);

  const ledgerSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const prevRangeRef = useRef({ from, to });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadLedger = useCallback(async (targetPage = page, targetType = typeFilter, { force = false } = {}) => {
    if (validateDateRange(from, to)) {
      setLedgerLoading(false);
      return;
    }

    const key = `admin:fund-ledger:${from || ''}:${to || ''}:${targetType}:${targetPage}`;
    const cachedEntry = cache?.read(key) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, DEFAULT_STALE_TIME_MS)) {
      setLedgerPage(cachedEntry.data);
      setLedgerError(null);
      setLedgerLoading(false);
      return;
    }

    const reqId = ++ledgerSeqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setLedgerPage(cachedEntry.data);
      setLedgerError(null);
      setLedgerLoading(false);
    } else {
      setLedgerLoading(true);
      setLedgerError(null);
    }

    try {
      const data = await adminApi.getFundLedger({
        from,
        to,
        type: targetType === 'ALL' ? undefined : targetType,
        page: targetPage,
        size: PAGE_SIZE,
      });
      if (!mountedRef.current || reqId !== ledgerSeqRef.current) return;
      if (data) {
        const nextPage = {
          content: Array.isArray(data.content) ? data.content : [],
          page: data.page ?? targetPage,
          size: data.size ?? PAGE_SIZE,
          totalElements: data.totalElements ?? 0,
          totalPages: data.totalPages ?? 0,
        };
        cache?.write(key, nextPage);
        setLedgerPage(nextPage);
      }
    } catch (err) {
      if (mountedRef.current && reqId === ledgerSeqRef.current) {
        console.error('Lỗi tải danh sách giao dịch:', err);
        if (!hasCached || force) {
          setLedgerError('Không thể tải danh sách giao dịch.');
        }
      }
    } finally {
      if (mountedRef.current && reqId === ledgerSeqRef.current) {
        setLedgerLoading(false);
      }
    }
  }, [cache, from, to, page, typeFilter]);

  useEffect(() => {
    if (prevRangeRef.current.from !== from || prevRangeRef.current.to !== to) {
      prevRangeRef.current = { from, to };
      if (page !== 0) {
        setPage(0);
        return;
      }
    }
    loadLedger(page, typeFilter);
  }, [loadLedger, from, to, page, typeFilter]);

  const handleTypeChange = (event) => {
    setTypeFilter(event.target.value);
    setPage(0);
  };

  const totalPages = Math.max(ledgerPage.totalPages || 0, 1);
  const currentPage = ledgerPage.page ?? page;

  return (
    <div className="bg-white p-6 rounded-2xl border border-[#DDE5D9] shadow-xs space-y-4">
      <div className="border-b border-[#DDE5D9] pb-3">
        <h3 id="ledger-heading" className="text-base font-bold text-[#1F2A37] font-heading">
          Giao dịch
        </h3>
      </div>

      {/* Bộ lọc loại giao dịch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="ledger-type-select" className="text-xs font-medium text-[#5B6776]">
            Loại giao dịch:
          </label>
          <select
            id="ledger-type-select"
            aria-label="Lọc loại giao dịch"
            value={typeFilter}
            onChange={handleTypeChange}
            className="rounded-xl border border-[#DDE5D9] bg-white px-3 py-2 text-xs font-medium text-[#1F2A37] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
          >
            {TRANSACTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-[#5B6776]">
          Tổng số: <strong className="text-[#1F2A37]">{ledgerPage.totalElements}</strong> giao dịch
        </span>
      </div>

      {/* Bảng giao dịch */}
      {ledgerLoading && ledgerPage.content.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-center flex flex-col items-center justify-center gap-3 text-xs text-[#5B6776]">
          <Spinner size="lg" />
          <span>Đang tải danh sách giao dịch...</span>
        </div>
      ) : ledgerError ? (
        <div className="p-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-center space-y-2">
          <p className="text-xs font-semibold text-[#B91C1C]">{ledgerError}</p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => loadLedger(currentPage, typeFilter, { force: true })}
          >
            Thử lại
          </Button>
        </div>
      ) : ledgerPage.content.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#F6F9F4] border border-[#DDE5D9] text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-2xl font-light">receipt_long</span>
          </div>
          <h4 className="text-xs font-bold text-[#1F2A37]">
            Chưa có giao dịch nào phát sinh
          </h4>
          <p className="text-[11px] text-[#5B6776] mt-0.5 max-w-sm">
            Các giao dịch hoàn thành và biến động số dư giữa Quỹ nền tảng và Ví thành viên trong khoảng lọc sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <>
          <div
            role="region"
            aria-label="Bảng giao dịch"
            tabIndex={0}
            className={`overflow-x-auto rounded-xl border border-[#DDE5D9] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 transition-opacity duration-150 ${
              ledgerLoading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead className="bg-[#F6F9F4] text-[#5B6776] font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Mã giao dịch</th>
                  <th className="py-3 px-4 whitespace-nowrap">Thời gian</th>
                  <th className="py-3 px-4 whitespace-nowrap">Loại giao dịch</th>
                  <th className="py-3 px-4 whitespace-nowrap">Diễn giải</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Số tiền</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {ledgerPage.content.map((entry) => {
                  const amountNum = Number(entry.amount || 0);
                  const isInflow = amountNum > 0;
                  const isOutflow = amountNum < 0;

                  return (
                    <tr key={entry.id} className="hover:bg-[#F6F9F4]/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-bold font-mono text-[#1F2A37]">
                        {entry.transactionNo || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-[#5B6776]">
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#006B2C] font-bold text-[10px]">
                          {TYPE_LABELS[entry.type] || entry.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5B6776] max-w-[220px] truncate">
                        {entry.note || '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right whitespace-nowrap font-extrabold font-mono ${
                          isInflow ? 'text-[#006B2C]' : isOutflow ? 'text-[#DC2626]' : 'text-[#1F2A37]'
                        }`}
                      >
                        {formatSignedAmount(entry.amount)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <TableActionButton
                          action="view"
                          onClick={() => setDetailEntry(entry)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#5B6776]">
            <span>
              Trang <strong className="text-[#1F2A37]">{currentPage + 1}</strong> / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage <= 0}
                className="px-3 py-1.5 rounded-xl border border-[#DDE5D9] bg-white hover:bg-[#F6F9F4] text-[#1F2A37] font-semibold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={currentPage + 1 >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-[#DDE5D9] bg-white hover:bg-[#F6F9F4] text-[#1F2A37] font-semibold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={Boolean(detailEntry)} onClose={() => setDetailEntry(null)} title="Chi tiết giao dịch" size="md">
        {detailEntry && (
          <dl className="space-y-3 text-xs">
            {[
              ['Mã giao dịch', detailEntry.transactionNo || '—'],
              ['Thời gian', formatDateTime(detailEntry.createdAt)],
              ['Loại giao dịch', TYPE_LABELS[detailEntry.type] || detailEntry.type],
              ['Diễn giải', detailEntry.note || '—'],
              ['Số tiền', formatSignedAmount(detailEntry.amount)],
              [
                'Tài khoản liên quan',
                detailEntry.relatedAccount
                  ? detailEntry.relatedAccount.email || detailEntry.relatedAccount.accountId
                  : '—',
              ],
              [
                'Mã giao dịch tham chiếu',
                detailEntry.referenceTransaction?.transactionNo || '—',
              ],
              [
                'Loại giao dịch tham chiếu',
                detailEntry.referenceTransaction
                  ? TYPE_LABELS[detailEntry.referenceTransaction.type] || detailEntry.referenceTransaction.type
                  : '—',
              ],
              [
                'Số tiền giao dịch tham chiếu',
                detailEntry.referenceTransaction
                  ? formatSignedAmount(detailEntry.referenceTransaction.amount)
                  : '—',
              ],
              ['Đơn hàng liên quan', detailEntry.relatedOrderNo || '—'],
              [
                'Hoa hồng giữ lại',
                detailEntry.commissionAmount != null ? formatCurrencyVND(detailEntry.commissionAmount) : '—',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-[#F0F4EE] last:border-0">
                <dt className="text-[#5B6776] shrink-0">{label}</dt>
                <dd className="text-right font-semibold text-[#1F2A37] font-mono">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}

