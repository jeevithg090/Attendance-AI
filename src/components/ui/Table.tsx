// ═══════════════════════════════════════════════════════════
// AttendAI — Table Component
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { Inbox } from 'lucide-react';
import EmptyState from './EmptyState';

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
  /** Optional secondary line or action shown in the empty state. */
  emptyDescription?: React.ReactNode;
  isLoading?: boolean;
  /** Accessible table name (visually hidden). */
  caption?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  rowClassName,
  emptyMessage = 'No data found',
  emptyDescription,
  isLoading,
  caption,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="table-container" aria-busy="true">
        <table className="table">
          {caption && <caption className="sr-only">{caption} (loading)</caption>}
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" style={col.width ? { width: col.width } : undefined}>
                  {col.header}
                </th>
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
        <EmptyState icon={<Inbox size={24} />} title={emptyMessage} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table table-responsive">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={keyExtractor(item)} className={rowClassName?.(item) || ''}>
              {columns.map((col) => (
                <td key={col.key} data-label={col.header}>
                  {col.render
                    ? col.render(item, index)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
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
