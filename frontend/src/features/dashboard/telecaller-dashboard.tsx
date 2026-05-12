import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid
} from "recharts";
import {
  CheckCircle2, Calendar, Info, PhoneCall, Bike, Target, Zap,
  ClipboardList, TrendingUp, Clock, AlertTriangle, CalendarClock,
  Ban, Bookmark, FileCheck, Truck, XCircle, X
} from "lucide-react";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { Breadcrumb, Badge } from "@/components/ui";
import { InterestBadge } from "@/components/interest-badge";
import { useState } from "react";

const PRIMARY_SOURCES = ["Google", "Instagram", "Facebook", "Reference", "Walk-in", "Website", "WhatsApp"];
const PRIMARY_MODELS = [
  "H’ness CB350", "CB350", "CB350RS", "NX200", "Hornet 2.0", 
  "CB750 Hornet", "X-ADV 750", "XL750 Transalp", "CB650R", 
  "CBR650R", "NX500", "Rebel 500"
];

const STAGE_ORDER = ["NEW", "ENQUIRED", "NOT_REACHABLE", "BOOKED", "LOST", "DELIVERED_CLOSED"];
const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  ENQUIRED: "Enquiry",
  NOT_REACHABLE: "Not Reachable",
  BOOKED: "Booked",
  LOST: "Lost",
  DELIVERED_CLOSED: "Delivered & Closed",
};

const INTEREST_LEVELS = ["HOT", "WARM", "COLD"];

interface Props {
  dateFrom?: string;
  dateTo?: string;
}

export default function TelecallerDashboard({ dateFrom: propDateFrom, dateTo: propDateTo }: Props) {
  const [internalDateFrom, setInternalDateFrom] = useState("");
  const [internalDateTo, setInternalDateTo] = useState("");
  
  const dateFrom = propDateFrom || internalDateFrom;
  const dateTo = propDateTo || internalDateTo;
  
  const [matrixTab, setMatrixTab] = useState<"source" | "model">("source");
  const [hideEmptyDays, setHideEmptyDays] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "telecaller-detailed", dateFrom, dateTo],
    queryFn: () => api.get("/reports/telecaller-detailed", { params: { dateFrom, dateTo } }).then((r) => r.data.data),
  });

  if (isLoading) return <PageLoader message="Generating dashboard..." />;

  const {
    sources: allSources = [],
    models: allModels = [],
    deliveredBySource = [],
    stages = [],
    interestLevels = [],
    closingStages = [],
    dailySource = [],
    dailyModel = [],
    kpi = {},
  } = data || {};

  const sources = allSources.filter((s: any) => 
    PRIMARY_SOURCES.some(p => s.name.toLowerCase().includes(p.toLowerCase()))
  );

  const models = allModels
    .filter((m: any) => PRIMARY_MODELS.some(p => m.name.toLowerCase().includes(p.toLowerCase())))
    .sort((a: any, b: any) => {
      const idxA = PRIMARY_MODELS.findIndex(p => a.name.toLowerCase().includes(p.toLowerCase()));
      const idxB = PRIMARY_MODELS.findIndex(p => b.name.toLowerCase().includes(p.toLowerCase()));
      return idxA - idxB;
    });

  const getSourceCount = (sourceId: number) => deliveredBySource.find((s: any) => s.sourceId === sourceId)?.count || 0;
  const getStageCount = (stage: string) => stages.find((s: any) => s.stage === stage)?.count || 0;
  const getInterestCount = (level: string) => interestLevels.find((i: any) => i.level === level)?.count || 0;

  const totalEnquiries = stages.reduce((acc: number, s: any) => acc + s.count, 0);
  const deliveredTotal = sources.reduce((acc: number, s: any) => acc + getSourceCount(s.id), 0);
  const hotTotal = getInterestCount("HOT");

  const kpiCards = [
    { label: "Total Enquiries", value: kpi?.totalEnquiries, icon: ClipboardList, accent: "#2E75B6", bg: "bg-blue-50", tab: "all" },
    { label: "Active", value: kpi?.active, icon: TrendingUp, accent: "#6366F1", bg: "bg-indigo-50", tab: "all" },
    { label: "Today's Follow-ups", value: kpi?.today, icon: Clock, accent: "#0891B2", bg: "bg-cyan-50", tab: "today" },
    { label: "Overdue", value: kpi?.overdue, icon: AlertTriangle, accent: "#EB5757", bg: "bg-red-50", tab: "overdue" },
    { label: "Upcoming", value: kpi?.upcoming, icon: CalendarClock, accent: "#F2994A", bg: "bg-amber-50", tab: "upcoming" },
    { label: "No Follow-up", value: kpi?.noFollowup, icon: Ban, accent: "#D97706", bg: "bg-orange-50", tab: "no-followup" },
    { label: "Booked", value: kpi?.booked, icon: Bookmark, accent: "#E8792F", bg: "bg-orange-50", tab: "all" },
    { label: "Invoiced", value: kpi?.invoiced, icon: FileCheck, accent: "#27AE60", bg: "bg-green-50", tab: "all" },
    { label: "Delivered", value: kpi?.delivered, icon: Truck, accent: "#059669", bg: "bg-emerald-50", tab: "all" },
    { label: "Lost", value: kpi?.lost, icon: XCircle, accent: "#EB5757", bg: "bg-red-50", tab: "all" },
  ];

  const closingStats = {
    booked: closingStages.find((s: any) => s.stage === "BOOKED")?.count || 0,
    cancelled: closingStages.filter((s: any) => s.reason?.toLowerCase().includes("cancel")).reduce((acc: number, cur: any) => acc + cur.count, 0),
    notInterested: closingStages.filter((s: any) => s.reason?.toLowerCase().includes("not interested")).reduce((acc: number, cur: any) => acc + cur.count, 0),
    lostToCompetitor: closingStages.filter((s: any) => s.reason?.toLowerCase().includes("competitor")).reduce((acc: number, cur: any) => acc + cur.count, 0),
    noResponse: closingStages.filter((s: any) => s.reason?.toLowerCase().includes("response") || s.reason?.toLowerCase().includes("reachable")).reduce((acc: number, cur: any) => acc + cur.count, 0),
  };

  const days = eachDayOfInterval({ start: new Date(dateFrom), end: new Date(dateTo) });

  const dailySourceData = days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const row: any = { date: format(day, "dd MMM"), day: format(day, "EEE") };
    let total = 0;
    sources.forEach((s: any) => {
      const count = dailySource.find((d: any) => d.sourceId === s.id && d.date.startsWith(dateStr))?.count || 0;
      row[s.name] = count;
      total += count;
    });
    row.Total = total;
    return row;
  });

  const dailyModelData = days.map(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const row: any = { date: format(day, "dd MMM"), day: format(day, "EEE") };
    let total = 0;
    models.forEach((m: any) => {
      const count = dailyModel.find((d: any) => d.modelId === m.id && d.date.startsWith(dateStr))?.count || 0;
      row[m.name] = count;
      total += count;
    });
    row.Total = total;
    return row;
  });

  const filteredDailySource = hideEmptyDays ? dailySourceData.filter(d => d.Total > 0) : dailySourceData;
  const filteredDailyModel = hideEmptyDays ? dailyModelData.filter(d => d.Total > 0) : dailyModelData;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Tele-caller Dashboard", icon: PhoneCall }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Tele-caller Performance</h1>
          <p className="text-[12px] text-gray-400">Date-wise and source-wise enquiry analytics</p>
        </div>

      {!propDateFrom && !propDateTo && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <Calendar size={14} className="text-gray-400" />
          <input type="date" value={internalDateFrom} onChange={(e) => setInternalDateFrom(e.target.value)} className="border-0 bg-transparent text-sm focus:outline-none" />
          <span className="text-gray-300">→</span>
          <input type="date" value={internalDateTo} onChange={(e) => setInternalDateTo(e.target.value)} className="border-0 bg-transparent text-sm focus:outline-none" />
          <button 
            onClick={() => {
              setInternalDateFrom("");
              setInternalDateTo("");
            }}
            className="ml-1 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Clear dates"
          >
            <X size={14} />
          </button>
        </div>
      )}
      </div>

      {/* Admin Pattern KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <Link
            key={card.label}
            to="/leads"
            search={{ tab: card.tab }}
            className={`group relative overflow-hidden rounded-xl ${card.bg} p-4 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md hover:ring-[#2E75B6]/20`}
          >
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
                  {card.value ?? "0"}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Summary Table Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 size={18} className="text-green-600" />
            </div>
            <h3 className="text-[14px] font-bold text-[#1F3864] uppercase tracking-wide">Delivered & Closed by Source</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  {sources.map((s: any) => (
                    <th key={s.id} className="px-3 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b">
                      {s.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-[#1F3864] uppercase tracking-wider border-b">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {sources.map((s: any) => (
                    <td key={s.id} className="px-3 py-4 font-semibold text-gray-700 border-b">
                      {getSourceCount(s.id)}
                    </td>
                  ))}
                  <td className="px-3 py-4 font-bold text-[#2E75B6] border-b bg-blue-50/30">
                    {deliveredTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Stage Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Target size={18} className="text-[#2E75B6]" />
            </div>
            <h3 className="text-[14px] font-bold text-[#1F3864] uppercase tracking-wide">Stages</h3>
          </div>
          <div className="space-y-3">
            {STAGE_ORDER.map(stage => (
              <div key={stage} className="flex justify-between items-center group">
                <span className="text-[13px] text-gray-600">{STAGE_LABELS[stage] || stage}</span>
                <Badge variant={stage === 'DELIVERED_CLOSED' ? 'success' : 'primary'}>{getStageCount(stage)}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Interest Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Zap size={18} className="text-amber-600" />
            </div>
            <h3 className="text-[14px] font-bold text-[#1F3864] uppercase tracking-wide">Interest</h3>
          </div>
          <div className="space-y-3">
            {INTEREST_LEVELS.map(level => (
              <div key={level} className="flex justify-between items-center">
                <InterestBadge level={level} size="sm" />
                <span className="text-sm font-bold text-gray-700">{getInterestCount(level)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center group pt-1">
              <span className="text-[13px] text-gray-400">Not Collected</span>
              <span className="text-sm font-semibold text-gray-400">{getInterestCount("")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h3 className="mb-4 text-[14px] font-bold text-[#1F3864] uppercase tracking-wide">Closing Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-600">Booked</span><Badge variant="success">{closingStats.booked}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-600">Cancelled</span><Badge variant="danger">{closingStats.cancelled}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-600">Not Interested</span><Badge variant="danger">{closingStats.notInterested}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-600">Lost to Competitor</span><Badge variant="danger">{closingStats.lostToCompetitor}</Badge></div>
            <div className="flex justify-between items-center"><span className="text-[13px] text-gray-600">No Response</span><Badge variant="warning">{closingStats.noResponse}</Badge></div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-[#1F3864] uppercase tracking-wide">Daily Enquiry Trend</h3>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
              <div className="h-2 w-2 rounded-full bg-[#2E75B6]" />
              Total Leads
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySourceData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                <Bar dataKey="Total" fill="#2E75B6" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1F3864] px-6 py-1 rounded-t-2xl shadow-sm ring-1 ring-black/5">
          <div className="flex gap-6">
            <button
              onClick={() => setMatrixTab("source")}
              className={`pb-4 pt-4 text-[13px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                matrixTab === "source" ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              Source Wise Matrix
            </button>
            <button
              onClick={() => setMatrixTab("model")}
              className={`pb-4 pt-4 text-[13px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                matrixTab === "model" ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              Model Wise Matrix
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Hide Empty Days</span>
            <button
              onClick={() => setHideEmptyDays(!hideEmptyDays)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                hideEmptyDays ? "bg-green-500" : "bg-white/20"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  hideEmptyDays ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {matrixTab === "source" && (
          <div className="rounded-b-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-4 text-left font-bold text-gray-900 border-b border-r w-32 uppercase tracking-wide">Date</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900 border-b border-r w-20 uppercase tracking-wide">Day</th>
                    {sources.map((s: any) => (
                      <th key={s.id} className="px-6 py-4 text-center font-bold text-gray-900 border-b border-r min-w-[120px] uppercase tracking-wide">{s.name}</th>
                    ))}
                    <th className="px-6 py-4 text-center font-bold text-[#2E75B6] border-b bg-blue-50/80 min-w-[120px] uppercase tracking-wide">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDailySource.length > 0 ? (
                    filteredDailySource.map((row, i) => (
                      <tr key={i} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                        <td className="px-6 py-3.5 font-semibold text-gray-700 border-b border-r">{row.date}</td>
                        <td className={`px-6 py-3.5 font-bold border-b border-r ${row.day === 'Sun' ? 'text-red-500 bg-red-50/50' : 'text-gray-500'}`}>{row.day}</td>
                        {sources.map((s: any) => (
                          <td key={s.id} className={`px-6 py-3.5 text-center border-b border-r text-[15px] ${row[s.name] > 0 ? 'font-bold text-gray-900' : 'text-gray-300'}`}>{row[s.name] || '0'}</td>
                        ))}
                        <td className="px-6 py-3.5 text-center border-b bg-blue-50/20 font-extrabold text-[#2E75B6] text-[15px]">{row.Total || '0'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={sources.length + 3} className="px-4 py-8 text-center text-gray-400 italic">No data found for the selected period</td>
                    </tr>
                  )}
                </tbody>
                {filteredDailySource.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-white shadow-[0_-4px_6px_rgba(0,0,0,0.05)] z-10">
                    <tr className="bg-blue-50 font-bold text-[#1F3864] text-[15px]">
                      <td className="px-6 py-4 border-t border-r">TOTAL</td>
                      <td className="px-6 py-4 border-t border-r"></td>
                      {sources.map((s: any) => (
                        <td key={s.id} className="px-6 py-4 text-center border-t border-r">
                          {dailySourceData.reduce((acc, row) => acc + (row[s.name] || 0), 0)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-center border-t bg-blue-600 text-white shadow-inner">
                        {dailySourceData.reduce((acc, row) => acc + (row.Total || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {matrixTab === "model" && (
          <div className="rounded-b-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="bg-gray-50/80">
                    <th className="px-6 py-4 text-left font-bold text-gray-900 border-b border-r w-32 uppercase tracking-wide">Date</th>
                    <th className="px-6 py-4 text-left font-bold text-gray-900 border-b border-r w-20 uppercase tracking-wide">Day</th>
                    {models.map((m: any) => (
                      <th key={m.id} className="px-6 py-4 text-center font-bold text-gray-900 border-b border-r min-w-[140px] uppercase tracking-wide">{m.name}</th>
                    ))}
                    <th className="px-6 py-4 text-center font-bold text-[#2E75B6] border-b bg-blue-50/80 min-w-[120px] uppercase tracking-wide">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDailyModel.length > 0 ? (
                    filteredDailyModel.map((row, i) => (
                      <tr key={i} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                        <td className="px-6 py-3.5 font-semibold text-gray-700 border-b border-r">{row.date}</td>
                        <td className={`px-6 py-3.5 font-bold border-b border-r ${row.day === 'Sun' ? 'text-red-500 bg-red-50/50' : 'text-gray-500'}`}>{row.day}</td>
                        {models.map((m: any) => (
                          <td key={m.id} className={`px-6 py-3.5 text-center border-b border-r text-[15px] ${row[m.name] > 0 ? 'font-bold text-gray-900' : 'text-gray-300'}`}>{row[m.name] || '0'}</td>
                        ))}
                        <td className="px-6 py-3.5 text-center border-b bg-blue-50/20 font-extrabold text-[#2E75B6] text-[15px]">{row.Total || '0'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={models.length + 3} className="px-4 py-8 text-center text-gray-400 italic">No data found for the selected period</td>
                    </tr>
                  )}
                </tbody>
                {filteredDailyModel.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-white shadow-[0_-4px_6px_rgba(0,0,0,0.05)] z-10">
                    <tr className="bg-blue-50 font-bold text-[#1F3864] text-[15px]">
                      <td className="px-6 py-4 border-t border-r">TOTAL</td>
                      <td className="px-6 py-4 border-t border-r"></td>
                      {models.map((m: any) => (
                        <td key={m.id} className="px-6 py-4 text-center border-t border-r">
                          {dailyModelData.reduce((acc, row) => acc + (row[m.name] || 0), 0)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-center border-t bg-blue-600 text-white shadow-inner">
                        {dailyModelData.reduce((acc, row) => acc + (row.Total || 0), 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-4 text-[11px] text-gray-500 italic">
        <Info className="h-4 w-4 text-blue-400" />
        Data reflected here is specific to enquiries created by or assigned to you within the selected date range.
      </div>
    </div>
  );
}
