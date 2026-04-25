import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plus, Filter, X, ClipboardList,
  Flame, Sun, Snowflake, Search, TrendingUp,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, STAGE_COLORS, useLookup, useUsers } from "@/lib/hooks";
import { Breadcrumb, Tooltip } from "@/components/ui";
import { Avatar } from "@/components/ui";
import { InterestBadge } from "@/components/interest-badge";
import { DataTable, SummaryCard, FilterChips, Pagination, type Column } from "@/components/data-table";

type Tab = "all" | "today" | "overdue" | "upcoming" | "no-followup";
type InterestFilter = "ALL" | "HOT" | "WARM" | "COLD";

const TABS: { key: Tab; label: string; endpoint: string }[] = [
  { key: "all", label: "All Leads", endpoint: "/leads" },
  { key: "today", label: "Today's Follow-ups", endpoint: "/leads/today" },
  { key: "overdue", label: "Overdue", endpoint: "/leads/overdue" },
  { key: "upcoming", label: "Upcoming", endpoint: "/leads/upcoming" },
  { key: "no-followup", label: "No Follow-up", endpoint: "/leads/no-followup" },
];

export default function LeadListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [interest, setInterest] = useState<InterestFilter>("ALL");
  const [showFilters, setShowFilters] = useState(false);

  // advanced filters
  const [stage, setStage] = useState("");
  const [channel, setChannel] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [modelId, setModelId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: sources } = useLookup("enquiry-sources");
  const { data: models } = useLookup("vehicle-models");
  const { data: users } = useUsers();

  const activeTab = TABS.find((t) => t.key === tab)!;

  const params: any = { page, pageSize };
  if (search) params.q = search;
  if (interest !== "ALL") params.interestLevel = interest;
  if (tab === "all") {
    if (stage) params.stage = stage;
    if (channel) params.channel = channel;
    if (sourceId) params.sourceId = sourceId;
    if (modelId) params.modelId = modelId;
    if (assignedTo) params.assignedTo = assignedTo;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
  }

  const { data, isLoading } = useQuery({
    queryKey: ["leads", tab, params],
    queryFn: () => api.get(activeTab.endpoint, { params }).then((r) => r.data),
  });

  const leads = data?.data ?? [];
  const meta = data?.meta;

  // Summary counts by interest — fetched from server for the CURRENT filter set
  // (ignores `interest` filter itself so the chips always show total counts)
  const countParams: any = { pageSize: 1 };
  if (search) countParams.q = search;
  if (tab === "all") {
    if (stage) countParams.stage = stage;
    if (channel) countParams.channel = channel;
    if (sourceId) countParams.sourceId = sourceId;
    if (modelId) countParams.modelId = modelId;
    if (assignedTo) countParams.assignedTo = assignedTo;
    if (dateFrom) countParams.dateFrom = dateFrom;
    if (dateTo) countParams.dateTo = dateTo;
  }
  const countQueries = useQueries({
    queries: ["HOT", "WARM", "COLD"].map((lvl) => ({
      queryKey: ["leads-count", tab, lvl, countParams],
      queryFn: () =>
        api
          .get(activeTab.endpoint, { params: { ...countParams, interestLevel: lvl } })
          .then((r) => r.data.meta?.total ?? 0),
      staleTime: 30_000,
    })),
  });
  const counts = {
    HOT: countQueries[0].data ?? 0,
    WARM: countQueries[1].data ?? 0,
    COLD: countQueries[2].data ?? 0,
  };

  const hasActiveFilters = stage || channel || sourceId || modelId || assignedTo || dateFrom || dateTo;
  const clearFilters = () => {
    setStage(""); setChannel(""); setSourceId("");
    setModelId(""); setAssignedTo(""); setDateFrom(""); setDateTo("");
  };

  // ─── Column definitions ────────────────────────────────────
  const columns: Column<any>[] = [
    {
      key: "enquiryNo",
      label: "Enquiry No",
      sortable: true,
      width: "180px",
      render: (l) => <span className="whitespace-nowrap font-bold text-[#2E75B6]">{l.enquiryNo}</span>,
      sortValue: (l) => l.enquiryNo,
    },
    {
      key: "customer",
      label: "Customer",
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1F3864] to-[#2E75B6] text-[10px] font-bold text-white">
            {l.customer?.firstName?.[0]}{l.customer?.lastName?.[0] ?? ""}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800">
              {l.customer?.firstName} {l.customer?.lastName ?? ""}
            </p>
            <p className="truncate text-[11px] text-gray-400">{l.customer?.mobile}</p>
          </div>
        </div>
      ),
      sortValue: (l) => `${l.customer?.firstName} ${l.customer?.lastName}`,
    },
    {
      key: "model",
      label: "Model",
      sortable: true,
      render: (l) => l.model ? (
        <span className="font-medium text-gray-700">{l.model}</span>
      ) : <span className="text-gray-300">—</span>,
      sortValue: (l) => l.model ?? "",
    },
    {
      key: "stage",
      label: "Stage",
      sortable: true,
      render: (l) => (
        <span className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-semibold transition-all hover:brightness-105 hover:scale-105 ${STAGE_COLORS[l.stage] ?? "bg-gray-100"}`}>
          {l.stage.replace(/_/g, " ")}
        </span>
      ),
      sortValue: (l) => l.stage,
    },
    {
      key: "interestLevel",
      label: "Interest",
      sortable: true,
      render: (l) => <InterestBadge level={l.interestLevel} />,
      sortValue: (l) => ({ HOT: 0, WARM: 1, COLD: 2 }[l.interestLevel as string] ?? 3),
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (l) => l.assignedTo ? (
        <div className="flex items-center gap-2">
          <ExecAvatar userId={l.assignedTo.id} name={l.assignedTo.fullName} />
          <span className="text-sm text-gray-600">{l.assignedTo.fullName}</span>
        </div>
      ) : l.executiveName ? (
        <div className="flex items-center gap-1.5 opacity-60">
           <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
           <span className="text-[11px] font-medium text-gray-500 italic">
             {l.executiveName}
           </span>
        </div>
      ) : <span className="text-gray-300">Unassigned</span>,
    },
    {
      key: "enquiryDate",
      label: "Date",
      sortable: true,
      render: (l) => <span className="text-gray-500">{formatDate(l.enquiryDate)}</span>,
      sortValue: (l) => l.enquiryDate,
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Leads", icon: ClipboardList }]} />

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Leads</h1>
          <p className="text-[12px] text-gray-400">Track and manage all sales enquiries</p>
        </div>
        <Link
          to="/leads/new"
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-[#245f96] hover:to-[#1a4472]"
        >
          <Plus size={16} /> New Lead
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total"
          value={meta?.total ?? "—"}
          icon={TrendingUp}
          color="#2E75B6"
          trend={tab !== "all" ? activeTab.label : undefined}
        />
        <SummaryCard
          label="Hot Leads"
          value={counts.HOT}
          icon={Flame}
          color="#EF4444"
          active={interest === "HOT"}
          onClick={() => { setInterest(interest === "HOT" ? "ALL" : "HOT"); setPage(1); }}
        />
        <SummaryCard
          label="Warm Leads"
          value={counts.WARM}
          icon={Sun}
          color="#F59E0B"
          active={interest === "WARM"}
          onClick={() => { setInterest(interest === "WARM" ? "ALL" : "WARM"); setPage(1); }}
        />
        <SummaryCard
          label="Cold Leads"
          value={counts.COLD}
          icon={Snowflake}
          color="#64748B"
          active={interest === "COLD"}
          onClick={() => { setInterest(interest === "COLD" ? "ALL" : "COLD"); setPage(1); }}
        />
      </div>

      {/* Top bar: search + filter toggle + interest chips */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterChips
          value={interest}
          onChange={(v) => { setInterest(v); setPage(1); }}
          options={[
            { key: "ALL", label: "All" },
            { key: "HOT", label: "🔥 Hot", color: "#EF4444", count: counts.HOT },
            { key: "WARM", label: "🌤️ Warm", color: "#F59E0B", count: counts.WARM },
            { key: "COLD", label: "❄️ Cold", color: "#64748B", count: counts.COLD },
          ]}
        />

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${hasActiveFilters ? "border-[#2E75B6] bg-blue-50 text-[#2E75B6]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <Filter size={14} /> Filters
            {hasActiveFilters && <span className="ml-0.5 h-2 w-2 rounded-full bg-[#2E75B6]" />}
          </button>
        </div>
      </div>

      {/* Follow-up tabs */}
      <div className="mb-4 flex gap-0 overflow-x-auto border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${tab === t.key ? "border-[#2E75B6] text-[#2E75B6] font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Advanced filters panel */}
      {showFilters && tab === "all" && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <FilterSelect label="Stage" value={stage} onChange={setStage} options={["NEW","ENQUIRED","NOT_REACHABLE","TEST_RIDE_SCHEDULED","TEST_RIDE_COMPLETED","QUOTATION_SHARED","BOOKED","INVOICED","DELIVERED_CLOSED","LOST"].map(s => ({ value: s, label: s.replace(/_/g," ") }))} />
            <FilterSelect label="Channel" value={channel} onChange={setChannel} options={["WALKIN","TELE","DIGITAL","SOCIAL","REFERENCE","WEBSITE","SERVICE"].map(c => ({ value: c, label: c }))} />
            <FilterSelect label="Source" value={sourceId} onChange={setSourceId} options={(sources ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))} />
            <FilterSelect label="Model" value={modelId} onChange={setModelId} options={(models ?? []).map((m: any) => ({ value: String(m.id), label: m.name }))} />
            <FilterSelect label="Assigned To" value={assignedTo} onChange={setAssignedTo} options={(users ?? []).map((u: any) => ({ value: String(u.id), label: u.fullName }))} />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 flex items-center gap-1 text-xs font-medium text-[#2E75B6] hover:underline">
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Premium DataTable */}
      <DataTable
        columns={columns}
        rows={leads}
        rowKey={(l) => l.id}
        loading={isLoading}
        emptyIcon={ClipboardList}
        emptyMessage="No leads found — try adjusting your filters"
        onRowClick={(l) => navigate({ to: "/leads/$id", params: { id: String(l.id) } })}
        rowAccent={(l) =>
          l.interestLevel === "HOT" ? "#EF4444" :
          l.interestLevel === "WARM" ? "#F59E0B" :
          undefined
        }
        rowClassName={(l) =>
          l.interestLevel === "HOT" ? "!bg-gradient-to-r !from-red-50/40 !to-transparent" :
          l.stage === "LOST" ? "opacity-50" : ""
        }
        footer={meta && meta.total > 0 && (
          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      />
    </div>
  );
}

function ExecAvatar({ userId, name }: { userId: number; name: string }) {
  const { data: users } = useUsers();
  const user = users?.find((u: any) => u.id === userId);
  return <Avatar name={name} gender={user?.gender} url={user?.avatarUrl} size={26} />;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium focus:border-[#2E75B6] focus:outline-none">
        <option value="">All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}


