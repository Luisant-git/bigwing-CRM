import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  ClipboardList, TrendingUp, Clock, AlertTriangle, CalendarClock,
  Ban, Bookmark, FileCheck, Truck, XCircle, X
} from "lucide-react";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { useAuthStore } from "@/stores/auth";
import TelecallerDashboard from "./telecaller-dashboard";
import SalesExecutiveDashboard from "./sales-executive-dashboard";
import { useState } from "react";

const PIE_COLORS = ["#2E75B6", "#27AE60", "#F2994A", "#EB5757", "#9B59B6", "#2D9CDB", "#E8792F", "#6C757D"];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];
  const isTelecaller = roles.includes("TELE_CALLER");
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN") || roles.includes("MANAGER");
  
  const [view, setView] = useState<"general" | "social" | "tele" | "sales">("general");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const channel = view === "social" ? "SOCIAL" : undefined;
  const isGeneralView = view === "general" || view === "social";

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["reports", "dashboard", dateFrom, dateTo, channel],
    queryFn: () => api.get("/reports/dashboard", { params: { dateFrom, dateTo, channel } }).then((r) => r.data.data),
    enabled: !isTelecaller && isGeneralView,
  });

  const { data: funnel } = useQuery({
    queryKey: ["reports", "funnel", dateFrom, dateTo, channel],
    queryFn: () => api.get("/reports/funnel", { params: { dateFrom, dateTo, channel } }).then((r) => r.data.data),
    enabled: !isTelecaller && isGeneralView,
  });

  const { data: source } = useQuery({
    queryKey: ["reports", "source", dateFrom, dateTo, channel],
    queryFn: () => api.get("/reports/source", { params: { dateFrom, dateTo, channel } }).then((r) => r.data.data),
    enabled: !isTelecaller && isGeneralView,
  });

  const { data: executive } = useQuery({
    queryKey: ["reports", "executive", dateFrom, dateTo, channel],
    queryFn: () => api.get("/reports/executive", { params: { dateFrom, dateTo, channel } }).then((r) => r.data.data),
    enabled: !isTelecaller && isGeneralView,
  });

  const { data: trends } = useQuery({
    queryKey: ["reports", "trends", dateFrom, dateTo, channel],
    queryFn: () => api.get("/reports/trends", { params: { dateFrom, dateTo, channel } }).then((r) => r.data.data),
    enabled: !isTelecaller && isGeneralView,
  });

  if (isTelecaller) {
    return <TelecallerDashboard />;
  }



  const cards = [
    { label: "Total Enquiries", value: kpi?.totalEnquiries, icon: ClipboardList, accent: "#2E75B6", bg: "bg-blue-50", tab: "all" },
    { label: "Active", value: kpi?.active, icon: TrendingUp, accent: "#6366F1", bg: "bg-indigo-50", tab: "active" },
    { label: "Today's Follow-ups", value: kpi?.today, icon: Clock, accent: "#0891B2", bg: "bg-cyan-50", tab: "today" },
    { label: "Overdue", value: kpi?.overdue, icon: AlertTriangle, accent: "#EB5757", bg: "bg-red-50", tab: "overdue" },
    { label: "Upcoming", value: kpi?.upcoming, icon: CalendarClock, accent: "#F2994A", bg: "bg-amber-50", tab: "upcoming" },
    { label: "No next Follow-up", value: kpi?.noFollowup, icon: Ban, accent: "#D97706", bg: "bg-orange-50", tab: "no-followup" },
    { label: "Booked", value: kpi?.booked, icon: Bookmark, accent: "#E8792F", bg: "bg-orange-50", tab: "booked" },
    { label: "Invoiced", value: kpi?.invoiced, icon: FileCheck, accent: "#27AE60", bg: "bg-green-50", tab: "all" },
    { label: "Delivered", value: kpi?.delivered, icon: Truck, accent: "#059669", bg: "bg-emerald-50", tab: "all" },
    { label: "Lost", value: kpi?.lost, icon: XCircle, accent: "#EB5757", bg: "bg-red-50", tab: "all" },
  ];

  const funnelData = (funnel ?? [])
    .filter((f: any) => f.count > 0)
    .map((f: any) => ({ name: f.stage.replace(/_/g, " "), count: f.count }));

  const sourceData = (source ?? []).map((s: any) => ({
    name: s.sourceName,
    value: s.totalEnquiries,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">
            {view === "social" ? "Social Media Dashboard" : view === "tele" ? "Tele-caller Dashboard" : view === "sales" ? "Sales Dashboard" : "Dashboard"}
          </h1>
          <p className="text-[12px] text-gray-400">
            {view === "social" ? "Meta leads & social media performance" : view === "tele" ? "Tele-calling performance metrics" : view === "sales" ? "Sales Performance Metrics" : "General Overview & KPIs"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 max-w-full overflow-hidden">
          <div className="flex w-full sm:w-auto items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm overflow-x-auto no-scrollbar">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="border-0 bg-transparent text-sm focus:outline-none shrink-0" 
            />
            <span className="text-gray-300 shrink-0">→</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              className="border-0 bg-transparent text-sm focus:outline-none shrink-0" 
            />
            <button 
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="ml-1 shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Clear dates"
            >
              <X size={14} />
            </button>
          </div>

          {isAdmin && (
            <div className="flex w-full sm:w-auto overflow-x-auto rounded-lg bg-gray-100 p-1 shadow-inner no-scrollbar">
              <button
                onClick={() => setView("general")}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${view === "general" ? "bg-white text-[#2E75B6] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Overview
              </button>
              <button
                onClick={() => setView("sales")}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${view === "sales" ? "bg-white text-[#2E75B6] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Sales Performance
              </button>
              <button
                onClick={() => setView("social")}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${view === "social" ? "bg-white text-[#2E75B6] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Social Media
              </button>
              <button
                onClick={() => setView("tele")}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-all ${view === "tele" ? "bg-white text-[#2E75B6] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                Tele-caller
              </button>
            </div>
          )}
        </div>
      </div>

      {view === "sales" && isAdmin ? (
        <SalesExecutiveDashboard dateFrom={dateFrom} dateTo={dateTo} />
      ) : view === "tele" && isAdmin ? (
        <TelecallerDashboard dateFrom={dateFrom} dateTo={dateTo} isNested={true} />
      ) : kpiLoading ? (
        <PageLoader message="Loading dashboard data..." />
      ) : (
        <div className="space-y-6">

      {/* KPI cards with icons + accent bars */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            to="/leads"
            search={{ tab: card.tab }}
            className={`group relative overflow-hidden rounded-xl ${card.bg} p-4 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md active:scale-95 cursor-pointer touch-manipulation`}
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

      {/* Monthly Trend Table */}
      {trends && trends.length > 0 && (
        <div className="mt-8 rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="flex items-center gap-2 bg-[#27AE60] px-6 py-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Monthly Conversion Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-3 font-bold text-gray-900 uppercase text-[11px]">Month</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Enquiries</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Quotation</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Booking</th>
                  <th className="px-6 py-3 text-center font-bold text-green-600 uppercase text-[11px]">Invoiced</th>
                  <th className="px-6 py-3 text-center font-bold text-red-500 uppercase text-[11px]">Lost</th>
                  <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Conversion %</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((t: any) => {
                  const conv = t.enquiries > 0 ? Math.round((t.invoiced / t.enquiries) * 100) : 0;
                  return (
                    <tr key={t.month} className="border-b border-gray-50 hover:bg-green-50/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1F3864]">{format(new Date(t.month + "-01"), "MMM yyyy")}</td>
                      <td className="px-6 py-4 text-center font-medium">{t.enquiries}</td>
                      <td className="px-6 py-4 text-center">{t.quotation}</td>
                      <td className="px-6 py-4 text-center">{t.booking}</td>
                      <td className="px-6 py-4 text-center font-bold text-green-600">{t.invoiced}</td>
                      <td className="px-6 py-4 text-center text-red-500">{t.lost}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full" style={{ width: `${conv}%` }} />
                          </div>
                          <span className="font-bold text-gray-700">{conv}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-full sm:w-[60%] h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
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
      )}
    </div>
  );
}
