import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
import { formatDate, formatDateTime, formatDateTimeShort, STAGE_COLORS, STAGE_LABELS, useLookup, useUsers } from "@/lib/hooks";
import { InterestBadge } from "@/components/interest-badge";
import { PageLoader } from "@/components/spinner";
import { FlyingModal, Timeline, Breadcrumb, Tooltip, ConfirmModal, type TimelineEvent } from "@/components/ui";
import { History, ClipboardList, Trash2, CheckCircle2, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export default function LeadDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [showStageForm, setShowStageForm] = useState(false);
  const [showTeleFollowupForm, setShowTeleFollowupForm] = useState(false);
  const [showCallStatusForm, setShowCallStatusForm] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPipelineForm, setShowPipelineForm] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  // Roles allowed to assign/delete
  const canAssign = user?.roles?.some((r) => ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(r));
  const canDelete = user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "MANAGER");

  const [showAssignForm, setShowAssignForm] = useState(false);

  const { data: metaStatuses } = useLookup("meta-statuses");
  const { data, isLoading } = useQuery({
    queryKey: ["leads", id],
    queryFn: () => api.get(`/leads/${id}`).then((r) => r.data.data),
  });

  const stageMut = useMutation({
    mutationFn: (body: any) => api.post(`/leads/${id}/stage`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Stage updated");
      setShowStageForm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const followupMut = useMutation({
    mutationFn: (body: any) => api.post(`/leads/${id}/followups`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
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
      navigate({ to: "/leads", search: { tab: "all" } });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Delete failed"),
  });

  const assignMut = useMutation({
    mutationFn: (body: { assignedTo: number }) => api.post(`/leads/${id}/assign`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead assigned successfully");
      setShowAssignForm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Assignment failed"),
  });

  const teleMut = useMutation({
    mutationFn: (body: any) => api.patch(`/leads/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Tele follow-up saved");
      setShowTeleFollowupForm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Failed to save tele follow-up"),
  });

  const callStatusMut = useMutation({
    mutationFn: (body: any) => api.patch(`/leads/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Call status updated");
      setShowCallStatusForm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Failed to update call status"),
  });

  const handleDeleteTeleRemark = async (indexToDelete: number) => {
    if (!window.confirm("Are you sure you want to delete this follow-up?")) return;
    
    const lines = lead.telecallerRemark.split('\n').filter((line: string) => line.trim() !== '');
    lines.splice(indexToDelete, 1);
    const newRemark = lines.join('\n');
    
    try {
      await api.patch(`/leads/${id}`, { telecallerRemark: newRemark || null });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Follow-up deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || "Failed to delete follow-up");
    }
  };

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
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        (lead.channel?.name ?? lead.channel) === "SOCIAL"
          ? { label: "Meta Leads", to: "/meta-leads", icon: ClipboardList }
          : (lead.channel?.name ?? lead.channel) === "TELE"
            ? { label: "Tele Leads", to: "/tele-leads", icon: ClipboardList }
            : { label: "Leads", to: "/leads", icon: ClipboardList },
        { label: lead.enquiryNo },
      ]} />
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                window.history.back();
              } else {
                const channelName = lead.channel?.name ?? lead.channel;
                const isMeta = channelName === "SOCIAL";
                const isTele = channelName === "TELE";
                if (isMeta) {
                  navigate({ to: "/meta-leads", search: {} as any });
                } else if (isTele) {
                  navigate({ to: "/tele-leads", search: {} as any });
                } else {
                  navigate({ to: "/leads", search: {} as any });
                }
              }
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <ArrowLeft size={16} /> 
            <span>Back</span>
          </button>
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
          <Tooltip content="Log a tele follow-up">
            <button
              onClick={() => setShowTeleFollowupForm(true)}
              className="rounded-lg bg-[#2E75B6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#245f96]"
            >
              Tele Follow-up
            </button>
          </Tooltip>
          {["SOCIAL", "TELE"].includes(lead.channel?.name ?? lead.channel) && (
            <Tooltip content="Update call status">
              <button
                onClick={() => setShowCallStatusForm(true)}
                className="rounded-lg bg-[#2E75B6] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#245f96]"
              >
                Call Status
              </button>
            </Tooltip>
          )}
          {/* 
          <Tooltip content="Log a new follow-up">
            <button
              onClick={() => setShowFollowupForm(true)}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Add Follow-up
            </button>
          </Tooltip>
          */}
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
      <PipelineProgress lead={lead} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column — Lead info */}
        <div className="space-y-6">
          {/* Lead details card */}
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold">Lead Details</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <Field label="Stage">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage] ?? ""}`}
                >
                  {STAGE_LABELS[lead.stage] ?? lead.stage?.replace(/_/g, " ")}
                </span>
              </Field>
              {lead.stage === "LOST" && (
                <Field label="Closure Reason">
                  {lead.closureReason?.name || lead.remark || "—"}
                </Field>
              )}
              {lead.channel === "SERVICE" ? (
                <>
                  <Field label="Service Type">{lead.typeOfService?.name ?? lead.typeOfService ?? "—"}</Field>
                  <Field label="Expected Date">{formatDate(lead.expectedServiceDate)}</Field>
                  <Field label="Pick-up & Drop">{lead.pickupDropFlag ? "Yes" : "No"}</Field>
                </>
              ) : (
                <>
                  <Field label="Interest">
                    <InterestBadge level={lead.interestLevel} />
                  </Field>
                  <Field label="Purchase Type">{lead.purchaseType?.name ?? lead.purchaseType ?? "—"}</Field>
                  <Field label="Exchange">{lead.exchangeFlag ? "Yes" : "No"}</Field>
                  <Field label="Test Ride">
                    {lead.testRideFlag ? "Yes" : "No"}
                  </Field>
                </>
              )}
              <Field label="Channel">{lead.channel?.name ?? lead.channel}</Field>
              <Field label="Source">{lead.source?.name ?? lead.source}</Field>
              <Field label="Enquiry Type">{lead.enquiryType?.name ?? lead.enquiryType}</Field>

              <Field label="Model">{lead.model?.name ?? lead.model ?? "—"}</Field>
              <Field label="Variant">{lead.variant?.name ?? lead.variant ?? "—"}</Field>
              <Field label="Colour">{lead.colour?.name ?? lead.colour ?? "—"}</Field>
              <Field label="Branch">{lead.referredFromBranch?.name ?? lead.referredFromBranch ?? "—"}</Field>

              <Field label="Enquiry Created Date">{formatDate(lead.enquiryDate)}</Field>
              {(!Boolean(lead.dmsEnquiryNo || lead.linkedDmsEnquiryNo) || (lead.channel?.name || lead.channel) === "TELE") && (
                <Field label="CRM Created Date & Time">{formatDateTime(lead.createdAt)}</Field>
              )}
              <Field label="Current Follow-up">
                {formatDateTime(lead.lastFollowupAt) || "—"}
              </Field>
              <Field label="Next Follow-up">
                <div className="flex items-center gap-2">
                  <span>{formatDateTime(lead.nextFollowupAt) || "—"}</span>
                  {lead.nextFollowupAt && lead.followups?.length < 5 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2E75B6]" title="Follow-up Sequence">
                      F{lead.followups.length + 1}
                    </span>
                  )}
                  {lead.followups?.length >= 5 && lead.stage !== "LOST" && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#2E75B6]">
                      More than F5
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Assigned To">
                <div className="flex items-center gap-2">
                  <span className={!lead.assignedTo && !lead.executiveName ? "font-semibold text-red-600" : "font-medium text-gray-700"}>
                    {lead.assignedTo?.fullName ?? lead.executiveName ?? "Unassigned"}
                  </span>
                  {canAssign && !lead.assignedTo && !lead.executiveName && (
                    <button
                      onClick={() => setShowAssignForm(true)}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-[#2E75B6] hover:bg-gray-200"
                    >
                      Assign Executive
                    </button>
                  )}
                </div>
              </Field>
              {lead.metaStatus && (() => {
                const statusConfig = (metaStatuses ?? []).find((s: any) => s.name === lead.metaStatus);
                const color = statusConfig?.color || "#4F46E5";
                let reminderTime = "";
                if (lead.nextFollowupAt) {
                  reminderTime = formatDateTimeShort(lead.nextFollowupAt);
                }
                return (
                  <Field label="Call Status">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-bold shadow-sm uppercase tracking-wider"
                      style={{
                        color: color,
                        backgroundColor: `${color}1A`,
                        borderColor: `${color}40`,
                        borderWidth: '1px'
                      }}
                    >
                      <span>{lead.metaStatus}</span>
                      {reminderTime && (
                        <span className="opacity-70 text-[10px] tracking-normal border-l pl-1.5 ml-0.5" style={{ borderColor: 'inherit' }}>
                          {reminderTime}
                        </span>
                      )}
                    </span>
                  </Field>
                );
              })()}

              {(() => {
                const manualRemark = (lead.remark || "")
                  .split("\n")
                  .filter((line: string) => !line.trim().startsWith("Generated from Facebook Lead Ads") && !line.trim().startsWith("Historical Meta Lead ID"))
                  .join("\n")
                  .trim();
                
                if (!manualRemark) return null;
                return (
                  <div className="col-span-2">
                    <Field label="Remark">{manualRemark}</Field>
                  </div>
                );
              })()}

              {lead.closureReason && (
                <Field label="Closure Reason">{lead.closureReason?.name ?? lead.closureReason}</Field>
              )}
              {lead.closedAt && (
                <Field label="Closed At">{formatDateTime(lead.closedAt)}</Field>
              )}
            </div>
          </div>
          {/* Telecaller Remark Card */}
          {lead.telecallerRemark && (
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 ring-1 ring-blue-100">
              <div className="flex items-center gap-2 mb-3">
                 <Phone size={16} className="text-blue-600" />
                 <h2 className="font-semibold text-blue-900">Telecaller Follow-up</h2>
              </div>
              <div className="space-y-3">
                 {lead.telecallerRemark && (
                    <div className="space-y-2">
                       {lead.telecallerRemark.split('\n').filter((line: string) => line.trim() !== '').map((line: string, i: number) => {
                           const match = line.match(/^\[(.*?)\]\s*(.*)$/);
                           const timestamp = match ? match[1] : null;
                           const text = match ? match[2] : line;

                           return (
                             <div key={i} className="bg-white/80 rounded-lg p-3 border border-blue-100/50 text-sm text-gray-800 flex flex-col gap-1">
                                <div className="flex items-center justify-between w-full">
                                   <div className="flex items-center gap-2">
                                      <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-full bg-[#2E75B6] text-[10px] font-semibold text-white">
                                         F{i + 1}
                                      </span>
                                      <span className="text-[10px] font-bold text-gray-500">{timestamp || formatDateTime(lead.updatedAt)}</span>
                                   </div>
                                   <button 
                                     onClick={() => handleDeleteTeleRemark(i)}
                                     title="Delete this remark"
                                     className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                   >
                                     <Trash2 size={12} />
                                   </button>
                                </div>
                                <div className="whitespace-pre-wrap mt-1">{text}</div>
                             </div>
                           );
                       })}
                    </div>
                 )}
              </div>
            </div>
          )}

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
              {(!Boolean(lead.dmsEnquiryNo || lead.linkedDmsEnquiryNo) || (lead.channel?.name || lead.channel) === "TELE") && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={14} />
                  CRM Entered {formatDate(lead.createdAt)}
                </div>
              )}
              {lead.createdAt !== lead.updatedAt && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={14} />
                  CRM Updated {formatDate(lead.updatedAt)}
                </div>
              )}
            </div>
          </div>

          <HiriseStatusCard 
            dmsEnquiryNo={lead.dmsEnquiryNo} 
            linkedDmsEnquiryNo={lead.linkedDmsEnquiryNo} 
            enquiryType={lead.enquiryType?.name ?? lead.enquiryType}
            enquiryDate={lead.enquiryDate}
            channel={lead.channel?.name ?? lead.channel}
          />

          {/* Follow-ups */}
          <FollowupsSection 
            followups={lead.followups ?? []} 
            assignedName={lead.assignedTo?.fullName ?? lead.executiveName} 
          />
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
            followupCount={lead.followups?.length ?? 0}
          />
        </Modal>
      )}

      {/* Tele Follow-up modal */}
      {showTeleFollowupForm && (
        <Modal
          onClose={() => setShowTeleFollowupForm(false)}
          title="Tele Follow-up"
        >
          <TeleFollowupForm
            currentRemark={lead.telecallerRemark}
            currentStatus={lead.metaStatus}
            currentNextFollowup={lead.nextFollowupAt}
            isSocial={["SOCIAL", "TELE"].includes(lead.channel?.name ?? lead.channel)}
            onSubmit={(d) => teleMut.mutate(d)}
            loading={teleMut.isPending}
          />
        </Modal>
      )}

      {/* Call Status modal */}
      {showCallStatusForm && (
        <Modal
          onClose={() => setShowCallStatusForm(false)}
          title="Call Status"
        >
          <CallStatusForm
            currentStatus={lead.metaStatus}
            currentNextFollowup={lead.nextFollowupAt}
            onSubmit={(d) => callStatusMut.mutate(d)}
            loading={callStatusMut.isPending}
          />
        </Modal>
      )}

      {/* Assignment modal */}
      {showAssignForm && (
        <Modal
          onClose={() => setShowAssignForm(false)}
          title="Assign Executive"
        >
          <AssignForm
            currentName={lead.executiveName || lead.assignedTo?.fullName}
            onSubmit={(d) => assignMut.mutate(d as any)}
            loading={assignMut.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

function AssignForm({
  currentName,
  onSubmit,
  loading,
}: {
  currentName?: string;
  onSubmit: (d: { assignedTo: string | number }) => void;
  loading: boolean;
}) {
  const { data: executives, isLoading } = useLookup("sales-executives");
  const [selectedValue, setSelectedValue] = useState<string>(currentName ?? "");

  if (isLoading) return <div className="py-4 text-center text-sm text-gray-500">Loading executives...</div>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (selectedValue) onSubmit({ assignedTo: selectedValue });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Select Executive</label>
        <select
          value={selectedValue}
          onChange={(e) => setSelectedValue(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
        >
          <option value="">Select executive...</option>
          {(executives ?? []).map((ex: any) => (
            <option key={ex.id} value={ex.name}>
              {ex.name} {ex.mobile ? `(${ex.mobile})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="submit"
          disabled={!selectedValue || loading || selectedValue === currentName}
          className="w-full rounded-lg bg-[#2E75B6] py-2 text-sm font-semibold text-white shadow-md hover:bg-[#245f96] disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Confirm Assignment"}
        </button>
      </div>
    </form>
  );
}

// Presence of `dmsEnquiryNo` means this lead was imported from the Hirise Honda
// DMS export (VEHENQ* enquiry number). Absence means it was created in the CRM
// directly and has not yet been pushed into Hirise.
function HiriseStatusCard({ 
  dmsEnquiryNo, 
  linkedDmsEnquiryNo, 
  enquiryType,
  enquiryDate,
  channel
}: { 
  dmsEnquiryNo?: string | null; 
  linkedDmsEnquiryNo?: string | null; 
  enquiryType?: string | null;
  enquiryDate?: string | null;
  channel?: string | null;
}) {
  const entered = Boolean(dmsEnquiryNo || linkedDmsEnquiryNo);
  const refNo = dmsEnquiryNo || linkedDmsEnquiryNo;
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
      <h2 className="mb-3 font-semibold">Hirise Honda System</h2>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${entered ? "bg-green-500" : "bg-gray-400"}`}
          />
          <span className={`text-sm font-medium ${entered ? "text-green-700" : "text-gray-500"}`}>
            {entered ? "Entered" : "Not entered"}
          </span>
        </div>
        {entered && channel !== "TELE" && (
          <span className="text-[10px] font-semibold text-gray-400 tracking-wide">
            Directly from Hi-Rise Excel
          </span>
        )}
      </div>
      {entered && (
        <div className="mt-4 space-y-3">
          {enquiryDate && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Hi-Rise Date & Time</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(enquiryDate)}</p>
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">DMS Ref</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{refNo}</p>
          </div>
          {enquiryType && (
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Enquiry Type</p>
              <span className="inline-flex mt-0.5 items-center rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 shadow-sm">
                {enquiryType}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Follow-ups panel — admin/manager friendly view.
// Shows total count + earliest→latest date range in the heading, lists follow-ups
// chronologically (oldest first) so reviewers can read the conversation in order.
// Remark prefix like "[1-1VWMAFFS] ..." is the Hirise DMS Follow Up Id preserved
// from import; we render it as a small badge so the free-text stays clean.
function FollowupsSection({
  followups,
  assignedName,
}: {
  followups: any[];
  assignedName?: string | null;
}) {
  const sorted = [...followups].sort((a, b) => {
    const diff = new Date(a.followupDate).getTime() - new Date(b.followupDate).getTime();
    if (diff !== 0) return diff;
    return (a.seqNo ?? 0) - (b.seqNo ?? 0);
  });
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
                    <span className="inline-flex h-5 px-1.5 items-center justify-center rounded-full bg-[#2E75B6] text-[10px] font-semibold text-white">
                      F{i + 1}
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
                  {`by ${assignedName ?? f.createdBy?.fullName ?? "—"}`}
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

      {/* Legend / Policy */}
      <div className="mt-8 border-t border-dashed pt-6">
        <p className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-600">Follow-up Policy (Gaps)</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-sm">
          <div className="rounded-xl bg-gray-50 p-2 sm:p-3 text-center shadow-sm" title="Follow-up 1: Next Day">
            <span className="font-bold text-[#2E75B6]">F1</span><br/><span className="text-gray-500">1d</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2 sm:p-3 text-center shadow-sm" title="Follow-up 2: 3 Days Later">
            <span className="font-bold text-[#2E75B6]">F2</span><br/><span className="text-gray-500">3d</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2 sm:p-3 text-center shadow-sm" title="Follow-up 3: 7 Days Later">
            <span className="font-bold text-[#2E75B6]">F3</span><br/><span className="text-gray-500">7d</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2 sm:p-3 text-center shadow-sm" title="Follow-up 4: 15 Days Later">
            <span className="font-bold text-[#2E75B6]">F4</span><br/><span className="text-gray-500">15d</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2 sm:p-3 text-center shadow-sm" title="Follow-up 5: 30 Days Later">
            <span className="font-bold text-[#2E75B6]">F5</span><br/><span className="text-gray-500">30d</span>
          </div>
          <div className="rounded-xl bg-gray-50 p-2 sm:p-3 text-center shadow-sm" title="Beyond F5">
            <span className="font-bold text-[#2E75B6]">More</span><br/><span className="text-gray-500 text-[10px]">than F5</span>
          </div>
        </div>
      </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STAGES = [
  "NEW", "ENQUIRED", "TEST_RIDE_SCHEDULED",
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
          {STAGES.filter(s => s !== current).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s] ?? s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Remark {stage === "LOST" && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          required={stage === "LOST"}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
        />
      </div>
      <button
        type="submit"
        disabled={!stage || loading}
        className="w-full rounded-lg bg-[#2E75B6] py-2 text-sm font-medium text-white hover:bg-[#245f96] disabled:opacity-50"
      >
        {loading ? "Updating..." : "Update Stage"}
      </button>
    </form>
  );
}


function FollowupForm({
  onSubmit,
  loading,
  followupCount = 0,
}: {
  onSubmit: (d: any) => void;
  loading: boolean;
  followupCount?: number;
}) {
  const [remark, setRemark] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");

  const nextSeq = followupCount + 1;

  // Build a local-time `YYYY-MM-DDTHH:mm` string for the `datetime-local` input
  const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Apply F1-F5 logic on mount
  useEffect(() => {
    const nextDate = new Date();
    let days = 0;
    if (nextSeq === 1) days = 1;
    else if (nextSeq === 2) days = 3;
    else if (nextSeq === 3) days = 7;
    else if (nextSeq === 4) days = 15;
    else if (nextSeq === 5) days = 30;

    if (days > 0) {
      nextDate.setDate(nextDate.getDate() + days);
      setNextActionAt(toLocalInputValue(nextDate));
    }
  }, [nextSeq]);



  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          followupDate: new Date().toISOString(),
          remark: remark || undefined,
          // Convert local datetime (YYYY-MM-DDTHH:MM) to ISO only on submit
          nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="rounded-lg bg-blue-50 p-2.5 text-[11px] text-[#2E75B6]">
        <p className="font-bold uppercase tracking-wider">
          {nextSeq <= 5 ? `Next Follow-up: F${nextSeq} Logic` : "Follow-up limit reached"}
        </p>
        <p className="mt-0.5 opacity-80">
          {nextSeq === 1 && "F1: Next day follow-up (+1 day)"}
          {nextSeq === 2 && "F2: 3 days follow-up (+3 days)"}
          {nextSeq === 3 && "F3: 7 days follow-up (+7 days)"}
          {nextSeq === 4 && "F4: 15 days follow-up (+15 days)"}
          {nextSeq === 5 && "F5: 30 days follow-up (+30 days)"}
          {/* {nextSeq > 5 && "After F5: Please manually move the lead to 'Lost / Long Term Follow-up' if required."} */}
        </p>
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
        className="w-full rounded-lg bg-[#2E75B6] py-2 text-sm font-medium text-white hover:bg-[#245f96] disabled:opacity-50"
      >
        {loading ? "Saving..." : "Add Follow-up"}
      </button>
    </form>
  );
}

function TeleFollowupForm({
  currentRemark,
  currentStatus,
  currentNextFollowup,
  isSocial,
  onSubmit,
  loading,
}: {
  currentRemark?: string;
  currentStatus?: string;
  currentNextFollowup?: string;
  isSocial: boolean;
  onSubmit: (d: any) => void;
  loading: boolean;
}) {
  const [newRemark, setNewRemark] = useState("");
  const [status, setStatus] = useState(currentStatus || "");
  const [nextActionAt, setNextActionAt] = useState(() => {
    let d = new Date();
    if (currentNextFollowup) {
      try {
        d = new Date(currentNextFollowup);
      } catch (e) {
        d = new Date();
      }
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const { data: metaStatuses } = useLookup("meta-statuses");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let finalRemark = currentRemark || "";
        if (newRemark.trim()) {
           const timestamp = formatDateTime(new Date().toISOString());
           const entry = `[${timestamp}] ${newRemark.trim()}`;
           finalRemark = finalRemark ? `${finalRemark}\n${entry}` : entry;
        }
        onSubmit({
          telecallerRemark: finalRemark || undefined,
          metaStatus: status || undefined,
          nextFollowupAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
        });
      }}
      className="space-y-4"
    >

      <div>
        <label className="mb-1 block text-sm font-medium">New Telecaller Remark</label>
        <textarea
          value={newRemark}
          onChange={(e) => setNewRemark(e.target.value)}
          rows={3}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
          placeholder="Type your new follow-up remark here..."
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Next Follow-up</label>
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
        className="w-full rounded-lg bg-[#2E75B6] py-2 text-sm font-medium text-white hover:bg-[#245f96] disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Tele Follow-up"}
      </button>
    </form>
  );
}

function CallStatusForm({
  currentStatus,
  currentNextFollowup,
  onSubmit,
  loading,
}: {
  currentStatus?: string;
  currentNextFollowup?: string;
  onSubmit: (d: any) => void;
  loading: boolean;
}) {
  const [status, setStatus] = useState(currentStatus || "");
  const [nextActionAt, setNextActionAt] = useState(() => {
    if (!currentNextFollowup) return "";
    let d = new Date();
    try {
      d = new Date(currentNextFollowup);
    } catch (e) {
      d = new Date();
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const { data: metaStatuses } = useLookup("meta-statuses");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          metaStatus: status || undefined,
          nextFollowupAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Call Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          className="w-full rounded-lg border px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
        >
          <option value="">Select status...</option>
          {(metaStatuses ?? []).map((s: any) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Reminder Time</label>
        <input
          type="datetime-local"
          value={nextActionAt}
          onChange={(e) => setNextActionAt(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#2E75B6] py-2 text-sm font-medium text-white hover:bg-[#245f96] disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Call Status"}
      </button>
    </form>
  );
}

// ─── Pipeline Section ───────────────────────────────────────────

// ─── Pipeline Progress Bar ──────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "NEW", label: "New", color: "#6C757D" },
  { key: "ENQUIRED", label: "Enquiry", color: "#2D9CDB" },
  { key: "TEST_RIDE_SCHEDULED", label: "Test Ride", color: "#9B59B6" },
  { key: "QUOTATION_SHARED", label: "Quotation", color: "#F2994A" },
  { key: "BOOKED", label: "Booked", color: "#E8792F" },
  { key: "INVOICED", label: "Invoiced", color: "#27AE60" },
  { key: "DELIVERED_CLOSED", label: "Delivered", color: "#1F3864" },
];

function PipelineProgress({ lead }: { lead: any }) {
  const currentStage = lead.stage;
  const isLost = currentStage === "LOST";

  // If lost, determine the last active stage before it was marked as lost
  let activeStage = currentStage;
  if (isLost) {
    const history = lead.stageHistory || [];
    const sorted = [...history].sort((a: any, b: any) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
    const lastActive = sorted.filter((h: any) => h.toStage !== "LOST").pop();
    activeStage = lastActive ? lastActive.toStage : (sorted.length > 0 ? sorted[0].fromStage : "NEW");
    if (activeStage === "LOST") activeStage = "NEW";
  }

  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === activeStage);
  const effectiveIdx =
    activeStage === "NOT_REACHABLE" ? 1 :
    activeStage === "TEST_RIDE_COMPLETED" ? 2 :
    (activeStage.toUpperCase() === "QUOTATION SHARED" || activeStage.toUpperCase() === "QUOTATION_SHARED") ? 3 :
    currentIdx;

  const stagesToRender = isLost
    ? [...PIPELINE_STAGES.slice(0, effectiveIdx + 1), { key: "LOST", label: "Lost", color: "#EB5757" }]
    : PIPELINE_STAGES;

  return (
    <div className="mb-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 overflow-x-auto">
      <div className="flex items-center min-w-[600px]">
        {stagesToRender.map((stage, i) => {
          const isLostNode = stage.key === "LOST";
          const isCompleted = !isLostNode && i <= effectiveIdx;
          const isCurrent = isLostNode ? true : i === effectiveIdx;
          
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
                    backgroundColor: isCompleted || isCurrent ? stage.color : undefined,
                  }}
                >
                  {isCompleted && !isCurrent ? "✓" : isLostNode ? "X" : i + 1}
                </div>
                <p
                  className={`mt-1.5 text-[10px] font-medium ${isCurrent ? "font-semibold" : isCompleted ? "text-gray-600" : "text-gray-400"}`}
                  style={{ color: isCurrent ? stage.color : undefined }}
                >
                  {stage.label}
                </p>
              </div>
              {/* Connector line */}
              {i < stagesToRender.length - 1 && (
                <div className="mx-1 h-[2px] flex-1 rounded" style={{ backgroundColor: (i < effectiveIdx) ? stage.color : "#E5E7EB" }} />
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


