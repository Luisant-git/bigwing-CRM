import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, GripVertical, Pencil, Check, X, ToggleLeft, ToggleRight, Settings as SettingsIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";

const LOOKUP_SECTIONS = [
  { key: "enquiry-sources", label: "Enquiry Sources", description: "Lead source channels (Google, Instagram, Walk-in, etc.)" },
  { key: "enquiry-types", label: "Enquiry Types", description: "Category of enquiry (New, Service, Spares, etc.)" },
  { key: "interest-levels", label: "Interest Levels", description: "Hot / Warm / Cold classification" },
  { key: "closure-reasons", label: "Closure Reasons", description: "Why a lead was lost or closed" },
  { key: "referred-branches", label: "Referred Branches", description: "Other Honda branches that refer enquiries" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("enquiry-sources");

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F3864] text-white">
          <SettingsIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Settings</h1>
          <p className="text-[12px] text-gray-400">Manage lookup tables and dropdown values</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left nav */}
        <div className="w-full shrink-0 rounded-xl bg-[#F0F2F5] py-3 lg:w-[260px]">
          <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Lookup Tables
          </p>
          {LOOKUP_SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`block w-full border-l-[3px] px-4 py-2.5 text-left text-[13px] transition-colors ${
                activeSection === s.key
                  ? "border-[#2E75B6] bg-white font-semibold text-[#2E75B6]"
                  : "border-transparent text-gray-600 hover:bg-[#E8EAED]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {LOOKUP_SECTIONS.map((s) =>
            activeSection === s.key ? (
              <LookupEditor key={s.key} label={s.label} apiName={s.key} description={s.description} />
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

function LookupEditor({ label, apiName, description }: { label: string; apiName: string; description: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lookups", apiName, { includeInactive: true }],
    queryFn: () =>
      api.get(`/lookups/${apiName}`, { params: { includeInactive: true } }).then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post(`/lookups/${apiName}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lookups", apiName] });
      toast.success(`${label} item added`);
      setShowForm(false);
      setNewName("");
      setNewOrder("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      api.patch(`/lookups/${apiName}/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lookups", apiName] });
      toast.success("Updated");
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMut.mutate({
      name: newName.trim(),
      displayOrder: newOrder ? Number(newOrder) : 0,
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1F3864]">{label}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245f96] transition-colors"
        >
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-4 flex gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200"
        >
          <input
            placeholder="Name *"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
            className="flex-1 rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
          />
          <input
            type="number"
            placeholder="Order"
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            className="w-24 rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none"
          />
          <button
            type="submit"
            disabled={createMut.isPending}
            className="rounded-lg bg-[#27AE60] px-5 py-2 text-sm font-semibold text-white hover:bg-[#219150] disabled:opacity-50"
          >
            {createMut.isPending ? "..." : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-lg border px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Item list */}
      {isLoading ? (
        <PageLoader message="Loading..." />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((item: any) =>
            editingId === item.id ? (
              <EditRow
                key={item.id}
                item={item}
                onSave={(body) => updateMut.mutate({ id: item.id, body })}
                onCancel={() => setEditingId(null)}
                saving={updateMut.isPending}
              />
            ) : (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 transition-shadow hover:shadow-md ${item.isActive ? "ring-gray-100" : "ring-red-100 opacity-70"}`}
              >
                <GripVertical size={14} className="text-gray-300 cursor-grab" />
                <span className="flex-1 text-sm font-medium text-gray-700">
                  {item.name}
                </span>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                  Order: {item.displayOrder}
                </span>
                <button
                  onClick={() => updateMut.mutate({ id: item.id, body: { isActive: !item.isActive } })}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${item.isActive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}
                  title={item.isActive ? "Deactivate" : "Activate"}
                >
                  {item.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {item.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => setEditingId(item.id)}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-[#2E75B6]"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )
          )}

          {(data ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              No items yet. Click "Add Item" to create one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EditRow({
  item,
  onSave,
  onCancel,
  saving,
}: {
  item: any;
  onSave: (body: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [order, setOrder] = useState(String(item.displayOrder ?? 0));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ name: name.trim(), displayOrder: Number(order) || 0 });
      }}
      className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 ring-1 ring-blue-200"
    >
      <GripVertical size={14} className="text-blue-300" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        className="flex-1 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
      />
      <input
        type="number"
        value={order}
        onChange={(e) => setOrder(e.target.value)}
        className="w-24 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
      />
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1 rounded-md bg-[#27AE60] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#219150] disabled:opacity-50"
      >
        <Check size={12} /> Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
      >
        <X size={12} /> Cancel
      </button>
    </form>
  );
}
