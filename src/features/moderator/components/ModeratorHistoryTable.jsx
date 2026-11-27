import React from 'react';
import { Link } from 'react-router-dom';
import TableActionButton from '../../../components/common/TableActionButton.jsx';
import { HISTORY_TABLE_COLUMNS } from '../../../constants/tableColumns.js';
import { HISTORY_EMPTY_FALLBACK } from '../../../utils/formatHistoryValue.js';

const RESULT_TONE_CLASSES = {
  success: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]',
  warning: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
  danger: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
  info: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  neutral: 'bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]',
};

function displayOrFallback(value) {
  if (value == null || String(value).trim() === '') {
    return HISTORY_EMPTY_FALLBACK;
  }
  return value;
}

export function ModeratorHistoryTable({
  rows = [],
  loading = false,
  loadingText = 'Đang tải lịch sử...',
  emptyText = 'Chưa có lịch sử thao tác.',
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral bg-surface shadow-sm font-sans">
      <table className="w-full min-w-[820px] text-left border-collapse text-xs">
        <thead className="bg-background border-b border-neutral text-[11px] font-semibold uppercase tracking-wider text-textSecondary whitespace-nowrap">
          <tr>
            {HISTORY_TABLE_COLUMNS.map((label, index) => (
              <th
                key={label}
                className={`py-3 px-3.5 ${index === HISTORY_TABLE_COLUMNS.length - 1 ? 'text-right' : ''}`.trim()}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral">
          {loading ? (
            <tr>
              <td
                className="py-10 px-4 text-center text-xs text-textSecondary"
                colSpan={HISTORY_TABLE_COLUMNS.length}
              >
                {loadingText}
              </td>
            </tr>
          ) : rows.length > 0 ? (
            rows.map((row, idx) => {
              const targetDisplay = displayOrFallback(row.target);
              const contentDisplay = displayOrFallback(row.contentAction);
              const resultDisplay = displayOrFallback(row.result);
              const hasResultBadge = resultDisplay !== HISTORY_EMPTY_FALLBACK;
              const badgeClasses =
                RESULT_TONE_CLASSES[row.resultTone] || RESULT_TONE_CLASSES.neutral;

              return (
                <tr
                  key={row.key || idx}
                  className="hover:bg-[#F6F9F4]/60 transition-colors"
                >
                  <td className="py-3 px-3.5 whitespace-nowrap tabular-nums text-textSecondary align-middle leading-5">
                    {displayOrFallback(row.time)}
                  </td>
                  <td
                    className="py-3 px-3.5 align-middle leading-5 max-w-[220px]"
                    title={row.targetTitle || undefined}
                  >
                    {row.detailHref ? (
                      <Link
                        className="text-primary underline font-semibold break-words"
                        to={row.detailHref}
                      >
                        {targetDisplay}
                      </Link>
                    ) : (
                      <span className="font-semibold text-text break-words">
                        {targetDisplay}
                      </span>
                    )}
                    {row.targetSubtext ? (
                      <div className="text-[11px] leading-4 text-textSecondary truncate mt-0.5">
                        {row.targetSubtext}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 px-3.5 align-middle leading-5 text-text max-w-[240px]">
                    <div
                      className="truncate font-medium"
                      title={row.contentTitle || (contentDisplay !== HISTORY_EMPTY_FALLBACK ? String(contentDisplay) : undefined)}
                    >
                      {contentDisplay}
                    </div>
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap text-textSecondary align-middle leading-5">
                    {displayOrFallback(row.actor)}
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap align-middle leading-5">
                    {hasResultBadge ? (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${badgeClasses}`}
                      >
                        {resultDisplay}
                      </span>
                    ) : (
                      <span className="text-textSecondary">{HISTORY_EMPTY_FALLBACK}</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-right whitespace-nowrap align-middle leading-5">
                    {row.onViewDetail ? (
                      <TableActionButton action="view" onClick={row.onViewDetail} />
                    ) : row.detailHref ? (
                      <TableActionButton action="view" to={row.detailHref} />
                    ) : (
                      <span className="text-textSecondary">{HISTORY_EMPTY_FALLBACK}</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                className="py-10 px-4 text-center text-xs text-textSecondary"
                colSpan={HISTORY_TABLE_COLUMNS.length}
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ModeratorHistoryTable;
