import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserCircle, ClipboardList, CornerDownLeft, ChevronUp, ChevronDown } from "lucide-react";
import api from "@/lib/api";

type SearchItem =
  | { kind: "customer"; id: number; label: string; sub?: string }
  | { kind: "lead"; id: number; label: string; sub?: string };

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const { data: results } = useQuery({
    queryKey: ["search", query],
    queryFn: () =>
      api.get("/search", { params: { q: query } }).then((r) => r.data.data),
    enabled: query.length >= 2,
  });

  // Flatten customers + leads into one navigable list
  const items: SearchItem[] = useMemo(() => {
    if (!results) return [];
    const list: SearchItem[] = [];
    (results.customers ?? []).forEach((c: any) =>
      list.push({
        kind: "customer",
        id: c.id,
        label: `${c.firstName} ${c.lastName ?? ""}`.trim(),
        sub: c.mobile,
      })
    );
    (results.leads ?? []).forEach((l: any) =>
      list.push({
        kind: "lead",
        id: l.id,
        label: l.enquiryNo,
        sub: `${l.customer?.firstName ?? ""} ${l.customer?.lastName ?? ""} · ${l.stage?.replace(/_/g, " ")}`.trim(),
      })
    );
    return list;
  }, [results]);

  // Reset active index when query changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  // Global shortcut: "/" focuses search (when not typing in another input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = /INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const gotoItem = (item: SearchItem) => {
    if (item.kind === "customer") {
      navigate({ to: "/customers/$id", params: { id: String(item.id) } });
    } else {
      navigate({ to: "/leads/$id", params: { id: String(item.id) } });
    }
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIdx];
      if (item) gotoItem(item);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(items.length - 1);
    }
  };

  // Indices where customers end → leads start (for section headers)
  const customerCount = results?.customers?.length ?? 0;

  return (
    <div className="relative hidden w-[280px] sm:block">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search leads, customers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-[#D4D9E0] bg-[#F5F7FA] py-2 pl-9 pr-12 text-sm focus:border-[#2E75B6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
      />
      {/* Keyboard shortcut hint */}
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 shadow-sm">
        /
      </kbd>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div
          ref={listRef}
          className="absolute left-0 top-full z-50 mt-1 max-h-[420px] w-[360px] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
        >
          {items.length > 0 ? (
            <>
              {customerCount > 0 && (
                <div className="border-b p-2">
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Customers
                  </p>
                  {items.slice(0, customerCount).map((item, idx) => (
                    <SearchRow
                      key={`c-${item.id}`}
                      idx={idx}
                      active={activeIdx === idx}
                      onSelect={() => gotoItem(item)}
                      onHover={() => setActiveIdx(idx)}
                      item={item}
                    />
                  ))}
                </div>
              )}
              {items.length > customerCount && (
                <div className="p-2">
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Leads
                  </p>
                  {items.slice(customerCount).map((item, i) => {
                    const idx = customerCount + i;
                    return (
                      <SearchRow
                        key={`l-${item.id}`}
                        idx={idx}
                        active={activeIdx === idx}
                        onSelect={() => gotoItem(item)}
                        onHover={() => setActiveIdx(idx)}
                        item={item}
                      />
                    );
                  })}
                </div>
              )}

              {/* Keyboard hints footer */}
              <div className="flex items-center justify-between gap-3 border-t bg-[#F9FAFB] px-3 py-2 text-[10px] text-gray-400">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border bg-white px-1 py-0.5 text-[9px] shadow-sm">
                      <ChevronUp size={9} className="inline" />
                    </kbd>
                    <kbd className="rounded border bg-white px-1 py-0.5 text-[9px] shadow-sm">
                      <ChevronDown size={9} className="inline" />
                    </kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border bg-white px-1 py-0.5 text-[9px] shadow-sm">
                      <CornerDownLeft size={9} className="inline" />
                    </kbd>
                    open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border bg-white px-1 py-0.5 text-[9px] shadow-sm">esc</kbd>
                    close
                  </span>
                </span>
                <span>{items.length} result{items.length === 1 ? "" : "s"}</span>
              </div>
            </>
          ) : (
            <p className="p-4 text-center text-sm text-gray-400">No results found</p>
          )}
        </div>
      )}
    </div>
  );
}

function SearchRow({
  idx,
  active,
  onSelect,
  onHover,
  item,
}: {
  idx: number;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  item: SearchItem;
}) {
  const Icon = item.kind === "customer" ? UserCircle : ClipboardList;
  return (
    <button
      data-idx={idx}
      onMouseDown={onSelect}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-[#2E75B6] text-white"
          : "text-gray-700 hover:bg-[#F5F7FA]"
      }`}
    >
      <Icon size={14} className={active ? "text-white/80" : "text-gray-400"} />
      <span className="flex-1 truncate">
        <span className="font-medium">{item.label}</span>
        {item.sub && (
          <span className={`ml-2 text-[11px] ${active ? "text-white/70" : "text-gray-400"}`}>
            {item.sub}
          </span>
        )}
      </span>
    </button>
  );
}
