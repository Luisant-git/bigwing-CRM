
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { 
  ClipboardList, CheckCircle2, XCircle, TrendingUp, 
  Clock, AlertTriangle, CalendarClock, Ban, UserCheck, 
  BarChart3, Info
} from "lucide-react";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui";

export default function SalesExecutiveDashboard() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "sales-executive-detailed", dateFrom, dateTo],
    queryFn: () => api.get("/reports/sales-executive-detailed", { params: { dateFrom, dateTo } }).then((r) => r.data.data),
  });

  if (isLoading) return <PageLoader message="Generating sales report..." />;

  const { kpi, performanceMatrix = [], executives = [], trends = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Date Filter Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-[#1F3864]">Sales Performance Dashboard</h1>
          <p className="text-sm text-gray-500">Comprehensive executive and follow-up metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KPI Cards Row - Matches Top Row of Excel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-10">
        <KPICard label="Total Data" value={kpi?.totalData} icon={ClipboardList} color="#1F3864" />
        <KPICard label="Enquiries" value={kpi?.totalEnquiries} icon={TrendingUp} color="#2E75B6" onClick={() => navigate({ to: "/leads", search: { tab: "all" } })} />
        <KPICard label="Booked" value={kpi?.booked} icon={TrendingUp} color="#6366F1" onClick={() => navigate({ to: "/leads", search: { tab: "booked" } })} />
        <KPICard label="Invoiced" value={kpi?.invoiced} icon={CheckCircle2} color="#27AE60" />
        <KPICard label="Lost" value={kpi?.lost} icon={XCircle} color="#EB5757" />
        <KPICard label="Active" value={kpi?.active} icon={TrendingUp} color="#3B82F6" />
        <KPICard label="Today" value={kpi?.today} icon={Clock} color="#0891B2" onClick={() => navigate({ to: "/leads", search: { tab: "today" } })} />
        <KPICard label="Overdue" value={kpi?.overdue} icon={AlertTriangle} color="#EB5757" onClick={() => navigate({ to: "/leads", search: { tab: "overdue" } })} />
        <KPICard label="Upcoming" value={kpi?.upcoming} icon={CalendarClock} color="#F2994A" onClick={() => navigate({ to: "/leads", search: { tab: "upcoming" } })} />
        <KPICard label="No Followup" value={kpi?.noFollowup} icon={Ban} color="#D97706" onClick={() => navigate({ to: "/leads", search: { tab: "no-followup" } })} />
      </div>

      {/* Executive Performance Matrix - Unified Table from Excel */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center gap-2 bg-[#1F3864] px-6 py-4">
          <BarChart3 size={16} className="text-white/70" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Executive Performance Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-4 py-3 font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200 min-w-[200px]">Dealer Sales Executive Name</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Booking</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Enquiry</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Enquiry Lost</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Invoiced</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Quotation</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Total Enquiry</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Total Follow up Counts</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px] border-r border-gray-200">Avg Followups</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase text-[10px]">Conver %</th>
              </tr>
            </thead>
            <tbody>
              {performanceMatrix.map((m: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-[#1F3864] border-r border-gray-100">{m.name}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-600 border-r border-gray-100">{m.booking || ""}</td>
                  <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">{m.enquiry || ""}</td>
                  <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">{m.lost || ""}</td>
                  <td className="px-4 py-3 text-center font-bold text-green-600 border-r border-gray-100">{m.invoiced || ""}</td>
                  <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">{m.quotation || ""}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50/30 border-r border-gray-100">{m.totalEnquiry}</td>
                  <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">{m.totalFollowups}</td>
                  <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-100">{m.avgFollowups}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{m.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
              <tr>
                <td className="px-4 py-3 border-r border-gray-200">Total</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + (b.booking || 0), 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + (b.enquiry || 0), 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + (b.lost || 0), 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + (b.invoiced || 0), 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + (b.quotation || 0), 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + b.totalEnquiry, 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">{performanceMatrix.reduce((a: any, b: any) => a + b.totalFollowups, 0)}</td>
                <td className="px-4 py-3 text-center border-r border-gray-200">
                  {(performanceMatrix.reduce((a: any, b: any) => a + b.totalFollowups, 0) / (performanceMatrix.reduce((a: any, b: any) => a + b.totalEnquiry, 0) || 1)).toFixed(1)}
                </td>
                <td className="px-4 py-3 text-center">
                  {((performanceMatrix.reduce((a: any, b: any) => a + (b.invoiced || 0), 0) / (performanceMatrix.reduce((a: any, b: any) => a + b.totalEnquiry, 0) || 1)) * 100).toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Executive Active Status Breakdown (Full Width) */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center gap-2 bg-[#1F3864] px-6 py-4">
          <UserCheck size={16} className="text-white/70" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Follow-up Activity Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-3 font-bold text-gray-900 uppercase text-[11px]">Executive</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Today</th>
                <th className="px-6 py-3 text-center font-bold text-red-500 uppercase text-[11px]">Overdue</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Upcoming</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">No Followup</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Total Active</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Overdue %</th>
              </tr>
            </thead>
            <tbody>
              {executives.map((e: any, i: number) => {
                const overduePct = e.totalActive > 0 ? Math.round((e.overdue / e.totalActive) * 100) : 0;
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/10 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1F3864]">{e.name}</td>
                    <td className="px-6 py-4 text-center font-medium">{e.today}</td>
                    <td className="px-6 py-4 text-center font-bold text-red-600">{e.overdue}</td>
                    <td className="px-6 py-4 text-center">{e.upcoming}</td>
                    <td className="px-6 py-4 text-center text-gray-400">{e.noFollowup}</td>
                    <td className="px-6 py-4 text-center font-extrabold text-[#2E75B6]">{e.totalActive}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${overduePct > 50 ? 'bg-red-100 text-red-700' : overduePct > 20 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {overduePct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trend Table */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center gap-2 bg-[#27AE60] px-6 py-4">
          <BarChart3 size={16} className="text-white/70" />
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
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center transition-all ${onClick ? "cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 active:scale-95" : "hover:shadow-md"}`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="p-1.5 rounded-lg opacity-80" style={{ backgroundColor: `${color}15`, color }}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight line-clamp-1">{label}</p>
      <p className="text-lg font-extrabold" style={{ color }}>{value ?? 0}</p>
    </div>
  );
}
