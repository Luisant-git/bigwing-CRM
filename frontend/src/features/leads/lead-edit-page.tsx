import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ClipboardList, Bike, User as UserIcon, Target,
  FileText, Save, X, CircleDollarSign, Sparkles, CheckCircle2,
  Calendar, MapPin,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useLookup, useUsers, STAGE_COLORS, STAGE_LABELS } from "@/lib/hooks";
import { Breadcrumb, Tooltip } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { InterestBadge } from "@/components/interest-badge";

export default function LeadEditPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ["leads", id],
    queryFn: () => api.get(`/leads/${id}`).then((r) => r.data.data),
  });

  const { data: sources } = useLookup("enquiry-sources");
  const { data: types } = useLookup("enquiry-types");
  const { data: models } = useLookup("vehicle-models");
  const { data: colours } = useLookup("vehicle-colours");
  const { data: executives } = useLookup("sales-executives");

  const [form, setForm] = useState<any>({});
  const [dirty, setDirty] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const { data: variants } = useLookup(
    "vehicle-variants",
    selectedModel ? { modelId: selectedModel } : undefined
  );

  useEffect(() => {
    if (lead) {
      // Prefill from resolved lead data — we use name→id mappings via lookups
      const srcId = sources?.find((s: any) => s.name === lead.source)?.id;
      const typId = types?.find((t: any) => t.name === lead.enquiryType)?.id;
      const modId = models?.find((m: any) => m.name === lead.model)?.id;
      const colId = colours?.find((c: any) => c.name === lead.colour)?.id;
      setForm({
        sourceId: srcId ? String(srcId) : "",
        enquiryTypeId: typId ? String(typId) : "",
        modelId: modId ? String(modId) : "",
        variantId: "",
        colourId: colId ? String(colId) : "",
        executiveName: lead.executiveName ?? (lead.assignedTo?.fullName || ""),
        interestLevel: lead.interestLevel ?? "",
        purchaseType: lead.purchaseType ?? "",
        exchangeFlag: lead.exchangeFlag ?? false,
        testRideFlag: lead.testRideFlag ?? false,
        remark: lead.remark ?? "",
        referredFromBranch: lead.referredFromBranch ?? "",
        // Service fields
        typeOfService: lead.typeOfService ?? "",
        expectedServiceDate: lead.expectedServiceDate ? lead.expectedServiceDate.split("T")[0] : "",
        pickupDropFlag: lead.pickupDropFlag ?? false,
        location: lead.customer?.location ?? "",
      });
      if (modId) setSelectedModel(String(modId));
    }
  }, [lead, sources, types, models, colours]);

  const set = (field: string, value: any) => {
    setForm((f: any) => ({ ...f, [field]: value }));
    setDirty(true);
  };

  const mut = useMutation({
    mutationFn: (body: any) => api.patch(`/leads/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated successfully");
      navigate({ to: "/leads/$id", params: { id: id! } });
    },
    onError: (err: any) => {
      const details = err.response?.data?.error?.details;
      if (details && Array.isArray(details) && details.length > 0) {
        toast.error(`${details[0].message} (${details[0].field})`);
      } else {
        toast.error(err.response?.data?.error?.message || "Update failed");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {};
    if (form.sourceId) body.sourceId = Number(form.sourceId);
    if (form.enquiryTypeId) body.enquiryTypeId = Number(form.enquiryTypeId);
    if (form.modelId) body.modelId = Number(form.modelId);
    if (form.variantId) body.variantId = Number(form.variantId);
    if (form.colourId) body.colourId = Number(form.colourId);
    if (form.executiveName !== undefined) body.executiveName = form.executiveName;
    if (form.interestLevel) body.interestLevel = form.interestLevel;
    if (form.purchaseType) body.purchaseType = form.purchaseType;
    body.exchangeFlag = form.exchangeFlag;
    if (form.remark !== undefined) body.remark = form.remark;
    if (form.referredFromBranch !== undefined) body.referredFromBranch = form.referredFromBranch;
    
    // Service fields
    if (form.typeOfService !== undefined) body.typeOfService = form.typeOfService;
    if (form.expectedServiceDate !== undefined) body.expectedServiceDate = form.expectedServiceDate || null;
    body.pickupDropFlag = form.pickupDropFlag;
    
    mut.mutate(body);
  };

  if (isLoading) return <PageLoader message="Loading lead..." />;
  if (!lead) return <p className="text-gray-400">Lead not found</p>;

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        { label: "Leads", to: "/leads", icon: ClipboardList },
        { label: lead.enquiryNo, to: `/leads/${id}` },
        { label: "Edit" },
      ]} />

      {/* Header card — shows what we're editing */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1F3864] via-[#2E4974] to-[#2E75B6] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/leads/$id", params: { id: id! } })}
              className="rounded-lg bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Editing Lead
              </p>
              <h1 className="mt-1 text-2xl font-bold">{lead.enquiryNo}</h1>
              <p className="mt-0.5 text-sm text-white/70">
                {lead.customer?.firstName} {lead.customer?.lastName ?? ""}
                {lead.customer?.mobile && <> · {lead.customer.mobile}</>}
                {lead.customer?.location && <> · {lead.customer.location}</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${lead.channel === "SERVICE" ? "bg-purple-500/20 text-purple-200 border border-purple-500/30" : STAGE_COLORS[lead.stage] ?? "bg-white/20"}`}>
              {lead.channel === "SERVICE" ? "SERVICE" : STAGE_LABELS[lead.stage] ?? lead.stage?.replace(/_/g, " ")}
            </span>
            {lead.interestLevel && <InterestBadge level={lead.interestLevel} />}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {lead.channel === "SERVICE" && (
          <Section icon={Bike} title="Service Details" subtitle="Specifics for the service visit">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InputField 
                label="Expected Service Date" 
                icon={Calendar} 
                value={form.expectedServiceDate} 
                onChange={(v: string) => set("expectedServiceDate", v)} 
                type="date" 
              />
              <InputField 
                label="Type Of Service" 
                value={form.typeOfService} 
                onChange={(v: string) => set("typeOfService", v)} 
                placeholder="e.g. Paid Service, Running Repair" 
              />
              <div className="flex items-end pb-1">
                <ToggleChip label="Pick-up and Drop" active={form.pickupDropFlag} onChange={(v: boolean) => set("pickupDropFlag", v)} />
              </div>
            </div>
          </Section>
        )}

        {/* Vehicle Interest */}
        <Section icon={Bike} title="Vehicle Interest" subtitle="Which vehicle is the customer interested in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              label="Model"
              value={form.modelId}
              onChange={(v) => { set("modelId", v); setSelectedModel(v); set("variantId", ""); }}
              options={(models ?? []).map((m: any) => ({ value: String(m.id), label: m.name }))}
              current={lead.model}
            />
            <SelectField
              label="Variant"
              value={form.variantId}
              onChange={(v) => set("variantId", v)}
              options={(variants ?? []).map((v: any) => ({ value: String(v.id), label: v.name }))}
              current={lead.variant}
              disabled={!selectedModel}
            />
            <SelectField
              label="Colour"
              value={form.colourId}
              onChange={(v) => set("colourId", v)}
              options={(colours ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))}
              current={lead.colour}
            />
          </div>
        </Section>

        {/* Enquiry Details section */}
        <Section icon={FileText} title="Enquiry Details" subtitle="Where did this lead come from">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Source"
              value={form.sourceId}
              onChange={(v) => set("sourceId", v)}
              options={(sources ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))}
              current={lead.source}
            />
            <SelectField
              label="Enquiry Type"
              value={form.enquiryTypeId}
              onChange={(v) => set("enquiryTypeId", v)}
              options={(types ?? []).map((t: any) => ({ value: String(t.id), label: t.name }))}
              current={lead.enquiryType}
            />
            <InputField 
              label="Location" 
              icon={MapPin} 
              value={form.location} 
              onChange={(v: string) => set("location", v)} 
              placeholder="e.g. HSR Layout" 
            />
          </div>
        </Section>

        {/* Interest & Purchase */}
        {lead.channel !== "SERVICE" && (
          <Section icon={Target} title="Interest & Purchase" subtitle="How likely to convert">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Interest Level"
                value={form.interestLevel}
                onChange={(v) => set("interestLevel", v)}
                options={[
                  { value: "HOT", label: "🔥 Hot — Ready to buy" },
                  { value: "WARM", label: "🌤️ Warm — Interested, needs time" },
                  { value: "COLD", label: "❄️ Cold — Low interest" },
                ]}
                current={lead.interestLevel}
              />
              <SelectField
                label="Purchase Type"
                value={form.purchaseType}
                onChange={(v) => {
                  set("purchaseType", v);
                  // Exchange is only meaningful alongside Cash/Finance; reset when cleared
                  if (!v) set("exchangeFlag", false);
                }}
                options={[
                  { value: "CASH", label: "Cash" },
                  { value: "FINANCE", label: "Finance" },
                ]}
                current={lead.purchaseType}
                icon={CircleDollarSign}
              />
            </div>
            {(form.purchaseType === "CASH" || form.purchaseType === "FINANCE") && (
              <div className="mt-3 flex gap-3">
                <ToggleChip
                  label="Exchange"
                  active={form.exchangeFlag ?? false}
                  onChange={(v) => set("exchangeFlag", v)}
                />
              </div>
            )}
          </Section>
        )}

        {/* Assignment */}
        <Section icon={UserIcon} title="Assignment" subtitle="Who is handling this lead">
          <SelectField
            label="Assigned To"
            value={form.executiveName}
            onChange={(v) => set("executiveName", v)}
            options={(executives ?? []).map((ex: any) => ({ value: ex.name, label: ex.name }))}
            current={lead.executiveName || lead.assignedTo?.fullName}
          />
        </Section>

        {/* Notes */}
        <Section icon={Sparkles} title="Notes & Remarks">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Remark
            </label>
            <textarea
              value={form.remark ?? ""}
              onChange={(e) => set("remark", e.target.value)}
              rows={3}
              placeholder="Add a note about this lead..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
            />
          </div>
        </Section>
      </form>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:left-[260px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 text-[12px] text-gray-500">
            {dirty ? (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                You have unsaved changes
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="text-green-500" />
                All changes saved
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Tooltip content="Discard changes">
              <button
                onClick={() => navigate({ to: "/leads/$id", params: { id: id! } })}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                <X size={14} /> Cancel
              </button>
            </Tooltip>
            <button
              onClick={handleSubmit}
              disabled={mut.isPending || !dirty}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} /> {mut.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section — grouped form card with icon header
// ─────────────────────────────────────────────────────────────
function Section({
  icon: Icon, title, subtitle, children,
}: {
  icon: any; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-[#F8FAFC] to-white px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E75B6]/10 text-[#2E75B6]">
          <Icon size={16} />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-[#1F3864]">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SelectField — shows current value clearly + highlights changes
// ─────────────────────────────────────────────────────────────
function SelectField({
  label, value, onChange, options, current, disabled = false, icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  current?: string | null;
  disabled?: boolean;
  icon?: any;
}) {
  // Find the label of the currently selected option
  const selectedLabel = options.find((o) => o.value === value)?.label;
  const hasCurrent = current && current !== "—";
  const Icon = icon;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {Icon && <Icon size={12} />}
          {label}
        </label>
        {hasCurrent && (
          <span className="text-[10px] text-gray-400">
            Current: <span className="font-semibold text-gray-600">{current}</span>
          </span>
        )}
      </div>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-8 text-sm transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${
            selectedLabel
              ? "border-[#2E75B6]/40 text-gray-800 focus:border-[#2E75B6] focus:ring-[rgba(46,117,182,0.1)]"
              : "border-gray-200 text-gray-400 focus:border-[#2E75B6] focus:ring-[rgba(46,117,182,0.1)]"
          }`}
        >
          <option value="">— No change —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ToggleChip — checkbox-like pill for boolean flags
// ─────────────────────────────────────────────────────────────
function ToggleChip({
  label, active, onChange,
}: {
  label: string; active: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
        active
          ? "bg-[#2E75B6] text-white shadow-md"
          : "bg-gray-100 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-200"
      }`}
    >
      <span className={`flex h-4 w-4 items-center justify-center rounded-full ${active ? "bg-white text-[#2E75B6]" : "border-2 border-gray-300"}`}>
        {active && <CheckCircle2 size={10} strokeWidth={3} />}
      </span>
      {label}
    </button>
  );
}

function InputField({
  label, value, onChange, icon, ...props
}: {
  label: string; value: string; onChange: (v: string) => void; icon?: any; [k: string]: any;
}) {
  const Icon = icon;
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {Icon && <Icon size={12} />}
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
        {...props}
      />
    </div>
  );
}
