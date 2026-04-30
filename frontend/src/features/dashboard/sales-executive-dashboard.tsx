
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
import { Badge } from "@/components/ui";

export default function SalesExecutiveDashboard() {
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "sales-executive-detailed", dateFrom, dateTo],
    queryFn: () => api.get("/reports/sales-executive-detailed", { params: { dateFrom, dateTo } }).then((r) => r.data.data),
  });

  if (isLoading) return <PageLoader message="Generating sales report..." />;

  const { kpi, efficiency = [], executives = [], trends = [] } = data || {};

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        <KPICard label="Total Data" value={kpi?.totalData} icon={ClipboardList} color="#1F3864" />
        <KPICard label="Enquiries" value={kpi?.totalEnquiries} icon={TrendingUp} color="#2E75B6" />
        <KPICard label="Invoiced" value={kpi?.invoiced} icon={CheckCircle2} color="#27AE60" />
        <KPICard label="Lost" value={kpi?.lost} icon={XCircle} color="#EB5757" />
        <KPICard label="Active" value={kpi?.active} icon={TrendingUp} color="#6366F1" />
        <KPICard label="Today" value={kpi?.today} icon={Clock} color="#0891B2" />
        <KPICard label="Overdue" value={kpi?.overdue} icon={AlertTriangle} color="#EB5757" />
        <KPICard label="Upcoming" value={kpi?.upcoming} icon={CalendarClock} color="#F2994A" />
        <KPICard label="No Followup" value={kpi?.noFollowup} icon={Ban} color="#D97706" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Efficiency Matrix - Stage 1 to 5 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1F3864] uppercase tracking-wider">Follow-up Efficiency Matrix</h3>
            <Badge variant="outline" className="text-[10px]">STAGE 1 - 5</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase text-[10px]">Stage</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-500 uppercase text-[10px]">Total Enquiry</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-500 uppercase text-[10px]">Total Follow-ups</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-500 uppercase text-[10px]">Avg Followups</th>
                  <th className="px-3 py-2 text-center font-bold text-gray-500 uppercase text-[10px]">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {efficiency.map((e: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-[#1F3864]">{e.stage}</td>
                    <td className="px-3 py-3 text-center text-gray-600 font-medium">{e.enquiryCount}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{e.followupCount}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{e.avgFollowups}</td>
                    <td className="px-3 py-3 text-center text-blue-600 font-bold">{e.convRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend / Info Card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden flex flex-col">
          <div className="bg-[#1F3864] px-6 py-4 flex items-center gap-2">
            <Info size={16} className="text-white/70" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Follow-up Guidelines</h3>
          </div>
          
          <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Follow-up Gap Section */}
              <div className="space-y-4">
                <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Follow-up Gap</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "F1", desc: "Next Day" },
                    { label: "F2", desc: "3 Days" },
                    { label: "F3", desc: "7 Days" },
                    { label: "F4", desc: "15 Days" },
                    { label: "F5", desc: "30 Days" }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between group">
                      <Badge variant="outline" className="w-8 justify-center font-bold border-blue-100 text-blue-600 bg-blue-50/30">{item.label}</Badge>
                      <span className="text-xs font-semibold text-[#1F3864]">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Section */}
              <div className="space-y-4">
                <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Average Follow-ups</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { range: "2 - 3", label: "Good", color: "bg-green-100 text-green-700" },
                    { range: "3 - 4", label: "Very Good", color: "bg-blue-100 text-blue-700" },
                    { range: "> 4", label: "Strong Followup", color: "bg-purple-100 text-purple-700" }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100/50">
                      <span className="text-xs font-bold text-gray-600">{item.range}</span>
                      <Badge className={`${item.color} border-none font-bold uppercase text-[9px] px-2 py-0.5`}>{item.label}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-auto">
              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                <p className="text-[10px] text-blue-800/70 font-medium leading-relaxed">
                  <span className="font-bold">Total Enquiries</span> = Active + Lost + Invoiced <br/>
                  <span className="font-bold">Active</span> = Today + Overdue + Upcoming + No Followup
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Performance Table */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        <div className="flex items-center gap-2 bg-[#1F3864] px-6 py-4">
          <UserCheck size={16} className="text-white/70" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Executive Wise Active Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-3 font-bold text-gray-900 uppercase text-[11px]">Executive</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Today</th>
                <th className="px-6 py-3 text-center font-bold text-[#EB5757] uppercase text-[11px]">Overdue</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Upcoming</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">No Followup</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Total Active</th>
                <th className="px-6 py-3 text-center font-bold text-gray-900 uppercase text-[11px]">Overdue %</th>
              </tr>
            </thead>
            <tbody>
              {executives.map((exec: any) => {
                const overduePct = exec.totalActive > 0 ? Math.round((exec.overdue / exec.totalActive) * 100) : 0;
                return (
                  <tr key={exec.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#1F3864]">{exec.name}</td>
                    <td className="px-6 py-4 text-center font-medium">{exec.today}</td>
                    <td className="px-6 py-4 text-center font-bold text-red-600">{exec.overdue}</td>
                    <td className="px-6 py-4 text-center">{exec.upcoming}</td>
                    <td className="px-6 py-4 text-center text-gray-400">{exec.noFollowup}</td>
                    <td className="px-6 py-4 text-center font-extrabold text-[#2E75B6]">{exec.totalActive}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${overduePct > 50 ? 'bg-red-100 text-red-700' : overduePct > 20 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {overduePct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-blue-50/50 font-bold">
              <tr>
                <td className="px-6 py-3">Total</td>
                <td className="px-6 py-3 text-center">{executives.reduce((a: any, b: any) => a + b.today, 0)}</td>
                <td className="px-6 py-3 text-center text-red-600">{executives.reduce((a: any, b: any) => a + b.overdue, 0)}</td>
                <td className="px-6 py-3 text-center">{executives.reduce((a: any, b: any) => a + b.upcoming, 0)}</td>
                <td className="px-6 py-3 text-center">{executives.reduce((a: any, b: any) => a + b.noFollowup, 0)}</td>
                <td className="px-6 py-3 text-center text-[#2E75B6]">{executives.reduce((a: any, b: any) => a + b.totalActive, 0)}</td>
                <td className="px-6 py-3 text-center">
                  {Math.round((executives.reduce((a: any, b: any) => a + b.overdue, 0) / executives.reduce((a: any, b: any) => a + b.totalActive, 1)) * 100)}%
                </td>
              </tr>
            </tfoot>
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

function KPICard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center transition-all hover:shadow-md">
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
