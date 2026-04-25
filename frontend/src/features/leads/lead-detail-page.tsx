import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatDate, formatDateTime, STAGE_COLORS } from "@/lib/hooks";
import { InterestBadge } from "@/components/interest-badge";
import { PageLoader } from "@/components/spinner";
import { FlyingModal, Timeline, Breadcrumb, Tooltip, ConfirmModal, type TimelineEvent } from "@/components/ui";
import { History, ClipboardList, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export default function LeadDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [showStageForm, setShowStageForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPipelineForm, setShowPipelineForm] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  // Only SUPER_ADMIN and MANAGER can delete (matches backend RBAC)
  const canDelete = user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "MANAGER");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", id],
    queryFn: () => api.get(`/leads/${id}`).then((r) => r.data.data),
  });

  const stageMut = useMutation({
    mutationFn: (body: any) => api.post(`/leads/${id}/stage`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", id] });
      toast.success("Stage updated");
      setShowStageForm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const followupMut = useMutation({
    mutationFn: (body: any) => api.post(`/leads/${id}/followups`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", id] });
      toast.success("Follow-up added");
      setShowFollowupForm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
      navigate({ to: "/leads" });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Delete failed"),
  });

  if (isLoading) return <PageLoader message="Loading lead details..." />;
  if (!data) return <p className="text-gray-400">Lead not found</p>;

  const lead = data;

  // Build timeline from lead data
  const timelineEvents: TimelineEvent[] = [];
  timelineEvents.push({
    id: `created-${lead.id}`,
    type: "created",
    title: "Lead Created",
    description: `${lead.customer?.firstName} ${lead.customer?.lastName ?? ""} — ${lead.channel}`,
    time: lead.createdAt,
  });
  (lead.stageHistory ?? []).forEach((h: any) => {
    timelineEvents.push({
      id: `stage-${h.id}`,
      type: "stage",
      title: `Stage: ${h.fromStage.replace(/_/g, " ")} → ${h.toStage.replace(/_/g, " ")}`,
      description: h.remark,
      time: h.changedAt,
    });
  });
  (lead.followups ?? []).forEach((f: any) => {
    const { remark } = splitFollowupRemark(f.remark);
    timelineEvents.push({
      id: `followup-${f.id}`,
      type: "followup",
      title: `Follow-up #${f.seqNo} — ${f.channel ?? "—"}`,
      description: remark ?? f.remark,
      time: f.followupDate,
      user: f.createdBy?.fullName,
    });
  });
  timelineEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        { label: "Leads", to: "/leads", icon: ClipboardList },
        { label: lead.enquiryNo },
      ]} />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/leads" className="rounded-lg p-1.5 hover:bg-gray-200">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">{lead.enquiryNo}</h1>
            <p className="text-sm text-gray-500">
              {lead.customer?.firstName} {lead.customer?.lastName ?? ""} —{" "}
              {lead.model ?? "No model"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip content="Move lead to another stage">
            <button
              onClick={() => setShowStageForm(true)}
              className="rounded-lg bg-[#2E75B6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#245f96]"
            >
              Move Stage
            </button>
          </Tooltip>
          <Tooltip content="Log a new follow-up">
            <button
              onClick={() => setShowFollowupForm(true)}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Add Follow-up
            </button>
          </Tooltip>
          <Tooltip content="View full timeline">
            <button
              onClick={() => setShowTimeline(true)}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              <History size={14} /> Timeline
            </button>
          </Tooltip>
          <Tooltip content="Edit lead details">
            <button
              onClick={() => navigate({ to: "/leads/$id/edit", params: { id: id! } })}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Edit
            </button>
          </Tooltip>
          {canDelete && (
            <Tooltip content="Delete this lead">
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-[#EB5757] hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} /> Delete
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Pipeline progress bar */}
      <PipelineProgress currentStage={lead.stage} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — Lead info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lead details card */}
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold">Lead Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Field label="Stage">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage] ?? ""}`}
                >
                  {lead.stage?.replace(/_/g, " ")}
                </span>
              </Field>
              <Field label="Interest">
                <InterestBadge level={lead.interestLevel} />
              </Field>
              <Field label="Channel">{lead.channel}</Field>
              <Field label="Source">{lead.source}</Field>
              <Field label="Enquiry Type">{lead.enquiryType}</Field>
              <Field label="Purchase Type">{lead.purchaseType ?? "—"}</Field>
              <Field label="Model">{lead.model ?? "—"}</Field>
              <Field label="Variant">{lead.variant ?? "—"}</Field>
              <Field label="Colour">{lead.colour ?? "—"}</Field>
              <Field label="Exchange">{lead.exchangeFlag ? "Yes" : "No"}</Field>
              <Field label="Test Ride">
                {lead.testRideFlag ? "Yes" : "No"}
              </Field>
              <Field label="Enquiry Date">{formatDate(lead.enquiryDate)}</Field>
              <Field label="Current Follow-up">
                {formatDateTime(lead.lastFollowupAt) || "—"}
              </Field>
              <Field label="Next Follow-up">
                {formatDateTime(lead.nextFollowupAt) || "—"}
              </Field>
              <Field label="Assigned To">
                {lead.assignedTo?.fullName ?? "Unassigned"}
              </Field>
              {lead.referredFromBranch && (
                <Field label="Referred From">{lead.referredFromBranch}</Field>
              )}
              {lead.remark && (
                <div className="col-span-2">
                  <Field label="Remark">{lead.remark}</Field>
                </div>
              )}
              {lead.closureReason && (
                <Field label="Closure Reason">{lead.closureReason}</Field>
              )}
              {lead.closedAt && (
                <Field label="Closed At">{formatDateTime(lead.closedAt)}</Field>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <FollowupsSection followups={lead.followups ?? []} />

          {/* Pipeline Documents */}
          <PipelineSection leadId={id!} />

          {/* Stage History */}
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold">Stage History</h2>
            {lead.stageHistory?.length > 0 ? (
              <div className="space-y-2">
                {lead.stageHistory.map((h: any) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-gray-400">
                      {formatDateTime(h.changedAt)}
                    </span>
                    <span className="text-gray-500">
                      {h.fromStage.replace(/_/g, " ")}
                    </span>
                    <ChevronRight size={14} className="text-gray-300" />
                    <span className="font-medium">
                      {h.toStage.replace(/_/g, " ")}
                    </span>
                    {h.remark && (
                      <span className="text-gray-400">— {h.remark}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No stage changes</p>
            )}
          </div>
        </div>

        {/* Right column — Customer info */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold">Customer</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-lg">
                {lead.customer?.firstName} {lead.customer?.lastName ?? ""}
              </p>
              <div className="flex items-center gap-2 text-gray-500">
                <Phone size={14} /> {lead.customer?.mobile}
              </div>
              {lead.customer?.email && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail size={14} /> {lead.customer.email}
                </div>
              )}
              {lead.customer?.location && (
                <div className="flex items-center gap-2 text-gray-500">
                  <MapPin size={14} /> {lead.customer.location}
                </div>
              )}
              {lead.customer?.customerType && (
                <div className="flex items-center gap-2 text-gray-500">
                  <User size={14} />{" "}
                  {lead.customer.customerType.replace(/_/g, " ")}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold">Timeline</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={14} />
                Created {formatDate(lead.createdAt)}
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={14} />
                Updated {formatDate(lead.updatedAt)}
              </div>
            </div>
          </div>

          <HiriseStatusCard dmsEnquiryNo={lead.dmsEnquiryNo} />
        </div>
      </div>

      {/* Stage modal */}
      {showStageForm && (
        <Modal onClose={() => setShowStageForm(false)} title="Move Stage">
          <StageForm
            current={lead.stage}
            onSubmit={(d) => stageMut.mutate(d)}
            loading={stageMut.isPending}
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Delete Lead?"
        message={`Lead ${lead.enquiryNo} (${lead.customer?.firstName} ${lead.customer?.lastName ?? ""}) will be hidden from lists but the record is retained for audit (soft delete). Continue?`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setShowConfirmDelete(false)}
      />

      {/* Timeline modal */}
      <FlyingModal open={showTimeline} onClose={() => setShowTimeline(false)} title={`Activity Timeline — ${lead.enquiryNo}`} maxWidth="max-w-2xl">
        <Timeline events={timelineEvents} />
      </FlyingModal>

      {/* Follow-up modal */}
      {showFollowupForm && (
        <Modal
          onClose={() => setShowFollowupForm(false)}
          title="Add Follow-up"
        >
          <FollowupForm
            onSubmit={(d) => followupMut.mutate(d)}
            loading={followupMut.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

// Presence of `dmsEnquiryNo` means this lead was imported from the Hirise Honda
// DMS export (VEHENQ* enquiry number). Absence means it was created in the CRM
// directly and has not yet been pushed into Hirise.
function HiriseStatusCard({ dmsEnquiryNo }: { dmsEnquiryNo?: string | null }) {
  const entered = Boolean(dmsEnquiryNo);
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <h2 className="mb-3 font-semibold">Hirise Honda System</h2>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${entered ? "bg-green-500" : "bg-gray-400"}`}
        />
        <span className={`text-sm font-medium ${entered ? "text-green-700" : "text-gray-500"}`}>
          {entered ? "Entered" : "Not entered"}
        </span>
      </div>
      {entered && (
        <p className="mt-2 text-xs text-gray-500">DMS Ref: {dmsEnquiryNo}</p>
      )}
    </div>
  );
}

// Follow-ups panel — admin/manager friendly view.
// Shows total count + earliest→latest date range in the heading, lists follow-ups
// chronologically (oldest first) so reviewers can read the conversation in order.
// Remark prefix like "[1-1VWMAFFS] ..." is the Hirise DMS Follow Up Id preserved
// from import; we render it as a small badge so the free-text stays clean.
function FollowupsSection({ followups }: { followups: any[] }) {
  const sorted = [...followups].sort(
    (a, b) =>
      new Date(a.followupDate).getTime() - new Date(b.followupDate).getTime()
  );
  const count = sorted.length;
  const firstDate = sorted[0]?.followupDate;
  const lastDate = sorted[count - 1]?.followupDate;
  const dateRange =
    count === 0
      ? ""
      : count === 1
        ? formatDate(firstDate)
        : `${formatDate(firstDate)} → ${formatDate(lastDate)}`;

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">
          Follow-ups{" "}
          <span className="text-sm font-medium text-gray-500">({count})</span>
        </h2>
        {dateRange && (
          <span className="text-xs font-bold text-gray-500">{dateRange}</span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-sm text-gray-400">No follow-ups yet</p>
      ) : (
        <ol className="space-y-2.5">
          {sorted.map((f: any, i: number) => {
            const { dmsId, remark } = splitFollowupRemark(f.remark);
            return (
              <li
                key={f.id}
                className="rounded-lg border border-gray-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#2E75B6] text-[10px] font-semibold text-white">
                      {i + 1}
                    </span>
                    <span className="font-bold">{formatDate(f.followupDate)}</span>
                    {f.channel && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {f.channel}
                      </span>
                    )}
                    {f.outcome && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        {f.outcome.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {dmsId && (
                    <span
                      className="truncate text-[11px] font-bold text-gray-500"
                      title={`DMS Follow Up Id: ${dmsId}`}
                    >
                      {dmsId}
                    </span>
                  )}
                </div>
                {remark && (
                  <p className="mt-1.5 text-gray-700">{remark}</p>
                )}
                <p className="mt-1.5 text-[11px] text-gray-400">
                  {f.createdBy?.fullName ? `by ${f.createdBy.fullName}` : "—"}
                  {f.nextActionAt && (
                    <>
                      {" · "}Next action {formatDateTime(f.nextActionAt)}
                    </>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// Imported follow-ups store the Hirise Follow Up Id as a `[id] remark` prefix;
// peel it off here so the UI can show the free-text remark clean and the id
// discreetly as metadata.
function splitFollowupRemark(raw: string | null | undefined): {
  dmsId: string | null;
  remark: string | null;
} {
  if (!raw) return { dmsId: null, remark: null };
  const m = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!m) return { dmsId: null, remark: raw };
  return { dmsId: m[1], remark: m[2] || null };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Modal({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STAGES = [
  "NEW", "ENQUIRED", "NOT_REACHABLE", "TEST_RIDE_SCHEDULED",
  "TEST_RIDE_COMPLETED", "QUOTATION_SHARED", "BOOKED", "INVOICED",
  "DELIVERED_CLOSED", "LOST",
];

function StageForm({
  current,
  onSubmit,
  loading,
}: {
  current: string;
  onSubmit: (d: any) => void;
  loading: boolean;
}) {
  const [stage, setStage] = useState("");
  const [remark, setRemark] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ stage, remark: remark || undefined });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">New Stage</label>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select stage...</option>
          {STAGES.filter((s) => s !== current).map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Remark</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={!stage || loading}
        className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "Updating..." : "Update Stage"}
      </button>
    </form>
  );
}

const CHANNELS = ["CALL", "SMS", "WHATSAPP", "VISIT", "EMAIL"];
const OUTCOMES = ["CONNECTED", "RNR", "BUSY", "WRONG_NO", "SWITCHED_OFF", "CALLBACK_REQUESTED"];

function FollowupForm({
  onSubmit,
  loading,
}: {
  onSubmit: (d: any) => void;
  loading: boolean;
}) {
  const [channel, setChannel] = useState("");
  const [remark, setRemark] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");

  // Build a local-time `YYYY-MM-DDTHH:mm` string for the `datetime-local` input
  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // RNR = Ring No Response. Standard behaviour is to retry next day at the same time.
  // Prefill only if the user hasn't already picked a date so manual edits are preserved.
  const handleOutcomeChange = (v: string) => {
    setOutcome(v);
    if (v === "RNR" && !nextActionAt) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNextActionAt(toLocalInputValue(tomorrow));
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          followupDate: new Date().toISOString(),
          channel: channel || undefined,
          remark: remark || undefined,
          outcome: outcome || undefined,
          // Convert local datetime (YYYY-MM-DDTHH:MM) to ISO only on submit
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Outcome</label>
          <select
            value={outcome}
            onChange={(e) => handleOutcomeChange(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Remark</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Next Follow-up
        </label>
        <input
          type="datetime-local"
          value={nextActionAt}
          onChange={(e) => setNextActionAt(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Add Follow-up"}
      </button>
    </form>
  );
}

// ─── Pipeline Section ───────────────────────────────────────────

// ─── Pipeline Progress Bar ──────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "NEW", label: "New", color: "#6C757D" },
  { key: "ENQUIRED", label: "Enquired", color: "#2D9CDB" },
  { key: "TEST_RIDE_SCHEDULED", label: "Test Ride", color: "#9B59B6" },
  { key: "QUOTATION_SHARED", label: "Quotation", color: "#F2994A" },
  { key: "BOOKED", label: "Booked", color: "#E8792F" },
  { key: "INVOICED", label: "Invoiced", color: "#27AE60" },
  { key: "DELIVERED_CLOSED", label: "Delivered", color: "#1F3864" },
];

function PipelineProgress({ currentStage }: { currentStage: string }) {
  if (currentStage === "LOST") {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 ring-1 ring-red-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EB5757] text-xs font-bold text-white">
          X
        </div>
        <div>
          <p className="text-sm font-semibold text-[#EB5757]">Lead Lost</p>
          <p className="text-[11px] text-gray-500">This lead has been closed as lost</p>
        </div>
      </div>
    );
  }

  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  // Handle NOT_REACHABLE and TEST_RIDE_COMPLETED as aliases
  const effectiveIdx =
    currentStage === "NOT_REACHABLE" ? 1 :
    currentStage === "TEST_RIDE_COMPLETED" ? 3 :
    currentIdx;

  return (
    <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center">
        {PIPELINE_STAGES.map((stage, i) => {
          const isCompleted = i <= effectiveIdx;
          const isCurrent = i === effectiveIdx;
          return (
            <div key={stage.key} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    isCurrent
                      ? "text-white shadow-md ring-4 ring-opacity-20"
                      : isCompleted
                        ? "text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                  style={{
                    backgroundColor: isCompleted ? stage.color : undefined,
                  }}
                >
                  {isCompleted && !isCurrent ? "✓" : i + 1}
                </div>
                <p
                  className={`mt-1.5 text-[10px] font-medium ${isCurrent ? "font-semibold" : isCompleted ? "text-gray-600" : "text-gray-400"}`}
                  style={{ color: isCurrent ? stage.color : undefined }}
                >
                  {stage.label}
                </p>
              </div>
              {/* Connector line */}
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="mx-1 h-[2px] flex-1 rounded" style={{ backgroundColor: i < effectiveIdx ? stage.color : "#E5E7EB" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pipeline Documents Section ─────────────────────────────────

function PipelineSection({ leadId }: { leadId: string }) {
  const qc = useQueryClient();

  const { data: quotations } = useQuery({
    queryKey: ["leads", leadId, "quotations"],
    queryFn: () => api.get(`/leads/${leadId}/quotations`).then((r) => r.data.data),
  });
  const { data: bookings } = useQuery({
    queryKey: ["leads", leadId, "bookings"],
    queryFn: () => api.get(`/leads/${leadId}/bookings`).then((r) => r.data.data),
  });
  const { data: invoices } = useQuery({
    queryKey: ["leads", leadId, "invoices"],
    queryFn: () => api.get(`/leads/${leadId}/invoices`).then((r) => r.data.data),
  });
  const { data: deliveries } = useQuery({
    queryKey: ["leads", leadId, "deliveries"],
    queryFn: () => api.get(`/leads/${leadId}/deliveries`).then((r) => r.data.data),
  });

  const hasAny =
    (quotations?.length ?? 0) + (bookings?.length ?? 0) +
    (invoices?.length ?? 0) + (deliveries?.length ?? 0) > 0;

  if (!hasAny) return null;

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <h2 className="mb-4 font-semibold">Pipeline Documents</h2>
      <div className="space-y-3 text-sm">
        {quotations?.map((q: any) => (
          <div key={q.id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-3">
            <div>
              <span className="font-medium text-blue-700">{q.quotationNo}</span>
              <span className="ml-2 text-gray-500">Net: {Number(q.netAmount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</span>
            </div>
            <span className="text-xs text-gray-400">Valid till {formatDate(q.validTill)}</span>
          </div>
        ))}
        {bookings?.map((b: any) => (
          <div key={b.id} className="flex items-center justify-between rounded-lg border border-orange-100 bg-orange-50 p-3">
            <div>
              <span className="font-medium text-orange-700">{b.bookingNo}</span>
              <span className="ml-2 text-gray-500">Amount: {Number(b.bookingAmount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(b.bookingDate)}</span>
          </div>
        ))}
        {invoices?.map((i: any) => (
          <div key={i.id} className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-3">
            <div>
              <span className="font-medium text-green-700">{i.invoiceNo}</span>
              <span className="ml-2 text-gray-500">Total: {Number(i.totalAmount).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</span>
            </div>
            <span className="text-xs text-gray-400">{formatDate(i.invoiceDate)}</span>
          </div>
        ))}
        {deliveries?.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div>
              <span className="font-medium text-emerald-700">Delivery</span>
              {d.remark && <span className="ml-2 text-gray-500">{d.remark}</span>}
            </div>
            <span className="text-xs text-gray-400">{formatDate(d.deliveryDate)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


