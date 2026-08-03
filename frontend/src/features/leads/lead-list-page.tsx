import { useState, useEffect, useRef } from "react";
import { formatDistanceStrict } from "date-fns";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link, useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import {
  Plus, Filter, X, ClipboardList,
  Flame, Sun, Snowflake, Search, TrendingUp,
  Download, Loader2, MessageCircle, Trash2,
  CheckCircle, XCircle, Clock,
  Building, Wrench, Headset, Megaphone
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatDateTime, formatDateTimeShort, STAGE_COLORS, STAGE_LABELS, useLookup, useUsers, useSessionState } from "@/lib/hooks";
import { useAuthStore } from "@/stores/auth";
import { Breadcrumb, Tooltip } from "@/components/ui";
import { InterestBadge } from "@/components/interest-badge";
import { DataTable, SummaryCard, FilterChips, Pagination, type Column } from "@/components/data-table";

type Tab = "all" | "active" | "today" | "overdue" | "upcoming" | "no-followup" | "booked" | "meta" | "meta-contacted" | "meta-non-contacted" | "meta-completed" | "service";
type InterestFilter = "ALL" | "HOT" | "WARM" | "COLD";

const TABS: { key: Tab; label: string; endpoint: string }[] = [
  { key: "all", label: "All Leads", endpoint: "/leads" },
  { key: "active", label: "Active", endpoint: "/leads/active" },
  { key: "today", label: "Today's Follow-ups", endpoint: "/leads/today" },
  { key: "overdue", label: "Overdue", endpoint: "/leads/overdue" },
  { key: "upcoming", label: "Upcoming", endpoint: "/leads/upcoming" },
  { key: "no-followup", label: "No next Follow-up", endpoint: "/leads/no-followup" },
  { key: "booked", label: "Booked", endpoint: "/leads/booked" },
  { key: "service", label: "Service Leads", endpoint: "/leads" },
  { key: "meta", label: "Meta Leads", endpoint: "/leads" },
];

export default function LeadListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMetaRoute = location.pathname.startsWith("/meta-leads");
  const isTeleRoute = location.pathname.startsWith("/tele-leads");
  const isServiceRoute = location.pathname.startsWith("/service-leads");
  const searchParams = useSearch({ strict: false }) as any;
  const pfx = isMetaRoute ? "meta" : isTeleRoute ? "tele" : isServiceRoute ? "service" : "leads";
  const defaultTab = isMetaRoute ? "meta" : "all";

  const [tab, setTab] = useSessionState<Tab>(`${pfx}-tab`, defaultTab);

  useEffect(() => {
    if (searchParams.tab && searchParams.tab !== tab) {
      if (isMetaRoute && !searchParams.tab.startsWith("meta")) {
        setTab("meta");
      } else {
        setTab(searchParams.tab);
      }
    }
  }, [searchParams.tab, isMetaRoute, isServiceRoute]);
  const [page, setPage] = useSessionState(`${pfx}-page`, 1);
  const [pageSize, setPageSize] = useSessionState(`${pfx}-pageSize`, 25);
  const [search, setSearch] = useSessionState(`${pfx}-search`, "");
  const [interest, setInterest] = useSessionState<InterestFilter>(`${pfx}-interest`, "ALL");
  const [followupSeq, setFollowupSeq] = useSessionState(`${pfx}-followupSeq`, "");
  const [showFilters, setShowFilters] = useSessionState(`${pfx}-showFilters`, false);
  const [downloading, setDownloading] = useSessionState(`${pfx}-downloading`, false);
  const [downloadingWhatsapp, setDownloadingWhatsapp] = useSessionState(`${pfx}-downloadingWhatsapp`, false);
  const [isTruncating, setIsTruncating] = useSessionState(`${pfx}-isTruncating`, false);
  const currentUser = useAuthStore((s) => s.user);

  const { data: metaForms } = useQuery({
    queryKey: ["meta-forms"],
    queryFn: () => api.get("/leads/meta/forms").then(r => r.data.data),
    enabled: tab.startsWith("meta"),
  });

  // advanced filters
  const [stage, setStage] = useSessionState(`${pfx}-stage`, "");
  const [channel, setChannel] = useSessionState(`${pfx}-channel`, "");
  const [interestLevel, setInterestLevel] = useSessionState(`${pfx}-interestLevel`, "");
  const [assignedTo, setAssignedTo] = useSessionState(`${pfx}-assignedTo`, "");
  const [executiveName, setExecutiveName] = useSessionState(`${pfx}-executiveName`, "");
  const [referredFromBranch, setReferredFromBranch] = useSessionState(`${pfx}-referredFromBranch`, "");
  const [metaForm, setMetaForm] = useSessionState(`${pfx}-metaForm`, "");
  const [sourceId, setSourceId] = useSessionState(`${pfx}-sourceId`, "");
  const [modelId, setModelId] = useSessionState(`${pfx}-modelId`, "");
  const [dateFrom, setDateFrom] = useSessionState(`${pfx}-dateFrom`, "");
  const [dateTo, setDateTo] = useSessionState(`${pfx}-dateTo`, "");
  const [hiriseStatus, setHiriseStatus] = useSessionState(`${pfx}-hiriseStatus`, "");
  const [metaStatus, setMetaStatus] = useSessionState(`${pfx}-metaStatus`, "");



  const { data: sources } = useLookup("enquiry-sources");
  const { data: models } = useLookup("vehicle-models");
  const { data: executives } = useLookup("sales-executives");
  const { data: branches } = useLookup("referred-branches");
  const { data: metaStatuses } = useLookup("meta-statuses");

  const visibleTabs = isMetaRoute 
    ? [
        { key: "meta" as Tab, label: "All Meta Leads", endpoint: "/leads" },
        { key: "meta-non-contacted" as Tab, label: "Non Contacted", endpoint: "/leads" },
        { key: "meta-contacted" as Tab, label: "Contacted", endpoint: "/leads" },
        { key: "meta-completed" as Tab, label: "Completed", endpoint: "/leads" }
      ] 
    : isServiceRoute
    ? [{ key: "all" as Tab, label: "All Service Leads", endpoint: "/leads" }]
    : TABS.filter((t) => t.key !== "meta" && t.key !== "service");

  const activeTab = visibleTabs.find((t) => t.key === tab) || visibleTabs[0];

  const params: any = { page, pageSize };
  if (search) params.q = search;
  if (interest !== "ALL") params.interestLevel = interest;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (stage) params.stage = stage;
  if (tab.startsWith("meta")) params.channel = "SOCIAL";
  if (tab === "meta-contacted") params.contactStatus = "CONTACTED";
  if (tab === "meta-non-contacted") params.contactStatus = "NON_CONTACTED";
  if (tab === "meta-completed") params.contactStatus = "COMPLETED";
  if (tab === "service") params.channel = "SERVICE";
  else if (isServiceRoute) params.channel = "SERVICE";
  else if (isTeleRoute) params.channel = "TELE";
  else if (channel) params.channel = channel;
  else if (!isMetaRoute) params.channel = "WALKIN,DIGITAL,REFERENCE,WEBSITE";
  if (sourceId) params.sourceId = sourceId;
  if (modelId) params.modelId = modelId;
  if (executiveName) params.executiveName = executiveName;
  if (followupSeq) params.followupSeq = followupSeq;
  if (referredFromBranch) params.referredFromBranch = referredFromBranch;
  if (metaForm) params.metaForm = metaForm;
  if (hiriseStatus) params.hiriseStatus = hiriseStatus;
  if (metaStatus) params.metaStatus = metaStatus;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await api.get("/leads/export-excel", {
        params: { ...params, view: tab, pageSize: 10000, t: Date.now() },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const modulePrefix = isMetaRoute ? "Meta Leads" : isTeleRoute ? "Tele Leads" : isServiceRoute ? "Service Leads" : "Highrise Leads";
      const currentTabLabel = visibleTabs.find(t => t.key === tab)?.label || tab;
      link.setAttribute("download", `${modulePrefix} - ${currentTabLabel}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadWhatsapp = async () => {
    try {
      setDownloadingWhatsapp(true);
      const res = await api.get("/leads/export-excel", {
        params: { ...params, view: tab, format: "whatsapp", pageSize: 10000, t: Date.now() },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const modulePrefix = isMetaRoute ? "Meta Leads" : isTeleRoute ? "Tele Leads" : isServiceRoute ? "Service Leads" : "Highrise Leads";
      const currentTabLabel = visibleTabs.find(t => t.key === tab)?.label || tab;
      link.setAttribute("download", `Campaign Report - ${modulePrefix} - ${currentTabLabel}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("WhatsApp export failed", err);
    } finally {
      setDownloadingWhatsapp(false);
    }
  };

  const handleTruncateMeta = async () => {
    if (!window.confirm("Are you sure you want to delete ALL Meta Leads? This cannot be undone!")) return;
    try {
      setIsTruncating(true);
      await api.delete("/leads/meta/truncate");
      window.location.reload();
    } catch (err) {
      console.error("Failed to truncate", err);
      alert("Failed to truncate leads");
    } finally {
      setIsTruncating(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["leads", tab, params],
    queryFn: () => api.get(activeTab.endpoint, { params }).then((r) => r.data),
  });

  const leads = data?.data ?? [];
  const meta = data?.meta;

  // Restore scroll position when returning from details page
  useEffect(() => {
    if (!isLoading && data) {
      const scrollY = sessionStorage.getItem(`${pfx}-scroll`);
      if (scrollY) {
        setTimeout(() => {
          const mainElement = document.getElementById("main-scroll-container");
          if (mainElement) {
            mainElement.scrollTo({ top: parseInt(scrollY, 10), behavior: "instant" });
          }
          sessionStorage.removeItem(`${pfx}-scroll`);
        }, 100);
      }
    }
  }, [isLoading, data, pfx]);

  // Summary counts by interest — fetched from server for the CURRENT filter set
  // (ignores `interest` filter itself so the chips always show total counts)
  const countParams: any = { pageSize: 1 };
  if (search) countParams.q = search;
  if (dateFrom) countParams.dateFrom = dateFrom;
  if (dateTo) countParams.dateTo = dateTo;
  if (stage) countParams.stage = stage;
  if (tab.startsWith("meta")) countParams.channel = "SOCIAL";
  if (tab === "meta-contacted") countParams.contactStatus = "CONTACTED";
  if (tab === "meta-non-contacted") countParams.contactStatus = "NON_CONTACTED";
  if (tab === "meta-completed") countParams.contactStatus = "COMPLETED";
  if (tab === "service") countParams.channel = "SERVICE";
  else if (isServiceRoute) countParams.channel = "SERVICE";
  else if (isTeleRoute) countParams.channel = "TELE";
  else if (channel) countParams.channel = channel;
  if (sourceId) countParams.sourceId = sourceId;
  if (modelId) countParams.modelId = modelId;
  if (executiveName) countParams.executiveName = executiveName;
  if (followupSeq) countParams.followupSeq = followupSeq;
  if (hiriseStatus) countParams.hiriseStatus = hiriseStatus;
  if (metaStatus) countParams.metaStatus = metaStatus;
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

  const hiriseCountQueries = useQueries({
    queries: ["ENTERED", "NOT_ENTERED"].map((status) => ({
      queryKey: ["leads-hirise-count", tab, status, countParams],
      queryFn: () =>
        api
          .get(activeTab.endpoint, { params: { ...countParams, hiriseStatus: status } })
          .then((r) => r.data.meta?.total ?? 0),
      staleTime: 30_000,
    })),
  });

  const hiriseCounts = {
    ENTERED: hiriseCountQueries[0].data ?? 0,
    NOT_ENTERED: hiriseCountQueries[1].data ?? 0,
  };

  const hasActiveFilters = stage || channel || sourceId || modelId || executiveName || dateFrom || dateTo || referredFromBranch || hiriseStatus || metaStatus;
  const clearFilters = () => {
    setStage(""); setChannel(""); setSourceId("");
    setModelId(""); setExecutiveName(""); setDateFrom(""); setDateTo(""); setReferredFromBranch(""); setHiriseStatus(""); setMetaStatus("");
    setPage(1);
  };

  // ─── Column definitions ────────────────────────────────────
  const columns: Column<any>[] = [
    {
      key: "sno",
      label: "S.No",
      width: "60px",
      align: "center",
      render: (l) => {
        const idx = leads.indexOf(l);
        const sNo = ((page - 1) * pageSize) + idx + 1;
        return <span className="text-xs font-medium text-gray-400">{sNo}</span>;
      },
    },
    {
      key: "enquiryNo",
      label: "Enquiry No",
      sortable: true,
      width: "180px",
      render: (l) => {
        if (isTeleRoute || isMetaRoute) {
          const entered = Boolean(l.dmsEnquiryNo || l.linkedDmsEnquiryNo);
          if (entered) {
            return <span className="whitespace-nowrap font-bold text-[#10B981]">{l.enquiryNo}</span>;
          }
        }
        return <span className="whitespace-nowrap font-bold text-[#2E75B6]">{l.enquiryNo}</span>;
      },
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
    ...((channel === "SERVICE" || tab === "service" || isServiceRoute) ? [
      {
        key: "expectedServiceDate",
        label: "Service Date",
        sortable: true,
        render: (l: any) => <span className="font-semibold text-[#2E75B6]">{formatDate(l.expectedServiceDate)}</span>,
      },
      {
        key: "typeOfService",
        label: "Type",
        render: (l: any) => <span className="text-gray-600">{l.typeOfService || "—"}</span>,
      },
      {
        key: "pickupDropFlag",
        label: "P/D",
        render: (l: any) => <span>{l.pickupDropFlag ? "✅" : "—"}</span>,
      }
    ] : [
      {
        key: "interestLevel",
        label: "Interest",
        sortable: true,
        render: (l: any) => <InterestBadge level={l.interestLevel} />,
        sortValue: (l: any) => ({ HOT: 0, WARM: 1, COLD: 2 }[l.interestLevel as string] ?? 3),
      }
    ]),
    {
      key: "stage",
      label: "Stage",
      sortable: true,
      render: (l: any) => (
        <span className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-semibold transition-all hover:brightness-105 hover:scale-105 ${STAGE_COLORS[l.stage] ?? "bg-gray-100"}`}>
          {STAGE_LABELS[l.stage] ?? l.stage.replace(/_/g, " ")}
        </span>
      ),
      sortValue: (l: any) => l.stage,
    },
    {
      key: "referredFromBranch",
      label: "Branch",
      sortable: true,
      render: (l: any) => l.referredFromBranch ? (
        <span className="text-[11px] font-semibold text-gray-600">{l.referredFromBranch}</span>
      ) : <span className="text-gray-300">—</span>,
      sortValue: (l: any) => l.referredFromBranch ?? "",
    },
    {
      key: "assignedTo",
      label: "Assigned To",
      render: (l: any) => {
        const name = l.assignedTo?.fullName ?? l.executiveName;
        if (!name) return <span className="text-gray-300 italic text-[11px] whitespace-nowrap">Unassigned</span>;
        return (
          <div className="flex items-center gap-1.5 opacity-80 whitespace-nowrap">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <span className="text-[11px] font-semibold uppercase italic text-gray-500 tracking-wider">
              {name}
            </span>
          </div>
        );
      },
    },
    {
      key: "createdBy",
      label: "Created By",
      render: (l: any) => {
        if (!l.createdByUsername) return <span className="text-gray-300 italic text-[11px] whitespace-nowrap">System</span>;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E75B6]">
              @{l.createdByUsername}
            </span>
          </div>
        );
      },
    },
    // {
    //   key: "updatedBy",
    //   label: "Updated By",
    //   render: (l: any) => {
    //     if (!l.updatedByUsername) return <span className="text-gray-300 italic text-[11px] whitespace-nowrap">—</span>;
    //     return (
    //       <div className="flex items-center gap-1.5 whitespace-nowrap">
    //         <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
    //           @{l.updatedByUsername}
    //         </span>
    //       </div>
    //     );
    //   },
    // },
    ...(tab === "overdue" ? [
      {
        key: "overdueDays",
        label: "Overdue Days",
        sortable: true,
        render: (l: any) => {
          if (!l.nextFollowupAt) return <span className="text-gray-300">—</span>;
          const nextDate = new Date(l.nextFollowupAt);
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const nextDateStart = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
          const days = Math.round((todayStart.getTime() - nextDateStart.getTime()) / (1000 * 60 * 60 * 24));
          return <span className="font-bold text-red-600">{days} Days</span>;
        },
        sortValue: (l: any) => l.nextFollowupAt ? new Date(l.nextFollowupAt).getTime() : 0,
      }
    ] : []),

    {
      key: "enquiryDate",
      label: "Hi-Rise Date",
      sortable: true,
      render: (l: any) => <span className="text-gray-500">{Boolean(l.dmsEnquiryNo || l.linkedDmsEnquiryNo) ? formatDate(l.linkedDmsEnquiryDate || l.enquiryDate) : "—"}</span>,
      sortValue: (l: any) => Boolean(l.dmsEnquiryNo || l.linkedDmsEnquiryNo) ? (l.linkedDmsEnquiryDate || l.enquiryDate) : 0,
    },
    {
      key: "createdAt",
      label: "CRM Created Date & Time",
      sortable: true,
      render: (l: any) => <span className="text-gray-500 whitespace-nowrap">{(Boolean(l.dmsEnquiryNo || l.linkedDmsEnquiryNo) && !["TELE", "SOCIAL"].includes(l.channel?.name ?? l.channel)) ? "—" : formatDateTime(l.createdAt)}</span>,
      sortValue: (l: any) => l.createdAt,
    },
    ...(tab.startsWith("meta") || isTeleRoute ? [
      {
        key: "metaStatus",
        label: "Call Status",
        sortable: true,
        render: (l: any) => {
          if (!l.metaStatus) return <span className="text-gray-300">—</span>;
          const statusConfig = (metaStatuses ?? []).find((s: any) => s.name === l.metaStatus);
          const color = statusConfig?.color || "#4F46E5";
          
          let reminderTime = "";
          if (l.nextFollowupAt) {
            reminderTime = formatDateTimeShort(l.nextFollowupAt);
          }

          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-bold shadow-sm uppercase tracking-wider"
              style={{
                color: color,
                backgroundColor: `${color}1A`,
                borderColor: `${color}40`,
                borderWidth: '1px'
              }}
            >
              <span>{l.metaStatus}</span>
              {reminderTime && (
                <span className="opacity-70 text-[10px] tracking-normal border-l pl-1.5 ml-0.5" style={{ borderColor: 'inherit' }}>
                  {reminderTime}
                </span>
              )}
            </span>
          );
        },
        sortValue: (l: any) => l.metaStatus ?? "",
      }
    ] : []),
  ];

  return (
    <div>
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        isMetaRoute 
          ? { label: "Meta Leads", to: "/meta-leads", icon: Megaphone }
          : isTeleRoute 
            ? { label: "Tele Leads", to: "/tele-leads", search: { tab: "all" }, icon: Headset }
            : isServiceRoute
              ? { label: "Service Leads", to: "/service-leads", search: { tab: "all" }, icon: Wrench }
              : { label: "Highrise Leads", to: "/leads", search: { tab: "all" }, icon: ClipboardList }
      ]} />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F3864] text-white">
            {isMetaRoute ? <Megaphone size={20} /> : isTeleRoute ? <Headset size={20} /> : isServiceRoute ? <Wrench size={20} /> : <ClipboardList size={20} />}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1F3864] truncate">
              {isMetaRoute ? "Meta Leads" : isTeleRoute ? "Tele Leads" : isServiceRoute ? "Service Leads" : "Highrise Leads"}
            </h1>
            <p className="text-[11px] sm:text-[12px] text-gray-400 line-clamp-1 sm:line-clamp-none">
              {isMetaRoute ? "Manage incoming Facebook and Instagram leads" : isServiceRoute ? "Track and manage all service enquiries" : "Track and manage all sales enquiries"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          {tab.startsWith("meta") && currentUser?.username === "developer" && (
            <button
              onClick={handleTruncateMeta}
              disabled={isTruncating}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-100 disabled:opacity-50"
            >
              {isTruncating ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
              <span className="hidden sm:inline">Truncate Meta</span>
            </button>
          )}
          <Link
            to="/leads/new"
            search={isServiceRoute ? { type: "service" } : undefined}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-[#245f96] hover:to-[#1a4472]"
          >
            <Plus size={16} /> <span>New Lead</span>
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className={`mb-5 grid grid-cols-2 gap-3 ${(isTeleRoute || isMetaRoute) ? "sm:grid-cols-3 lg:grid-cols-6" : isServiceRoute ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-4"}`}>
        <SummaryCard
          label="Total"
          value={meta?.total ?? "—"}
          icon={TrendingUp}
          color="#2E75B6"
          trend={tab !== "all" ? activeTab.label : undefined}
        />
        {!isServiceRoute && (
          <>
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
          </>
        )}
        {(isTeleRoute || isMetaRoute) && (
          <>
            <SummaryCard
              label="Hirise Entered"
              value={hiriseCounts.ENTERED}
              icon={CheckCircle}
              color="#10B981"
              active={hiriseStatus === "ENTERED"}
              onClick={() => { setHiriseStatus(hiriseStatus === "ENTERED" ? "" : "ENTERED"); setPage(1); }}
            />
            <SummaryCard
              label="Not Entered"
              value={hiriseCounts.NOT_ENTERED}
              icon={XCircle}
              color="#EF4444"
              active={hiriseStatus === "NOT_ENTERED"}
              onClick={() => { setHiriseStatus(hiriseStatus === "NOT_ENTERED" ? "" : "NOT_ENTERED"); setPage(1); }}
            />
          </>
        )}
      </div>

      {/* Top bar: search + filter toggle + interest chips */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {!isServiceRoute && (
            <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
              <div className="flex items-center gap-3 pl-2 pr-4 border-r border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Interest</span>
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
              </div>
              <div className="flex items-center gap-3 pl-2 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Follow-up</span>
                <FilterChips
                  value={followupSeq}
                  onChange={(v) => { setFollowupSeq(v); setPage(1); }}
                  options={[
                    { key: "", label: "All" },
                    { key: "1", label: "F1", color: "#2E75B6" },
                    { key: "2", label: "F2", color: "#2E75B6" },
                    { key: "3", label: "F3", color: "#2E75B6" },
                    { key: "4", label: "F4", color: "#2E75B6" },
                    { key: "5", label: "F5", color: "#2E75B6" },
                    { key: "gt5", label: "More than F5", color: "#6366F1" },
                  ]}
                />
              </div>
            </div>
          )}

          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${hasActiveFilters ? "border-[#2E75B6] bg-blue-50 text-[#2E75B6]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              <Filter size={14} /> Filters
              {hasActiveFilters && <span className="ml-0.5 h-2 w-2 rounded-full bg-[#2E75B6]" />}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                title="Clear all filters"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
        <div className="flex min-w-max gap-1 overflow-x-auto no-scrollbar">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { 
                setTab(t.key); 
                setPage(1); 
                navigate({ search: { ...searchParams, tab: t.key } as any, replace: true });
              }}
              className={`relative px-5 py-3 text-sm font-semibold transition-all ${
                tab === t.key 
                  ? "text-[#1F3864]" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-[#2E75B6]" />
              )}
            </button>
          ))}
        </div>
        
        {(tab.startsWith("meta") || isTeleRoute) && (
          <div className="flex items-center gap-2 pb-2 sm:pb-0 pr-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Call Status</span>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
              <select
                value={metaStatus}
                onChange={(e) => { setMetaStatus(e.target.value); setPage(1); }}
                className="border-0 bg-transparent py-1 text-xs font-medium text-gray-700 focus:outline-none w-36"
              >
                <option value="">All statuses</option>
                {(metaStatuses ?? []).map((status: any) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
              {metaStatus && (
                <button 
                  onClick={() => { setMetaStatus(""); setPage(1); }}
                  className="ml-1 rounded-full bg-gray-200 p-1 text-gray-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Bar: Dates & Exports */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {tab.startsWith("meta") && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1F3864]">Forms</span>
                <div className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-2 py-1">
                  <select
                    value={metaForm}
                    onChange={(e) => { setMetaForm(e.target.value); setPage(1); }}
                    className="border-0 bg-transparent py-1 text-xs font-medium text-[#1F3864] focus:outline-none w-48"
                  >
                    <option value="">All forms</option>
                    {(metaForms ?? []).map((formName: string) => (
                      <option key={formName} value={formName}>
                        {formName}
                      </option>
                    ))}
                  </select>
                  {metaForm && (
                    <button 
                      onClick={() => { setMetaForm(""); setPage(1); }}
                      className="ml-1 rounded-full bg-gray-200 p-1 text-gray-500 hover:bg-red-500 hover:text-white transition-all"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1F3864]">Date Filter</span>
            <div className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-2 py-1">
              <input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} 
                className="border-0 bg-transparent py-1 text-xs font-medium text-[#1F3864] focus:outline-none" 
              />
              <span className="font-medium text-gray-300 px-1">to</span>
              <input 
                type="date" 
                value={dateTo} 
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }} 
                className="border-0 bg-transparent py-1 text-xs font-medium text-[#1F3864] focus:outline-none" 
              />
              {(dateFrom || dateTo) && (
                <button 
                  onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}
                  className="ml-1 rounded-full bg-gray-200 p-1 text-gray-500 hover:bg-red-500 hover:text-white transition-all"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#2E75B6] px-4 py-2 sm:px-5 sm:py-2 text-[12px] sm:text-[13px] font-semibold text-white shadow-md transition-all hover:bg-[#245f96] hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={15} className="sm:w-4 sm:h-4" />}
            Excel Report
          </button>
          
          <button
            onClick={handleDownloadWhatsapp}
            disabled={downloadingWhatsapp}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#25D366] px-4 py-2 sm:px-5 sm:py-2 text-[12px] sm:text-[13px] font-semibold text-white shadow-md transition-all hover:bg-[#128C7E] hover:shadow-lg active:scale-95 disabled:opacity-50"
          >
            {downloadingWhatsapp ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={15} className="sm:w-4 sm:h-4" />}
            Campaign report
          </button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <FilterSelect label="Stage" value={stage} onChange={(v) => { setStage(v); setPage(1); }} options={["NEW", "ENQUIRED", "NOT_REACHABLE", "TEST_RIDE_SCHEDULED", "TEST_RIDE_COMPLETED", "QUOTATION_SHARED", "BOOKED", "INVOICED", "DELIVERED_CLOSED", "LOST"].map(s => ({ value: s, label: STAGE_LABELS[s] ?? s.replace(/_/g, " ") }))} />
            {!(isServiceRoute || isMetaRoute) && (
              <FilterSelect label="Channel" value={channel} onChange={(v) => { setChannel(v); setPage(1); }} options={["WALKIN", "TELE", "DIGITAL", "SOCIAL", "REFERENCE", "WEBSITE", "SERVICE"].map(c => ({ value: c, label: c }))} />
            )}
            <FilterSelect label="Source" value={sourceId} onChange={(v) => { setSourceId(v); setPage(1); }} options={(sources ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))} />
            <FilterSelect label="Model" value={modelId} onChange={(v) => { setModelId(v); setPage(1); }} options={(models ?? []).map((m: any) => ({ value: String(m.id), label: m.name }))} />
            <FilterSelect label="Assigned To" value={executiveName} onChange={(v) => { setExecutiveName(v); setPage(1); }} options={(executives ?? []).map((ex: any) => ({ value: ex.name, label: ex.name }))} />
            <FilterSelect label="Branch" value={referredFromBranch} onChange={(v) => { setReferredFromBranch(v); setPage(1); }} options={(branches ?? []).map((b: any) => ({ value: b.name, label: b.name }))} />
            {(isTeleRoute || isMetaRoute) && (
              <FilterSelect label="Hirise Status" value={hiriseStatus} onChange={(v) => { setHiriseStatus(v); setPage(1); }} options={[{ value: "ENTERED", label: "Entered" }, { value: "NOT_ENTERED", label: "Not Entered" }]} />
            )}
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
        emptyIcon={isMetaRoute ? Megaphone : isTeleRoute ? Headset : isServiceRoute ? Wrench : ClipboardList}
        emptyMessage="No leads found — try adjusting your filters"
        onRowClick={(l) => {
          const mainElement = document.getElementById("main-scroll-container");
          sessionStorage.setItem(`${pfx}-scroll`, (mainElement?.scrollTop || 0).toString());
          navigate({ to: "/leads/$id", params: { id: String(l.id) } });
        }}
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


