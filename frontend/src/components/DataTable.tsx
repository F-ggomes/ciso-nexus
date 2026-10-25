import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  width?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  empty?: ReactNode;
  maxHeight?: string;
  onRowClick?: (row: T) => void;
  dense?: boolean;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  empty = 'No records.',
  maxHeight = 'calc(100vh - 220px)',
  onRowClick,
  dense = true,
}: Props<T>) {
  const pad = dense ? 'px-3 py-1.5' : 'px-3 py-2.5';
  return (
    <div className="card overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 text-2xs uppercase tracking-wide text-slate-500 shadow-[inset_0_-1px_0_0_rgb(226_232_240)] dark:bg-navy-800 dark:text-slate-400 dark:shadow-[inset_0_-1px_0_0_rgb(31_42_68)]">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`${pad} font-semibold whitespace-nowrap ${c.className ?? ''}`} style={c.width ? { width: c.width } : undefined}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-rose-600 dark:text-rose-400">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                  {empty}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50 dark:hover:bg-navy-800/60`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`${pad} align-top ${c.className ?? ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
