import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ClipboardList, TrendingUp, Clock, AlertTriangle, CalendarClock,
  Ban, Bookmark, FileCheck, Truck, XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";

const PIE_COLORS = ["#2E75B6", "#27AE60", "#F2994A", "#EB5757", "#9B59B6", "#2D9CDB", "#E8792F", "#6C757D"];

export default function DashboardPage() {
  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: () => api.get("/reports/dashboard").then((r) => r.data.data),
  });

  const { data: funnel } = useQuery({
    queryKey: ["reports", "funnel"],
    queryFn: () => api.get("/reports/funnel").then((r) => r.data.data),
  });

  const { data: source } = useQuery({
    queryKey: ["reports", "source"],
    queryFn: () => api.get("/reports/source").then((r) => r.data.data),
  });

  const { data: executive } = useQuery({
    queryKey: ["reports", "executive"],
    queryFn: () => api.get("/reports/executive").then((r) => r.data.data),
  });

  if (kpiLoading) return <PageLoader message="Loading dashboard..." />;

  const cards = [
    { label: "Total Enquiries", value: kpi?.totalEnquiries, icon: ClipboardList, accent: "#2E75B6", bg: "bg-blue-50" },
    { label: "Active", value: kpi?.active, icon: TrendingUp, accent: "#6366F1", bg: "bg-indigo-50" },
    { label: "Today's Follow-ups", value: kpi?.today, icon: Clock, accent: "#0891B2", bg: "bg-cyan-50" },
    { label: "Overdue", value: kpi?.overdue, icon: AlertTriangle, accent: "#EB5757", bg: "bg-red-50" },
    { label: "Upcoming", value: kpi?.upcoming, icon: CalendarClock, accent: "#F2994A", bg: "bg-amber-50" },
    { label: "No Follow-up", value: kpi?.noFollowup, icon: Ban, accent: "#D97706", bg: "bg-orange-50" },
    { label: "Booked", value: kpi?.booked, icon: Bookmark, accent: "#E8792F", bg: "bg-orange-50" },
    { label: "Invoiced", value: kpi?.invoiced, icon: FileCheck, accent: "#27AE60", bg: "bg-green-50" },
    { label: "Delivered", value: kpi?.delivered, icon: Truck, accent: "#059669", bg: "bg-emerald-50" },
    { label: "Lost", value: kpi?.lost, icon: XCircle, accent: "#EB5757", bg: "bg-red-50" },
  ];

  const funnelData = (funnel ?? [])
    .filter((f: any) => f.count > 0)
    .map((f: any) => ({ name: f.stage.replace(/_/g, " "), count: f.count }));

  const sourceData = (source ?? []).map((s: any) => ({
    name: s.sourceName,
    value: s.totalEnquiries,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#1F3864]">Dashboard</h1>

      {/* KPI cards with icons + accent bars */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            to="/leads"
            className={`group relative overflow-hidden rounded-xl ${card.bg} p-4 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md`}
          >
            {/* Accent bar */}
            <div
              className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
              style={{ backgroundColor: card.accent }}
            />
            <div className="flex items-start justify-between">
              <div className="pl-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: card.accent }}>
                  {card.value ?? "—"}
                </p>
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ backgroundColor: card.accent }}
              >
                <card.icon size={18} className="text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funnel chart */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-1 text-[15px] font-semibold text-[#1F3864]">Sales Funnel</h2>
          <p className="mb-4 text-[12px] text-gray-400">Lead distribution by stage</p>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8892A0" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#8892A0" }} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E8EBF0", fontSize: 12 }}
                  cursor={{ fill: "rgba(46,117,182,0.05)" }}
                />
                <Bar dataKey="count" fill="#2E75B6" radius={[0, 6, 6, 0]} barSize={20}>
                  {funnelData.map((_: any, i: number) => (
                    <Cell key={i} fill={i < funnelData.length - 1 ? `rgba(46,117,182,${1 - i * 0.08})` : "#EB5757"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-gray-400">No data yet</p>
          )}
        </div>

        {/* Source pie */}
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-1 text-[15px] font-semibold text-[#1F3864]">Enquiries by Source</h2>
          <p className="mb-4 text-[12px] text-gray-400">Distribution of lead sources</p>
          {sourceData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={240}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    strokeWidth={2}
                    stroke="#fff"
                  >
                    {sourceData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E8EBF0", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-2">
                {sourceData.slice(0, 7).map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[12px] text-gray-600">
                      {s.name} ({s.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-gray-400">No data yet</p>
          )}
        </div>
      </div>

      {/* Executive performance mini-table */}
      {executive && executive.length > 0 && (
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-1 text-[15px] font-semibold text-[#1F3864]">Executive Performance</h2>
          <p className="mb-4 text-[12px] text-gray-400">Key metrics per sales executive</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {executive.map((exec: any) => {
              const convRate = exec.totalLeads > 0
                ? Math.round(((exec.invoiced + exec.delivered) / exec.totalLeads) * 100)
                : 0;
              return (
                <div key={exec.executiveId} className="rounded-lg border border-gray-100 p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2E75B6] text-sm font-bold text-white">
                      {exec.executiveName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1F3864]">{exec.executiveName}</p>
                      <p className="text-[11px] text-gray-400">{exec.totalLeads} leads</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-gray-400">Conversion</span>
                      <span className="font-semibold" style={{ color: convRate > 20 ? "#27AE60" : convRate > 0 ? "#F2994A" : "#999" }}>{convRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(convRate, 100)}%`,
                          backgroundColor: convRate > 20 ? "#27AE60" : "#F2994A",
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]">
                    <div><p className="font-bold text-[#2E75B6]">{exec.contacted}</p><p className="text-gray-400">Contact</p></div>
                    <div><p className="font-bold text-[#9B59B6]">{exec.testRides}</p><p className="text-gray-400">Rides</p></div>
                    <div><p className="font-bold text-[#27AE60]">{exec.invoiced}</p><p className="text-gray-400">Invoice</p></div>
                    <div><p className="font-bold text-[#EB5757]">{exec.lost}</p><p className="text-gray-400">Lost</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
