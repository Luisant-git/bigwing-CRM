import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ClipboardList, Bike, User as UserIcon, Target, FileText,
  Save, X, Phone, Mail, MapPin, Sparkles, CheckCircle2, Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useLookup, useUsers } from "@/lib/hooks";
import { Breadcrumb } from "@/components/ui";

export default function LeadFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sources } = useLookup("enquiry-sources");
  const { data: types } = useLookup("enquiry-types");
  const { data: models } = useLookup("vehicle-models");
  const { data: colours } = useLookup("vehicle-colours");
  const { data: users } = useUsers();

  const [selectedModel, setSelectedModel] = useState("");
  const { data: variants } = useLookup("vehicle-variants", selectedModel ? { modelId: selectedModel } : undefined);

  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "",
    channel: "WALKIN", sourceId: "", enquiryTypeId: "", modelId: "",
    variantId: "", colourId: "", assignedTo: "", interestLevel: "",
    purchaseType: "", exchangeFlag: false,
    enquiryDate: new Date().toISOString().split("T")[0],
    remark: "",
  });

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const mut = useMutation({
    mutationFn: (body: any) => api.post("/leads", body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead created successfully");
      navigate({ to: "/leads/$id", params: { id: String(res.data.data.id) } });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mut.mutate({
      customer: { firstName: form.firstName, lastName: form.lastName || undefined, mobile: form.mobile },
      channel: form.channel,
      sourceId: Number(form.sourceId),
      enquiryTypeId: Number(form.enquiryTypeId),
      modelId: form.modelId ? Number(form.modelId) : undefined,
      variantId: form.variantId ? Number(form.variantId) : undefined,
      colourId: form.colourId ? Number(form.colourId) : undefined,
      assignedTo: form.assignedTo ? Number(form.assignedTo) : undefined,
      interestLevel: form.interestLevel || undefined,
      purchaseType: form.purchaseType || undefined,
      exchangeFlag: form.exchangeFlag,
      testRideFlag: false,
      enquiryDate: form.enquiryDate,
      remark: form.remark || undefined,
    });
  };

  const CHANNELS = [
    { value: "WALKIN", label: "Walk-in" },
    { value: "TELE", label: "Tele" },
    { value: "DIGITAL", label: "Digital" },
    { value: "SOCIAL", label: "Social" },
    { value: "REFERENCE", label: "Reference" },
    { value: "WEBSITE", label: "Website" },
    { value: "SERVICE", label: "Service" },
  ];

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        { label: "Leads", to: "/leads", icon: ClipboardList },
        { label: "New Lead", icon: Plus },
      ]} />

      {/* Header card */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1F3864] via-[#2E4974] to-[#2E75B6] p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate({ to: "/leads" })} className="rounded-lg bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Creating</p>
            <h1 className="text-2xl font-bold">New Lead</h1>
            <p className="mt-0.5 text-sm text-white/70">Capture customer interest and enquiry details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Vehicle Interest — shown first so the sales rep locks in the product of interest up front */}
        <Section icon={Bike} title="Vehicle Interest" subtitle="Which vehicle is the customer interested in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              label="Model"
              value={form.modelId}
              onChange={(v) => { set("modelId", v); setSelectedModel(v); set("variantId", ""); }}
              options={(models ?? []).map((m: any) => ({ value: String(m.id), label: m.name }))}
            />
            <SelectField
              label="Variant"
              value={form.variantId}
              onChange={(v) => set("variantId", v)}
              options={(variants ?? []).map((v: any) => ({ value: String(v.id), label: v.name }))}
              disabled={!selectedModel}
            />
            <SelectField
              label="Colour"
              value={form.colourId}
              onChange={(v) => set("colourId", v)}
              options={(colours ?? []).map((c: any) => ({ value: String(c.id), label: c.name }))}
            />
          </div>
        </Section>

        {/* Customer Info */}
        <Section icon={UserIcon} title="Customer Information" subtitle="Who is the enquiry for" required>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InputField label="First Name *" icon={UserIcon} value={form.firstName} onChange={(v) => set("firstName", v)} required placeholder="Suresh" />
            <InputField label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="Kumar" />
            <InputField label="Mobile *" icon={Phone} value={form.mobile} onChange={(v) => set("mobile", v)} required placeholder="10-digit" />
          </div>
        </Section>

        {/* Enquiry Details */}
        <Section icon={FileText} title="Enquiry Details" subtitle="Where and when" required>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Channel *
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set("channel", c.value)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all ${
                      form.channel === c.value
                        ? "bg-[#2E75B6] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <InputField label="Enquiry Date *" icon={Sparkles} value={form.enquiryDate} onChange={(v) => set("enquiryDate", v)} type="date" required />
            <SelectField
              label="Source *"
              value={form.sourceId}
              onChange={(v) => set("sourceId", v)}
              options={(sources ?? []).map((s: any) => ({ value: String(s.id), label: s.name }))}
              required
            />
            <SelectField
              label="Enquiry Type *"
              value={form.enquiryTypeId}
              onChange={(v) => set("enquiryTypeId", v)}
              options={(types ?? []).map((t: any) => ({ value: String(t.id), label: t.name }))}
              required
            />
          </div>
        </Section>

        {/* Interest & Purchase */}
        <Section icon={Target} title="Interest & Purchase" subtitle="How likely to convert">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Interest Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "HOT", label: "🔥 Hot", color: "#EF4444" },
                  { value: "WARM", label: "🌤️ Warm", color: "#F59E0B" },
                  { value: "COLD", label: "❄️ Cold", color: "#64748B" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("interestLevel", opt.value)}
                    className={`rounded-lg border px-3 py-2 text-[12px] font-bold transition-all ${
                      form.interestLevel === opt.value
                        ? "text-white shadow-md"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                    style={form.interestLevel === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
            />
          </div>
          {(form.purchaseType === "CASH" || form.purchaseType === "FINANCE") && (
            <div className="mt-3 flex gap-3">
              <ToggleChip label="Exchange" active={form.exchangeFlag} onChange={(v) => set("exchangeFlag", v)} />
            </div>
          )}
        </Section>

        {/* Assignment */}
        <Section icon={UserIcon} title="Assignment">
          <SelectField
            label="Assigned To"
            value={form.assignedTo}
            onChange={(v) => set("assignedTo", v)}
            options={(users ?? []).map((u: any) => ({ value: String(u.id), label: u.fullName }))}
          />
        </Section>

        {/* Notes */}
        <Section icon={Sparkles} title="Notes & Remarks">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Remark
            </label>
            <textarea
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
              rows={3}
              placeholder="Add any additional notes about this lead..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
            />
          </div>
        </Section>
      </form>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:left-[260px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <p className="text-[12px] text-gray-500">Fill in the details to create a new lead</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/leads" })}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={mut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              <Save size={14} /> {mut.isPending ? "Creating..." : "Create Lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────

function Section({
  icon: Icon, title, subtitle, required, children,
}: {
  icon: any; title: string; subtitle?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-[#F8FAFC] to-white px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E75B6]/10 text-[#2E75B6]">
          <Icon size={16} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[#1F3864]">{title}</h3>
            {required && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-[#EB5757]">REQUIRED</span>}
          </div>
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
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

function SelectField({
  label, value, onChange, options, disabled = false, required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${
            value
              ? "border-[#2E75B6]/40 text-gray-800 focus:border-[#2E75B6] focus:ring-[rgba(46,117,182,0.1)]"
              : "border-gray-200 text-gray-400 focus:border-[#2E75B6] focus:ring-[rgba(46,117,182,0.1)]"
          }`}
        >
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}

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
