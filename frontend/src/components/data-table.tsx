import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Inbox } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => any;
}

export interface RowAction<T> {
  icon: any;
  label: string;
  onClick: (row: T, e: React.MouseEvent) => void;
  color?: string;
}

// ─────────────────────────────────────────────────────────────
// Skeleton shimmer
// ─────────────────────────────────────────────────────────────

function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 20%, #F3F4F6 40%, #F3F4F6 100%);
          background-size: 200px 100%;
          animation: shimmer 1.3s linear infinite;
        }
      `}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-4">
              <div
                className="shimmer h-4 rounded"
                style={{ width: `${60 + (j * 13) % 30}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// DataTable — premium enterprise table
// ─────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyIcon: EmptyIcon = Inbox,
  emptyMessage = "No records found",
  onRowClick,
  rowClassName,
  rowAccent,
  actions,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyIcon?: any;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  rowAccent?: (row: T) => string | undefined;  // colored left border per row
  actions?: (row: T) => RowAction<T>[];
  footer?: ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    setSort((s) => {
      if (s?.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const sortedRows = (() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const getVal = col.sortValue ?? ((r: T) => {
      const node = col.render(r);
      if (typeof node === "string" || typeof node === "number") return node;
      return String(node);
    });
    return [...rows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  })();

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] ring-1 ring-black/5 backdrop-blur-sm">
      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {/* Sticky header with blur */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-b from-[#F8FAFC]/95 to-[#F1F5F9]/95 backdrop-blur-md">
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const alignClass = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                return (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key, col.sortable)}
                    className={`border-b border-gray-200/80 px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B] ${alignClass} ${col.sortable ? "cursor-pointer select-none hover:text-[#1F3864] transition-colors" : ""}`}
                    style={{ width: col.width }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        active ? (
                          sort!.dir === "asc"
                            ? <ChevronUp size={12} className="text-[#2E75B6]" />
                            : <ChevronDown size={12} className="text-[#2E75B6]" />
                        ) : (
                          <ChevronsUpDown size={11} className="text-gray-300" />
                        )
                      )}
                    </span>
                  </th>
                );
              })}
              {actions && (
                <th className="border-b border-gray-200/80 px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#64748B]" style={{ width: "150px" }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <SkeletonRows rows={6} cols={columns.length + (actions ? 1 : 0)} />
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                      <EmptyIcon size={28} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedRows.map((row, i) => {
                const accent = rowAccent?.(row);
                const extraClass = rowClassName?.(row) ?? "";
                return (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`group relative transition-all duration-200 ${onRowClick ? "cursor-pointer" : ""} ${i % 2 === 1 ? "bg-[#FAFBFC]" : "bg-white"} hover:!bg-[#F0F7FF] hover:shadow-[inset_0_0_0_1px_rgba(46,117,182,0.12)] ${extraClass}`}
                    style={{
                      animation: `rowFadeIn 0.3s ease-out ${Math.min(i * 0.02, 0.3)}s backwards`,
                    }}
                  >
                    {columns.map((col, ci) => {
                      const alignClass = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                      return (
                        <td
                          key={col.key}
                          className={`relative px-4 py-3.5 ${alignClass}`}
                        >
                          {/* Accent left border — only on first cell, as an absolute inner div */}
                          {ci === 0 && accent && (
                            <span
                              className="pointer-events-none absolute left-0 top-0 h-full w-[3px] rounded-r"
                              style={{ backgroundColor: accent }}
                              aria-hidden="true"
                            />
                          )}
                          {col.render(row)}
                        </td>
                      );
                    })}

                    {/* Hover actions column */}
                    {actions && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {actions(row).map((action, ai) => (
                            <ActionButton
                              key={ai}
                              icon={action.icon}
                              label={action.label}
                              color={action.color}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(row, e);
                              }}
                            />
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {footer && <div className="border-t border-gray-100 bg-[#FAFBFC] px-4 py-3">{footer}</div>}
    </div>
  );
}

function ActionButton({
  icon: Icon, label, onClick, color = "#64748B",
}: {
  icon: any; label: string; onClick: (e: React.MouseEvent) => void; color?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:scale-110 hover:bg-white hover:shadow-md"
        style={{ color: showTip ? color : undefined }}
      >
        <Icon size={15} />
      </button>
      {showTip && (
        <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-semibold text-white">
          {label}
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Summary Card — for top of list pages
// ─────────────────────────────────────────────────────────────

export function SummaryCard({
  label,
  value,
  icon: Icon,
  color = "#2E75B6",
  trend,
  onClick,
  active,
}: {
  label: string;
  value: number | string;
  icon: any;
  color?: string;
  trend?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`group relative flex items-start gap-3 overflow-hidden rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition-all duration-200 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"} ${active ? "ring-2 ring-offset-1" : "ring-black/5"}`}
      style={{ "--accent": color, ...(active ? { borderColor: color } : {}) } as any}
    >
      {/* Accent bar */}
      <span
        className={`absolute left-0 top-0 h-full w-1 transition-all ${active ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
        style={{ backgroundColor: color }}
      />
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "1F" }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold" style={{ color }}>{value}</p>
        {trend && <p className="mt-0.5 text-[11px] text-gray-400">{trend}</p>}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter Chips
// ─────────────────────────────────────────────────────────────

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; count?: number; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              active
                ? "text-white shadow-md"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 hover:ring-gray-300"
            }`}
            style={active ? { backgroundColor: opt.color ?? "#2E75B6" } : {}}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/25" : "bg-gray-100 text-gray-500"}`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pagination — modern style
// ─────────────────────────────────────────────────────────────

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100, 200],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page number list with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <p className="text-[12px] text-gray-500">
          Showing <span className="font-semibold text-gray-700">{start}</span>
          {" – "}
          <span className="font-semibold text-gray-700">{end}</span>
          {" of "}
          <span className="font-semibold text-gray-700">{total}</span>
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>

          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="px-1 text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  p === page
                    ? "bg-[#2E75B6] text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
