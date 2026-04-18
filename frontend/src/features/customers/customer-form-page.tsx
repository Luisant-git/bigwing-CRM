import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, UserCircle, User, Phone, Mail, MapPin, Calendar,
  Building2, Save, X, Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Breadcrumb } from "@/components/ui";

export default function CustomerFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    firstName: "", lastName: "", mobile: "", altMobile: "",
    email: "", location: "", customerType: "",
    dob: "", anniversary: "", accountType: "", accountName: "",
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const mut = useMutation({
    mutationFn: (body: any) => api.post("/customers", body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
      navigate({ to: "/customers/$id", params: { id: String(res.data.data.id) } });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = { firstName: form.firstName, mobile: form.mobile };
    if (form.lastName) body.lastName = form.lastName;
    if (form.altMobile) body.altMobile = form.altMobile;
    if (form.email) body.email = form.email;
    if (form.location) body.location = form.location;
    if (form.customerType) body.customerType = form.customerType;
    if (form.dob) body.dob = form.dob;
    if (form.anniversary) body.anniversary = form.anniversary;
    if (form.accountType) body.accountType = form.accountType;
    if (form.accountName) body.accountName = form.accountName;
    mut.mutate(body);
  };

  return (
    <div className="mx-auto max-w-4xl pb-24">
      <Breadcrumb items={[
        { label: "Home", to: "/" },
        { label: "Customers", to: "/customers", icon: UserCircle },
        { label: "New Customer", icon: Plus },
      ]} />

      {/* Header card */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1F3864] via-[#2E4974] to-[#2E75B6] p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate({ to: "/customers" })} className="rounded-lg bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Creating</p>
            <h1 className="text-2xl font-bold">New Customer</h1>
            <p className="mt-0.5 text-sm text-white/70">Add a customer to the master list</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Info */}
        <Section icon={User} title="Personal Information" subtitle="Customer's basic details" required>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="First Name *" icon={User} value={form.firstName} onChange={(v) => set("firstName", v)} required placeholder="Suresh" />
            <InputField label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} placeholder="Kumar" />
          </div>
        </Section>

        {/* Contact */}
        <Section icon={Phone} title="Contact Details" subtitle="How to reach the customer" required>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Mobile *" icon={Phone} value={form.mobile} onChange={(v) => set("mobile", v)} required placeholder="10-digit" />
            <InputField label="Alt Mobile" icon={Phone} value={form.altMobile} onChange={(v) => set("altMobile", v)} placeholder="Optional" />
            <InputField label="Email" icon={Mail} value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="customer@example.com" />
            <InputField label="Location" icon={MapPin} value={form.location} onChange={(v) => set("location", v)} placeholder="Indiranagar, Bangalore" />
          </div>
        </Section>

        {/* Profile */}
        <Section icon={Building2} title="Profile & Category">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Customer Type
            </label>
            <div className="grid grid-cols-3 gap-2 sm:w-[400px]">
              {[
                { value: "FIRST_TIME", label: "First Time", color: "#3B82F6" },
                { value: "REPEAT", label: "Repeat", color: "#27AE60" },
                { value: "INSTITUTIONAL", label: "Institutional", color: "#9B59B6" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("customerType", opt.value)}
                  className={`rounded-lg border px-3 py-2 text-[12px] font-semibold transition-all ${
                    form.customerType === opt.value
                      ? "text-white shadow-md"
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  style={form.customerType === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.customerType === "INSTITUTIONAL" && (
              <div className="mt-4">
                <InputField label="Account Name" value={form.accountName} onChange={(v) => set("accountName", v)} placeholder="Company or business name" />
              </div>
            )}
          </div>
        </Section>

        {/* Important Dates */}
        <Section icon={Calendar} title="Important Dates" subtitle="For birthday & anniversary wishes">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField label="Date of Birth" icon={Calendar} value={form.dob} onChange={(v) => set("dob", v)} type="date" />
            <InputField label="Anniversary" icon={Calendar} value={form.anniversary} onChange={(v) => set("anniversary", v)} type="date" />
          </div>
        </Section>
      </form>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:left-[260px]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <p className="text-[12px] text-gray-500">Fill in the details to create a new customer</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate({ to: "/customers" })}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={mut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              <Save size={14} /> {mut.isPending ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
