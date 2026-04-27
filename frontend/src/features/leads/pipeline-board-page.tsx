import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Kanban } from "lucide-react";
import api from "@/lib/api";
import { InterestBadge } from "@/components/interest-badge";
import { Breadcrumb } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { formatDate } from "@/lib/hooks";

const COLUMNS = [
  { stage: "NOT_CONTACTED", label: "Not Contacted", color: "#6C757D" },
  { stage: "CONTACTED", label: "Contacted", color: "#2D9CDB" },
  { stage: "NOT_REACHABLE", label: "Not Reachable", color: "#F59E0B" },
  { stage: "TEST_RIDE_SCHEDULED", label: "Test Ride Scheduled", color: "#9B59B6" },
  { stage: "TEST_RIDE_COMPLETED", label: "Test Ride Done", color: "#7D3C98" },
  { stage: "QUOTATION_SHARED", label: "Quotation Shared", color: "#F2994A" },
  { stage: "BOOKED", label: "Booked", color: "#E8792F" },
  { stage: "INVOICED", label: "Invoiced", color: "#27AE60" },
  { stage: "DELIVERED_CLOSED", label: "Delivered", color: "#059669" },
  { stage: "LOST", label: "Lost", color: "#EB5757" },
];

const CARDS_PER_COLUMN = 50; // only render first 50 cards per column for perf

export default function PipelineBoardPage() {
  const navigate = useNavigate();

  // 1. Fetch the list of active stages from the database
  const stagesQuery = useQueries({
    queries: [
      {
        queryKey: ["lookups", "active-stages"],
        queryFn: () => api.get("/lookups/active-stages").then((r) => r.data.data),
      },
    ],
  })[0];

  const activeStages = stagesQuery.data || [];

  // 2. Merge hardcoded columns with dynamic ones
  const columns = useMemo(() => {
    const base = [...COLUMNS];
    const baseKeys = new Set(base.map((c) => c.stage));

    // Add any stage found in the database that isn't in our hardcoded list
    activeStages.forEach((s: any) => {
      if (!baseKeys.has(s.stage)) {
        base.push({
          stage: s.stage,
          label: s.label,
          color: "#94A3B8", // default gray for dynamic stages
        });
      }
    });

    return base;
  }, [activeStages]);

  // 3. Fetch leads for each resulting column
  const queries = useQueries({
    queries: columns.map((col) => ({
      queryKey: ["leads", "pipeline", col.stage],
      queryFn: () =>
        api
          .get("/leads", {
            params: { stage: col.stage, pageSize: CARDS_PER_COLUMN },
          })
          .then((r) => r.data),
      staleTime: 30_000,
      enabled: !!activeStages, // wait for stages to load
    })),
  });

  const isLoading = stagesQuery.isLoading || queries.some((q) => q.isLoading);
  if (isLoading) return <PageLoader message="Loading pipeline..." />;

  const totalLeads = queries.reduce((sum, q) => sum + (q.data?.meta?.total ?? 0), 0);

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Pipeline", icon: Kanban }]} />

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Pipeline Board</h1>
          <p className="text-[12px] text-gray-400">
            {totalLeads} leads across {columns.length} stages
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {columns.map((col, i) => {
          const q = queries[i];
          const leads = q.data?.data ?? [];
          const total = q.data?.meta?.total ?? 0;

          return (
            <div
              key={col.stage}
              className="flex w-[280px] shrink-0 flex-col rounded-xl p-3 shadow-sm"
              style={{ backgroundColor: "#F0F2F5" }}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-[13px] font-semibold text-gray-700">{col.label}</span>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                  style={{ backgroundColor: col.color }}
                >
                  {total}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    onClick={() =>
                      navigate({ to: "/leads/$id", params: { id: String(lead.id) } })
                    }
                    className={`cursor-pointer rounded-lg bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${col.stage === "LOST" ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1F3864] truncate">
                        {lead.customer?.firstName} {lead.customer?.lastName ?? ""}
                      </p>
                      {lead.interestLevel && <InterestBadge level={lead.interestLevel} size="sm" />}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">{lead.customer?.mobile}</p>
                    {lead.model && (
                      <p className="mt-1 text-[12px] font-medium text-gray-600">{lead.model}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {lead.lastFollowupAt && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400">Current F/Up:</span>
                          <span className="font-semibold text-gray-600">{formatDate(lead.lastFollowupAt)}</span>
                        </div>
                      )}
                      {lead.nextFollowupAt && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400">Next F/Up:</span>
                          <span className="font-semibold text-[#2E75B6]">{formatDate(lead.nextFollowupAt)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {lead.assignedTo || lead.executiveName ? (
                          <>
                            <div
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{ backgroundColor: lead.assignedTo ? "#2E75B6" : "#64748B" }}
                            >
                              {(lead.assignedTo?.fullName ?? lead.executiveName)?.[0] ?? "?"}
                            </div>
                            <span className="truncate text-[11px] font-medium text-gray-600">
                              {lead.assignedTo?.fullName ?? lead.executiveName}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-gray-300 italic">Unassigned</span>
                        )}
                      </div>
                      <span className="ml-2 shrink-0 text-[10px] text-gray-400 font-mono">{lead.enquiryNo}</span>
                    </div>
                  </div>
                ))}

                {total === 0 && (
                  <p className="py-8 text-center text-[12px] text-gray-400">No leads</p>
                )}

                {total > leads.length && (
                  <button
                    onClick={() =>
                      navigate({
                        to: "/leads",
                        search: { stage: col.stage },
                      } as any)
                    }
                    className="w-full rounded-md border border-gray-300 bg-white py-2 text-[11px] font-medium text-gray-500 hover:bg-gray-50 hover:text-[#2E75B6]"
                  >
                    + {total - leads.length} more — view all
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


