import React from 'react';

export default function Table({
  columns = [],
  data = [],
  keyExtractor,
  emptyMessage = "Không có dữ liệu",
  loading = false,
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
      <table className="w-full text-left text-sm text-on-surface">
        <thead className="bg-surface-container text-xs font-semibold uppercase text-outline">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-outline">
                <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></span>
                Đang tải dữ liệu...
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
