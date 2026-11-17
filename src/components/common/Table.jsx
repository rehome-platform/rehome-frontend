import React from 'react';
import Spinner from './Spinner.jsx';

export default function Table({
  columns = [],
  data = [],
  keyExtractor,
  emptyMessage = "Không có dữ liệu",
  loading = false,
}) {
  // Chỉ thay toàn bộ bảng bằng spinner khi CHƯA có dữ liệu (lần tải đầu).
  // Khi đã có dữ liệu, loading=true (do refetch sau khi thao tác) chỉ làm mờ bảng cũ
  // thay vì xóa sạch rồi vẽ lại — tránh hiệu ứng "giật/load lại nguyên bảng".
  const isInitialLoading = loading && data.length === 0;
  const isBackgroundRefreshing = loading && data.length > 0;

  return (
    <div
      className={`w-full overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest transition-opacity duration-150 ${
        isBackgroundRefreshing ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <table className="w-full text-left text-sm text-on-surface">
        <thead className="bg-surface-container text-xs font-semibold text-outline">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 whitespace-nowrap ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {isInitialLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-outline">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Spinner size="lg" />
                  <span>Đang tải dữ liệu...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-outline">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={keyExtractor ? keyExtractor(row, rowIdx) : row.id || rowIdx}
                className="hover:bg-surface-container-low transition-colors"
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-4 py-3 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
