// ═══════════════════════════════════════════════════════════
// AttendAI — Table & LoadingSpinner Components
// ═══════════════════════════════════════════════════════════

import React from 'react';

// ── Table ─────────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  rowClassName?: (item: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function Table<T>({ columns, data, keyExtractor, rowClassName, emptyMessage = 'No data found', isLoading }: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <div className="skeleton h-4 w-3/4 rounded" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-container">
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
          <p className="text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={keyExtractor(item)} className={rowClassName?.(item) || ''}>
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(item, index) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
