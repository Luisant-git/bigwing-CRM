import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Bike, Palette, ChevronRight, Zap, Mountain, Trophy, Compass,
  ToggleLeft, ToggleRight, Pencil, Check, X, Eye, EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { ConfirmModal, Tooltip, Breadcrumb } from "@/components/ui";

type Tab = "models" | "colours";

// Generate a stable color from a string
function stringToColor(str: string): string {
  const PALETTE = [
    "#2E75B6", "#E8792F", "#27AE60", "#9B59B6", "#EB5757",
    "#2D9CDB", "#F2994A", "#1F3864", "#6C757D", "#17A2B8",
    "#D63384", "#0D6EFD", "#198754", "#FFC107", "#6610f2",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// Map segment to icon
function segmentIcon(segment?: string) {
  if (!segment) return Bike;
  const s = segment.toLowerCase();
  if (s.includes("adventure") || s.includes("adv")) return Mountain;
  if (s.includes("sport") || s.includes("super")) return Trophy;
  if (s.includes("naked") || s.includes("street")) return Zap;
  if (s.includes("tourer") || s.includes("grand")) return Compass;
  return Bike;
}

// Derive a background tint from a color hex
function tint(hex: string, amount = 0.08): string {
  return `${hex}${Math.round(amount * 255).toString(16).padStart(2, "0")}`;
}

export default function CataloguePage() {
  const [tab, setTab] = useState<Tab>("models");

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Vehicle Catalogue", icon: Bike }]} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F3864] text-white">
          <Bike size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Vehicle Catalogue</h1>
          <p className="text-[12px] text-gray-400">Manage models, variants, and colours</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setTab("models")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${tab === "models" ? "bg-white text-[#1F3864] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Bike size={16} /> Models & Variants
        </button>
        <button
          onClick={() => setTab("colours")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${tab === "colours" ? "bg-white text-[#1F3864] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Palette size={16} /> Colours
        </button>
      </div>

      {tab === "models" && <ModelsTab />}
      {tab === "colours" && <ColoursTab />}
    </div>
  );
}

function ModelsTab() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{ kind: "model" | "variant"; id: number; name: string; active: boolean } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-catalogue", "models"],
    queryFn: () => api.get("/vehicle-catalogue/models?includeInactive=true").then((r) => r.data.data),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", segment: "", bodyType: "" });
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const createMut = useMutation({
    mutationFn: (body: any) => api.post("/vehicle-catalogue/models", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Model created");
      setShowForm(false);
      setForm({ name: "", segment: "", bodyType: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const updateModelMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      api.patch(`/vehicle-catalogue/models/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Model updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const updateVariantMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      api.patch(`/vehicle-catalogue/variants/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Variant updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  if (isLoading) return <PageLoader message="Loading catalogue..." />;

  const allModels = data ?? [];
  const filtered = showInactive
    ? allModels
    : allModels.filter((m: any) => m.isActive);
  const inactiveCount = allModels.filter((m: any) => !m.isActive).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${showInactive ? "border-[#2E75B6] bg-blue-50 text-[#2E75B6]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
          {showInactive ? "Showing inactive" : "Show inactive"}
          {inactiveCount > 0 && (
            <span className={`rounded-full px-1.5 text-[10px] font-semibold ${showInactive ? "bg-[#2E75B6] text-white" : "bg-gray-200 text-gray-600"}`}>
              {inactiveCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245f96] transition-colors"
        >
          <Plus size={16} /> Add Model
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }}
          className="mb-5 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <p className="mb-3 text-sm font-semibold text-[#1F3864]">New Model</p>
          <div className="flex flex-wrap gap-3">
            <input placeholder="Model Name *" value={form.name} onChange={(e) => set("name", e.target.value)} required className="min-w-40 flex-1 rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]" />
            <input placeholder="Segment" value={form.segment} onChange={(e) => set("segment", e.target.value)} className="w-40 rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
            <input placeholder="Body Type" value={form.bodyType} onChange={(e) => set("bodyType", e.target.value)} className="w-40 rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
            <button type="submit" disabled={createMut.isPending} className="rounded-lg bg-[#27AE60] px-5 py-2 text-sm font-semibold text-white hover:bg-[#219150] disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m: any) => {
          const color = stringToColor(m.name);
          const Icon = segmentIcon(m.segment);
          return (
            <ModelCard
              key={m.id}
              model={m}
              color={color}
              Icon={Icon}
              onToggle={() => {
                if (m.isActive) {
                  setConfirmToggle({ kind: "model", id: m.id, name: m.name, active: true });
                } else {
                  updateModelMut.mutate({ id: m.id, body: { isActive: true } });
                }
              }}
              onRename={(newName) => updateModelMut.mutate({ id: m.id, body: { name: newName } })}
              onVariantToggle={(v) => {
                if (v.isActive) {
                  setConfirmToggle({ kind: "variant", id: v.id, name: v.name, active: true });
                } else {
                  updateVariantMut.mutate({ id: v.id, body: { isActive: true } });
                }
              }}
              saving={updateModelMut.isPending || updateVariantMut.isPending}
            />
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-gray-400">
            {allModels.length === 0
              ? "No models yet. Click 'Add Model' to create one."
              : "No active models. Click 'Show inactive' to see hidden items."}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmToggle}
        title={`Deactivate ${confirmToggle?.kind === "model" ? "Model" : "Variant"}?`}
        message={`"${confirmToggle?.name}" will no longer appear in dropdowns when creating or editing leads. Existing leads using it will not be affected.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={updateModelMut.isPending || updateVariantMut.isPending}
        onConfirm={() => {
          if (!confirmToggle) return;
          if (confirmToggle.kind === "model") {
            updateModelMut.mutate({ id: confirmToggle.id, body: { isActive: false } }, {
              onSuccess: () => setConfirmToggle(null),
            });
          } else {
            updateVariantMut.mutate({ id: confirmToggle.id, body: { isActive: false } }, {
              onSuccess: () => setConfirmToggle(null),
            });
          }
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}

function ModelCard({
  model: m,
  color,
  Icon,
  onToggle,
  onRename,
  onVariantToggle,
  saving,
}: {
  model: any;
  color: string;
  Icon: any;
  onToggle: () => void;
  onRename: (name: string) => void;
  onVariantToggle: (v: any) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(m.name);

  return (
    <div className={`group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition-all hover:shadow-lg ${!m.isActive ? "opacity-70" : ""}`}>
      <div className="h-1.5" style={{ backgroundColor: m.isActive ? color : "#CBD5E1" }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: tint(m.isActive ? color : "#CBD5E1", 0.12) }}
            >
              <Icon size={22} style={{ color: m.isActive ? color : "#94A3B8" }} />
            </div>
            <div className="min-w-0">
              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (editName.trim() && editName !== m.name) onRename(editName.trim());
                    setEditing(false);
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="rounded-md border border-[#2E75B6] px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                  />
                  <button type="submit" className="rounded p-1 text-green-600 hover:bg-green-50"><Check size={14} /></button>
                  <button type="button" onClick={() => { setEditing(false); setEditName(m.name); }} className="rounded p-1 text-gray-400 hover:bg-gray-50"><X size={14} /></button>
                </form>
              ) : (
                <div className="flex items-center gap-1">
                  <h3 className="truncate text-[15px] font-bold text-[#1F3864]">{m.name}</h3>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-[#2E75B6] hover:bg-gray-50 transition-opacity"
                    title="Rename"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <div className="mt-0.5 flex items-center gap-2">
                {m.segment && (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: tint(color, 0.1), color }}
                  >
                    {m.segment}
                  </span>
                )}
                {m.bodyType && (
                  <span className="text-[11px] text-gray-400">{m.bodyType}</span>
                )}
              </div>
            </div>
          </div>

          {/* Toggle button */}
          <button
            onClick={onToggle}
            disabled={saving}
            className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${m.isActive ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
            title={m.isActive ? "Deactivate model" : "Activate model"}
          >
            {m.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            {m.isActive ? "Active" : "Inactive"}
          </button>
        </div>

        {/* Variants */}
        {m.variants?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Variants ({m.variants.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {m.variants.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => onVariantToggle(v)}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all hover:ring-2 hover:ring-offset-1"
                  style={{
                    backgroundColor: v.isActive ? tint(color, 0.08) : "#FEE2E2",
                    color: v.isActive ? color : "#EB5757",
                  }}
                  title={v.isActive ? "Click to deactivate" : "Click to activate"}
                >
                  {v.isActive ? <ChevronRight size={10} /> : <X size={10} />}
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {(!m.variants || m.variants.length === 0) && (
          <p className="mt-3 text-[11px] text-gray-300">No variants configured</p>
        )}
      </div>
    </div>
  );
}

// ─── Colour name → CSS‑safe visual color ────────────────────────
const COLOUR_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  black: { bg: "#1a1a2e", text: "#ffffff", dot: "#000000" },
  red: { bg: "#FECACA", text: "#991B1B", dot: "#DC2626" },
  blue: { bg: "#DBEAFE", text: "#1E40AF", dot: "#2563EB" },
  green: { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  grey: { bg: "#E5E7EB", text: "#374151", dot: "#6B7280" },
  gray: { bg: "#E5E7EB", text: "#374151", dot: "#6B7280" },
  white: { bg: "#F9FAFB", text: "#374151", dot: "#D1D5DB" },
  silver: { bg: "#E5E7EB", text: "#4B5563", dot: "#9CA3AF" },
  gold: { bg: "#FEF3C7", text: "#92400E", dot: "#D97706" },
  pearl: { bg: "#F3F4F6", text: "#1F2937", dot: "#9CA3AF" },
  matt: { bg: "#374151", text: "#F9FAFB", dot: "#4B5563" },
  matte: { bg: "#374151", text: "#F9FAFB", dot: "#4B5563" },
  candy: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  marshal: { bg: "#D1FAE5", text: "#065F46", dot: "#059669" },
  gunpowder: { bg: "#1F2937", text: "#E5E7EB", dot: "#374151" },
  spartan: { bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  nightstar: { bg: "#111827", text: "#E5E7EB", dot: "#1F2937" },
  caribbean: { bg: "#CFFAFE", text: "#155E75", dot: "#06B6D4" },
  mud: { bg: "#D6D3D1", text: "#44403C", dot: "#78716C" },
  prix: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  dual: { bg: "#F3F4F6", text: "#111827", dot: "#6B7280" },
  sports: { bg: "#FEE2E2", text: "#7F1D1D", dot: "#EF4444" },
};

function getColourStyle(name: string): { bg: string; text: string; dot: string } {
  const lower = name.toLowerCase();
  for (const [key, style] of Object.entries(COLOUR_MAP)) {
    if (lower.includes(key)) return style;
  }
  const color = stringToColor(name);
  return { bg: tint(color, 0.12), text: color, dot: color };
}

function ColoursTab() {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-catalogue", "colours"],
    queryFn: () => api.get("/vehicle-catalogue/colours?includeInactive=true").then((r) => r.data.data),
  });

  const [newColour, setNewColour] = useState("");
  const createMut = useMutation({
    mutationFn: (name: string) => api.post("/vehicle-catalogue/colours", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Colour added");
      setNewColour("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      api.patch(`/vehicle-catalogue/colours/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Colour updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  if (isLoading) return <PageLoader message="Loading colours..." />;

  const allColours = data ?? [];
  const filtered = showInactive ? allColours : allColours.filter((c: any) => c.isActive);
  const inactiveCount = allColours.filter((c: any) => !c.isActive).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${showInactive ? "border-[#2E75B6] bg-blue-50 text-[#2E75B6]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
          {showInactive ? "Showing inactive" : "Show inactive"}
          {inactiveCount > 0 && (
            <span className={`rounded-full px-1.5 text-[10px] font-semibold ${showInactive ? "bg-[#2E75B6] text-white" : "bg-gray-200 text-gray-600"}`}>
              {inactiveCount}
            </span>
          )}
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newColour.trim()) createMut.mutate(newColour.trim());
        }}
        className="mb-6 flex gap-2"
      >
        <div className="relative max-w-sm flex-1">
          <Palette size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="New colour name..."
            value={newColour}
            onChange={(e) => setNewColour(e.target.value)}
            className="w-full rounded-lg border border-[#D4D9E0] pl-9 pr-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
          />
        </div>
        <button
          type="submit"
          disabled={createMut.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245f96] disabled:opacity-50"
        >
          <Plus size={14} /> Add Colour
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((c: any) => {
          const style = c.isActive
            ? getColourStyle(c.name)
            : { bg: "#FEE2E2", text: "#EB5757", dot: "#EB5757" };

          return (
            <div
              key={c.id}
              className={`group flex items-center gap-3 rounded-xl p-4 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md ${!c.isActive ? "opacity-80" : ""}`}
              style={{ backgroundColor: style.bg }}
            >
              <div
                className="h-8 w-8 shrink-0 rounded-full shadow-inner ring-2 ring-white"
                style={{ backgroundColor: style.dot }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold" style={{ color: style.text }}>
                  {c.name}
                </p>
                {!c.isActive && (
                  <p className="text-[10px] font-medium" style={{ color: style.text, opacity: 0.7 }}>
                    Inactive
                  </p>
                )}
              </div>
              <button
                onClick={() => updateMut.mutate({ id: c.id, body: { isActive: !c.isActive } })}
                disabled={updateMut.isPending}
                className="shrink-0 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/40"
                title={c.isActive ? "Deactivate" : "Activate"}
                style={{ color: style.text }}
              >
                {c.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-10 text-center text-sm text-gray-400">
            {allColours.length === 0
              ? "No colours yet. Add one above."
              : "No active colours. Click 'Show inactive' to see hidden items."}
          </div>
        )}
      </div>
    </div>
  );
}
