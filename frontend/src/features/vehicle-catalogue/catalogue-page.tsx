import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  Plus, Bike, Palette, ChevronRight, Zap, Mountain, Trophy, Compass,
  ToggleLeft, ToggleRight, Pencil, Check, X, Eye, EyeOff, Package, Loader2, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { ConfirmModal, Tooltip, Breadcrumb, FlyingModal } from "@/components/ui";

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
  const qc = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState<{ kind: "model" | "variant" | "colour"; id: number; name: string } | null>(null);

  const deleteModelMut = useMutation({
    mutationFn: (id: number) => api.delete(`/vehicle-catalogue/models/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Model deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to delete model"),
  });

  const deleteVariantMut = useMutation({
    mutationFn: (id: number) => api.delete(`/vehicle-catalogue/variants/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Variant deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to delete variant"),
  });

  const deleteColourMut = useMutation({
    mutationFn: (id: number) => api.delete(`/vehicle-catalogue/colours/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      toast.success("Colour deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to delete colour"),
  });

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

      {tab === "models" && <ModelsTab setConfirmDelete={setConfirmDelete} />}
      {tab === "colours" && <ColoursTab setConfirmDelete={setConfirmDelete} />}

      <ConfirmModal
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.name}?`}
        message={`Are you sure you want to permanently delete this ${confirmDelete?.kind}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (!confirmDelete) return;
          if (confirmDelete.kind === "model") {
            deleteModelMut.mutate(confirmDelete.id);
          } else if (confirmDelete.kind === "variant") {
            deleteVariantMut.mutate(confirmDelete.id);
          } else {
            deleteColourMut.mutate(confirmDelete.id);
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ModelsTab({ setConfirmDelete }: { setConfirmDelete: (v: any) => void }) {
  const qc = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<{ kind: "model" | "variant"; id: number; name: string; active: boolean } | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-catalogue", "models"],
    queryFn: () => api.get("/vehicle-catalogue/models?includeInactive=true").then((r) => r.data.data),
  });

  const [showForm, setShowForm] = useState(false);

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

  const [editingModel, setEditingModel] = useState<any>(null);

  const importStockMut = useMutation({
    mutationFn: (data: any[]) => api.post("/vehicle-catalogue/variants/import-stock", { data }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] });
      const { success, failed, errors } = res.data.data;
      if (failed > 0) {
        toast.error(`Imported ${success} rows, but ${failed} failed.`);
        console.error("Stock Import Errors:", errors);
      } else {
        toast.success(`Successfully updated stock for ${success} variants.`);
      }
    },
    onError: (err: any) => toast.error("Failed to import stock"),
  });

  const handleStockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast.error("File is empty");
          return;
        }

        // Check for required columns (Model, Variant, Stock)
        const first = data[0] as any;
        const keys = Object.keys(first).map(k => k.toLowerCase());
        if (!keys.includes("model") || !keys.includes("variant") || !keys.includes("stock")) {
          toast.error("Excel must have 'Model', 'Variant', and 'Stock' columns");
          return;
        }

        importStockMut.mutate(data);
      } catch (err) {
        toast.error("Failed to read Excel file");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; // Reset
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245f96] transition-colors"
          >
            <Plus size={16} /> Add Model
          </button>
          <button
            onClick={() => document.getElementById("stock-upload")?.click()}
            disabled={importStockMut.isPending}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {importStockMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />} 
            Update Stock
          </button>
        </div>
        <input 
          id="stock-upload" 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
          onChange={handleStockUpload} 
        />
      </div>

      <ModelFormModal 
        open={showForm || !!editingModel} 
        model={editingModel}
        onClose={() => { setShowForm(false); setEditingModel(null); }} 
        onSuccess={() => { qc.invalidateQueries({ queryKey: ["vehicle-catalogue"] }); setShowForm(false); setEditingModel(null); }}
      />

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
              onVariantToggle={(v) => {
                if (v.isActive) {
                  setConfirmToggle({ kind: "variant", id: v.id, name: v.name, active: true });
                } else {
                  updateVariantMut.mutate({ id: v.id, body: { isActive: true } });
                }
              }}
              onVariantDelete={(id, name) => setConfirmDelete({ kind: "variant", id, name })}
              onDelete={() => setConfirmDelete({ kind: "model", id: m.id, name: m.name })}
              onEdit={() => setEditingModel(m)}
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
        title={`Deactivate ${confirmToggle?.name}?`}
        message={`This will hide this ${confirmToggle?.kind} from the selection dropdowns in Leads and Sales.`}
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (confirmToggle.kind === "model") {
            updateModelMut.mutate({ id: confirmToggle.id, body: { isActive: false } });
          } else {
            updateVariantMut.mutate({ id: confirmToggle.id, body: { isActive: false } });
          }
          setConfirmToggle(null);
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
  onVariantToggle,
  onVariantDelete,
  onDelete,
  onEdit,
  saving,
}: {
  model: any;
  color: string;
  Icon: any;
  onToggle: () => void;
  onVariantToggle: (v: any) => void;
  onVariantDelete: (id: number, name: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  saving: boolean;
}) {

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
              <h3 className="truncate text-base font-bold text-[#1F3864]" title={m.name}>
                {m.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] font-medium text-gray-400">{m.segment || "No Segment"}</span>
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                <span className="text-[11px] font-medium text-gray-400">{m.bodyType || "No Type"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggle()}
              disabled={saving}
              className="rounded-md p-1 transition-colors hover:bg-gray-100"
              title={m.isActive ? "Deactivate Model" : "Activate Model"}
            >
              {m.isActive ? <ToggleRight size={20} className="text-[#27AE60]" /> : <ToggleLeft size={20} className="text-gray-300" />}
            </button>
            <button
              onClick={onEdit}
              disabled={saving}
              className="rounded-md p-1 transition-colors hover:bg-blue-50 hover:text-[#2E75B6]"
              title="Edit Model & Variants"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
              disabled={saving}
              className="rounded-md p-1 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Delete Model"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Variants */}
        {m.variants?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Variants ({m.variants.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {m.variants.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between group/v">
                  <div className="flex items-center gap-2">
                    <button
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
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Stock</span>
                    <div className={`rounded border px-2 py-0.5 text-[11px] font-bold ${v.stock <= 0 ? "border-red-200 text-red-500 bg-red-50" : "border-gray-100 text-[#1F3864] bg-gray-50"}`}>
                      {v.stock}
                    </div>
                    <button
                      onClick={() => onVariantDelete(v.id, v.name)}
                      className="ml-1 rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover/v:opacity-100"
                      title="Delete Variant"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
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

function ColoursTab({ setConfirmDelete }: { setConfirmDelete: (v: any) => void }) {
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
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => updateMut.mutate({ id: c.id, body: { isActive: !c.isActive } })}
                  disabled={updateMut.isPending}
                  className="rounded-md p-1 hover:bg-white/40"
                  title={c.isActive ? "Deactivate" : "Activate"}
                  style={{ color: style.text }}
                >
                  {c.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={() => setConfirmDelete({ kind: "colour", id: c.id, name: c.name })}
                  disabled={updateMut.isPending}
                  className="rounded-md p-1 hover:bg-white/40"
                  title="Delete Colour"
                  style={{ color: style.text }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
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

function ModelFormModal({ open, model, onClose, onSuccess }: { open: boolean; model?: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ name: "", segment: "", bodyType: "" });
  const [variants, setVariants] = useState<{ id?: number; name: string; stock: number }[]>([]);
  
  useEffect(() => {
    if (model) {
      setForm({ name: model.name, segment: model.segment || "", bodyType: model.bodyType || "" });
      setVariants(model.variants?.map((v: any) => ({ id: v.id, name: v.name, stock: v.stock })) || []);
    } else {
      setForm({ name: "", segment: "", bodyType: "" });
      setVariants([]);
    }
  }, [model, open]);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const mutation = useMutation({
    mutationFn: (body: any) => 
      model 
        ? api.put(`/vehicle-catalogue/models/${model.id}/full`, body)
        : api.post("/vehicle-catalogue/models", body),
    onSuccess: () => {
      toast.success(model ? "Model updated successfully" : "Model created successfully");
      onSuccess();
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed to save model"),
  });

  const addVariant = () => setVariants([...variants, { name: "", stock: 0 }]);
  const removeVariant = (idx: number) => setVariants(variants.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, f: string, v: any) => {
    const next = [...variants];
    (next[idx] as any)[f] = v;
    setVariants(next);
  };

  return (
    <FlyingModal open={open} onClose={onClose} title={model ? "Edit Model & Variants" : "Add New Model"} maxWidth="max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, variants }); }}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block text-[11px] font-bold uppercase text-gray-400">Model Name *</label>
            <input 
              required 
              value={form.name} 
              onChange={(e) => set("name", e.target.value)} 
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" 
              placeholder="e.g. CB350"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-400">Segment</label>
            <input 
              value={form.segment} 
              onChange={(e) => set("segment", e.target.value)} 
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" 
              placeholder="e.g. Sport"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-gray-400">Body Type</label>
            <input 
              value={form.bodyType} 
              onChange={(e) => set("bodyType", e.target.value)} 
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" 
              placeholder="e.g. Cruiser"
            />
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Variants & Stock</p>
            <button 
              type="button" 
              onClick={addVariant}
              className="flex items-center gap-1 rounded-lg bg-[#2E75B6] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-[#245f96] transition-colors"
            >
              <Plus size={14} /> Add Variant
            </button>
          </div>
          
          <div className="mt-3 space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <input 
                  required
                  placeholder="Variant Name" 
                  value={v.name} 
                  onChange={(e) => updateVariant(i, "name", e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase">Stock</span>
                  <input 
                    type="number"
                    required
                    value={v.stock} 
                    onChange={(e) => updateVariant(i, "stock", e.target.value)}
                    className="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none font-bold"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => removeVariant(i)}
                  className="rounded-full p-2 text-gray-300 hover:bg-red-50 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {variants.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-gray-100 py-10 text-center bg-gray-50/50">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-white p-3 shadow-sm mb-3">
                    <Plus size={24} className="text-gray-300" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-500 mb-4">No variants added yet</p>
                  <button 
                    type="button" 
                    onClick={addVariant}
                    className="rounded-lg bg-white border border-gray-200 px-6 py-2 text-xs font-bold text-[#2E75B6] shadow-sm hover:bg-blue-50 transition-colors"
                  >
                    Add First Variant
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2 border-t pt-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="rounded-lg border px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={mutation.isPending}
            className="rounded-lg bg-[#2E75B6] px-8 py-2 text-sm font-bold text-white shadow-md hover:bg-[#245f96] disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : (model ? "Update All" : "Save Model")}
          </button>
        </div>
      </form>
    </FlyingModal>
  );
}
