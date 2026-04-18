import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  BarChart3, Users, TrendingUp, Bike, XCircle, PhoneCall, Inbox, Calendar,
} from "lucide-react";
import api from "@/lib/api";
import { Breadcrumb, Avatar, Badge } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { useUsers } from "@/lib/hooks";

type Tab = "executive" | "source" | "model-mix" | "lost-reasons" | "telecaller";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("executive");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const params: any = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "executive", label: "Executive", icon: Users },
    { key: "source", label: "Source", icon: TrendingUp },
    { key: "model-mix", label: "Model Mix", icon: Bike },
    { key: "lost-reasons", label: "Lost Reasons", icon: XCircle },
    { key: "telecaller", label: "Tele-caller", icon: PhoneCall },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Reports", icon: BarChart3 }]} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Reports & Analytics</h1>
          <p className="text-[12px] text-gray-400">Performance insights across executives, sources, and models</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border-0 bg-transparent text-sm focus:outline-none" />
          <span className="text-gray-300">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border-0 bg-transparent text-sm focus:outline-none" />
        </div>
      </div>

      {/* Tab pills */}
      <div className="mb-5 flex flex-wrap gap-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-gradient-to-r from-[#2E75B6] to-[#245f96] text-white shadow-md"
                : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "executive" && <ExecutiveReport params={params} />}
      {tab === "source" && <SourceReport params={params} />}
      {tab === "model-mix" && <ModelMixReport params={params} />}
      {tab === "lost-reasons" && <LostReasonsReport params={params} />}
      {tab === "telecaller" && <TelecallerReport params={params} />}
    </div>
  );
}

// ─── Executive ────────────────────────────────────────────────
function ExecutiveReport({ params }: { params: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "executive", params],
    queryFn: () => api.get("/reports/executive", { params }).then((r) => r.data.data),
  });
  const { data: users } = useUsers();

  const rows = data ?? [];

  const columns: Column<any>[] = [
    {
      key: "executiveName",
      label: "Executive",
      sortable: true,
      render: (e) => {
        const user = users?.find((u: any) => u.id === e.executiveId);
        return (
          <div className="flex items-center gap-3">
            <Avatar name={e.executiveName} gender={user?.gender} url={user?.avatarUrl} size={32} />
            <span className="font-semibold text-gray-800">{e.executiveName}</span>
          </div>
        );
      },
      sortValue: (e) => e.executiveName,
    },
    {
      key: "totalLeads",
      label: "Leads",
      sortable: true,
      align: "right",
      render: (e) => <span className="font-bold text-[#1F3864]">{e.totalLeads}</span>,
      sortValue: (e) => e.totalLeads,
    },
    {
      key: "contactedPct",
      label: "Contacted",
      sortable: true,
      align: "right",
      render: (e) => (
        <div className="flex items-center justify-end gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2E75B6] to-[#27AE60] transition-all"
              style={{ width: `${e.contactedPct}%` }}
            />
          </div>
          <span className="min-w-[40px] text-right font-semibold text-gray-700">{e.contactedPct}%</span>
        </div>
      ),
      sortValue: (e) => e.contactedPct,
    },
    {
      key: "testRides",
      label: "Test Rides",
      sortable: true,
      align: "right",
      render: (e) => <span className="font-semibold text-[#9B59B6]">{e.testRides}</span>,
      sortValue: (e) => e.testRides,
    },
    {
      key: "bookings",
      label: "Bookings",
      sortable: true,
      align: "right",
      render: (e) => <span className="font-semibold text-[#E8792F]">{e.bookings}</span>,
      sortValue: (e) => e.bookings,
    },
    {
      key: "invoiced",
      label: "Invoiced",
      sortable: true,
      align: "right",
      render: (e) => <span className="font-semibold text-[#27AE60]">{e.invoiced}</span>,
      sortValue: (e) => e.invoiced,
    },
    {
      key: "delivered",
      label: "Delivered",
      sortable: true,
      align: "right",
      render: (e) => <span className="font-semibold text-[#059669]">{e.delivered}</span>,
      sortValue: (e) => e.delivered,
    },
    {
      key: "lost",
      label: "Lost",
      sortable: true,
      align: "right",
      render: (e) => <span className="font-semibold text-[#EB5757]">{e.lost}</span>,
      sortValue: (e) => e.lost,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(e) => e.executiveId}
      loading={isLoading}
      emptyIcon={Users}
      emptyMessage="No executive data for this period"
    />
  );
}

// ─── Source ───────────────────────────────────────────────────
function SourceReport({ params }: { params: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "source", params],
    queryFn: () => api.get("/reports/source", { params }).then((r) => r.data.data),
  });

  const rows = data ?? [];
  const chartData = rows.map((s: any) => ({
    name: s.sourceName,
    enquiries: s.totalEnquiries,
    converted: s.invoiced + s.delivered,
  }));

  const columns: Column<any>[] = [
    {
      key: "sourceName",
      label: "Source",
      sortable: true,
      render: (s) => <span className="font-semibold text-gray-800">{s.sourceName}</span>,
      sortValue: (s) => s.sourceName,
    },
    {
      key: "totalEnquiries",
      label: "Total Enquiries",
      sortable: true,
      align: "right",
      render: (s) => <span className="font-bold text-[#1F3864]">{s.totalEnquiries}</span>,
      sortValue: (s) => s.totalEnquiries,
    },
    {
      key: "invoiced",
      label: "Invoiced",
      sortable: true,
      align: "right",
      render: (s) => <span className="font-semibold text-[#27AE60]">{s.invoiced}</span>,
      sortValue: (s) => s.invoiced,
    },
    {
      key: "delivered",
      label: "Delivered",
      sortable: true,
      align: "right",
      render: (s) => <span className="font-semibold text-[#059669]">{s.delivered}</span>,
      sortValue: (s) => s.delivered,
    },
    {
      key: "lost",
      label: "Lost",
      sortable: true,
      align: "right",
      render: (s) => <span className="font-semibold text-[#EB5757]">{s.lost}</span>,
      sortValue: (s) => s.lost,
    },
    {
      key: "conversionPct",
      label: "Conversion",
      sortable: true,
      align: "right",
      render: (s) => {
        const good = s.conversionPct >= 30;
        const ok = s.conversionPct >= 10;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, s.conversionPct)}%`,
                  backgroundColor: good ? "#27AE60" : ok ? "#F59E0B" : "#EB5757",
                }}
              />
            </div>
            <span
              className="min-w-[40px] text-right font-bold"
              style={{ color: good ? "#27AE60" : ok ? "#F59E0B" : "#EB5757" }}
            >
              {s.conversionPct}%
            </span>
          </div>
        );
      },
      sortValue: (s) => s.conversionPct,
    },
  ];

  return (
    <div className="space-y-4">
      {chartData.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-1 text-[14px] font-semibold text-[#1F3864]">Enquiries vs Converted</h3>
          <p className="mb-4 text-[11px] text-gray-400">By source channel</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E8EBF0", fontSize: 12 }} cursor={{ fill: "rgba(46,117,182,0.05)" }} />
              <Bar dataKey="enquiries" fill="#2E75B6" name="Enquiries" radius={[6, 6, 0, 0]} />
              <Bar dataKey="converted" fill="#27AE60" name="Converted" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.sourceId}
        loading={isLoading}
        emptyIcon={TrendingUp}
        emptyMessage="No source data for this period"
      />
    </div>
  );
}

// ─── Model Mix ────────────────────────────────────────────────
function ModelMixReport({ params }: { params: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "model-mix", params],
    queryFn: () => api.get("/reports/model-mix", { params }).then((r) => r.data.data),
  });

  const rows = data ?? [];

  const columns: Column<any>[] = [
    {
      key: "modelName",
      label: "Model",
      sortable: true,
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F3864]/10">
            <Bike size={16} className="text-[#1F3864]" />
          </div>
          <span className="font-semibold text-gray-800">{m.modelName}</span>
        </div>
      ),
      sortValue: (m) => m.modelName,
    },
    {
      key: "segment",
      label: "Segment",
      render: (m) => m.segment ? (
        <Badge variant="info">{m.segment}</Badge>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      key: "totalEnquiries",
      label: "Enquiries",
      sortable: true,
      align: "right",
      render: (m) => <span className="font-bold text-[#1F3864]">{m.totalEnquiries}</span>,
      sortValue: (m) => m.totalEnquiries,
    },
    {
      key: "invoiced",
      label: "Invoiced",
      sortable: true,
      align: "right",
      render: (m) => <span className="font-semibold text-[#27AE60]">{m.invoiced}</span>,
      sortValue: (m) => m.invoiced,
    },
    {
      key: "delivered",
      label: "Delivered",
      sortable: true,
      align: "right",
      render: (m) => <span className="font-semibold text-[#059669]">{m.delivered}</span>,
      sortValue: (m) => m.delivered,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(m) => m.modelId}
      loading={isLoading}
      emptyIcon={Bike}
      emptyMessage="No model data for this period"
    />
  );
}

// ─── Lost Reasons ─────────────────────────────────────────────
function LostReasonsReport({ params }: { params: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "lost-reasons", params],
    queryFn: () => api.get("/reports/lost-reasons", { params }).then((r) => r.data.data),
  });

  const rows = data ?? [];
  const total = rows.reduce((sum: number, r: any) => sum + r.count, 0);

  const columns: Column<any>[] = [
    {
      key: "reason",
      label: "Closure Reason",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            <XCircle size={16} className="text-[#EB5757]" />
          </div>
          <span className="font-medium text-gray-800">{r.reason}</span>
        </div>
      ),
      sortValue: (r) => r.reason,
    },
    {
      key: "count",
      label: "Count",
      sortable: true,
      align: "right",
      render: (r) => <span className="font-bold text-[#EB5757]">{r.count}</span>,
      sortValue: (r) => r.count,
    },
    {
      key: "percentage",
      label: "Share",
      align: "right",
      render: (r) => {
        const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#EB5757] to-[#F97316]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="min-w-[36px] text-right font-semibold text-gray-600">{pct}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.reasonId}
      loading={isLoading}
      emptyIcon={Inbox}
      emptyMessage="No lost leads in this period"
    />
  );
}

// ─── Tele-caller ──────────────────────────────────────────────
function TelecallerReport({ params }: { params: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "telecaller", params],
    queryFn: () => api.get("/reports/telecaller", { params }).then((r) => r.data.data),
  });

  const rows = data ?? [];

  const columns: Column<any>[] = [
    {
      key: "source",
      label: "Source",
      sortable: true,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E75B6]/10">
            <PhoneCall size={14} className="text-[#2E75B6]" />
          </div>
          <span className="font-semibold text-gray-800">{r.source}</span>
        </div>
      ),
      sortValue: (r) => r.source,
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      align: "right",
      render: (r) => <span className="font-bold text-[#1F3864]">{r.total}</span>,
      sortValue: (r) => r.total,
    },
    {
      key: "notContacted",
      label: "Not Contacted",
      align: "right",
      render: (r) => <span className="font-semibold text-gray-500">{r.stages?.NOT_CONTACTED ?? 0}</span>,
    },
    {
      key: "contacted",
      label: "Contacted",
      align: "right",
      render: (r) => <span className="font-semibold text-[#2E75B6]">{r.stages?.CONTACTED ?? 0}</span>,
    },
    {
      key: "invoiced",
      label: "Invoiced",
      align: "right",
      render: (r) => <span className="font-semibold text-[#27AE60]">{r.stages?.INVOICED ?? 0}</span>,
    },
    {
      key: "lost",
      label: "Lost",
      align: "right",
      render: (r) => <span className="font-semibold text-[#EB5757]">{r.stages?.LOST ?? 0}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.source}
      loading={isLoading}
      emptyIcon={PhoneCall}
      emptyMessage="No tele-enquiry data for this period"
    />
  );
}
