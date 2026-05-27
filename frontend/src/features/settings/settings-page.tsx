import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, GripVertical, Pencil, Check, X, ToggleLeft, ToggleRight, Settings as SettingsIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { FlyingModal } from "@/components/ui";

const LOOKUP_SECTIONS = [
  { key: "enquiry-sources", label: "Enquiry Sources", description: "Lead source channels (Google, Instagram, Walk-in, etc.)" },
  { key: "enquiry-types", label: "Enquiry Types", description: "Category of enquiry (New, Service, Spares, etc.)" },
  { key: "interest-levels", label: "Interest Levels", description: "Hot / Warm / Cold classification" },
  { key: "closure-reasons", label: "Closure Reasons", description: "Why a lead was lost or closed" },
  { key: "referred-branches", label: "Referred Branches", description: "Other Honda branches that refer enquiries" },
  { key: "sales-executives", label: "Sales Executives", description: "Manage names and contact numbers of Sales Executives" },
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
  const [newMobile, setNewMobile] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newNetworkCode, setNewNetworkCode] = useState("");
  const [newNetworkType, setNewNetworkType] = useState("");
  const [newInventoryLocation, setNewInventoryLocation] = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["lookups", apiName, { includeInactive: true }],
    queryFn: () =>
      api.get(`/lookups/${apiName}`, { params: { includeInactive: true } }).then((r) => r.data.data),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["lookups", "referred-branches", { includeInactive: false }],
    queryFn: () =>
      api.get(`/lookups/referred-branches`).then((r) => r.data.data),
    enabled: apiName === "sales-executives",
  });

  const createMut = useMutation({
    mutationFn: (body: any) => api.post(`/lookups/${apiName}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lookups", apiName] });
      toast.success(`${label} item added`);
      setShowForm(false);
      setNewName("");
      setNewMobile("");
      setNewBranchName("");
      setNewNetworkCode("");
      setNewNetworkType("");
      setNewInventoryLocation("");
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
    if (apiName === "referred-branches") {
      if (!newBranchName.trim()) return;
    } else {
      if (!newName.trim()) return;
      if (apiName === "sales-executives" && !newBranchName.trim()) {
        toast.error("Branch Name is required");
        return;
      }
    }
    createMut.mutate({
      name: apiName === "referred-branches" ? newBranchName.trim() : newName.trim(),
      ...(apiName === "sales-executives" && { 
        mobile: newMobile.trim(),
        branchName: newBranchName.trim(), 
        networkCode: newNetworkCode.trim(), 
      }),
      ...(apiName === "referred-branches" && { 
        branchName: newBranchName.trim(), 
        networkCode: newNetworkCode.trim(), 
        networkType: newNetworkType.trim(),
        inventoryLocation: newInventoryLocation.trim()
      }),
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

      {/* Add form Modal */}
      <FlyingModal open={showForm} onClose={() => setShowForm(false)} title={`Add ${label}`} maxWidth="max-w-md">
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4"
        >
          {apiName !== "referred-branches" && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">Name *</label>
              <input
                placeholder="Enter name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
              />
            </div>
          )}
          {apiName === "sales-executives" && (
            <>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Mobile Number</label>
                <input
                  placeholder="Enter mobile number"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Branch Name *</label>
                <select
                  value={newBranchName}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    setNewBranchName(selectedName);
                    const b = (branchesData || []).find((b: any) => b.branchName === selectedName);
                    if (b) {
                      setNewNetworkCode(b.networkCode || "");
                    } else {
                      setNewNetworkCode("");
                    }
                  }}
                  required
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                >
                  <option value="">-- Select Branch --</option>
                  {(branchesData || []).map((b: any) => (
                    <option key={b.id} value={b.branchName}>{b.branchName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Network Code</label>
                <input
                  placeholder="Network code"
                  value={newNetworkCode}
                  onChange={(e) => setNewNetworkCode(e.target.value)}
                  readOnly
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm bg-gray-50 focus:outline-none"
                />
              </div>
            </>
          )}
          {apiName === "referred-branches" && (
            <>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Branch Name *</label>
                <input
                  placeholder="Enter branch name"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Network Code</label>
                <input
                  placeholder="Enter network code"
                  value={newNetworkCode}
                  onChange={(e) => setNewNetworkCode(e.target.value)}
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Network Type</label>
                <input
                  placeholder="Enter network type"
                  value={newNetworkType}
                  onChange={(e) => setNewNetworkType(e.target.value)}
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-gray-700">Inventory Location</label>
                <input
                  placeholder="Enter inventory location"
                  value={newInventoryLocation}
                  onChange={(e) => setNewInventoryLocation(e.target.value)}
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                />
              </div>
            </>
          )}
          {apiName !== "referred-branches" && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-gray-700">Display Order</label>
              <input
                type="number"
                placeholder="e.g. 1"
                value={newOrder}
                onChange={(e) => setNewOrder(e.target.value)}
                className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
              />
            </div>
          )}
          
          <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-lg bg-[#2E75B6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#245f96] disabled:opacity-50"
            >
              {createMut.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </FlyingModal>

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
                apiName={apiName}
                branchesData={branchesData}
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
                <div className="flex-1 flex items-center justify-between gap-6 pr-6">
                  <div className="flex-1 flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {apiName !== "referred-branches" ? item.name : item.branchName}
                    </span>
                    {item.mobile && <span className="text-sm text-gray-500 whitespace-nowrap">({item.mobile})</span>}
                  </div>
                  {apiName !== "referred-branches" && item.branchName && (
                    <div className="w-36 flex-shrink-0 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Branch</span>
                      <span className="text-[13px] font-medium text-gray-700 truncate">{item.branchName}</span>
                    </div>
                  )}
                  {item.networkCode && (
                    <div className="w-28 flex-shrink-0 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Code</span>
                      <span className="text-[13px] font-medium text-gray-700 truncate">{item.networkCode}</span>
                    </div>
                  )}
                  {item.networkType && (
                    <div className="w-28 flex-shrink-0 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Type</span>
                      <span className="text-[13px] font-medium text-gray-700 truncate" title={item.networkType}>{item.networkType}</span>
                    </div>
                  )}
                  {item.inventoryLocation && (
                    <div className="w-40 flex-shrink-0 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Inventory Location</span>
                      <span className="text-[13px] font-medium text-gray-700 truncate" title={item.inventoryLocation}>{item.inventoryLocation}</span>
                    </div>
                  )}
                </div>
                {apiName !== "referred-branches" && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                    Order: {item.displayOrder}
                  </span>
                )}
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
  apiName,
  branchesData,
  onSave,
  onCancel,
  saving,
}: {
  item: any;
  apiName: string;
  branchesData?: any[];
  onSave: (body: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(item.name);
  const [mobile, setMobile] = useState(item.mobile ?? "");
  const [branchName, setBranchName] = useState(item.branchName ?? "");
  const [networkCode, setNetworkCode] = useState(item.networkCode ?? "");
  const [networkType, setNetworkType] = useState(item.networkType ?? "");
  const [inventoryLocation, setInventoryLocation] = useState(item.inventoryLocation ?? "");
  const [order, setOrder] = useState(String(item.displayOrder ?? 0));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ 
          name: apiName === "referred-branches" ? branchName.trim() : name.trim(), 
          ...(apiName === "sales-executives" && { mobile: mobile.trim() }),
          ...((apiName === "referred-branches" || apiName === "sales-executives") && { branchName: branchName.trim() }),
          ...((apiName === "referred-branches" || apiName === "sales-executives") && { networkCode: networkCode.trim() }),
          ...(apiName === "referred-branches" && { networkType: networkType.trim() }),
          ...(apiName === "referred-branches" && { inventoryLocation: inventoryLocation.trim() }),
          displayOrder: Number(order) || 0 
        });
      }}
      className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 ring-1 ring-blue-200"
    >
      <GripVertical size={14} className="text-blue-300" />
      {apiName !== "referred-branches" && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className="flex-1 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
        />
      )}
      {apiName === "sales-executives" && (
        <input
          placeholder="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-32 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
        />
      )}
      {apiName === "referred-branches" && (
        <input
          placeholder="Branch Name"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          className="w-32 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
        />
      )}
      {apiName === "sales-executives" && (
        <select
          value={branchName}
          onChange={(e) => {
            const selectedName = e.target.value;
            setBranchName(selectedName);
            const b = (branchesData || []).find((b: any) => b.branchName === selectedName);
            if (b) {
              setNetworkCode(b.networkCode || "");
            } else {
              setNetworkCode("");
            }
          }}
          className="w-32 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">-- Branch --</option>
          {(branchesData || []).map((b: any) => (
            <option key={b.id} value={b.branchName}>{b.branchName}</option>
          ))}
        </select>
      )}
      {(apiName === "referred-branches" || apiName === "sales-executives") && (
        <input
          placeholder="Network Code"
          value={networkCode}
          onChange={(e) => setNetworkCode(e.target.value)}
          readOnly={apiName === "sales-executives"}
          className={`w-32 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none ${apiName === "sales-executives" ? "bg-gray-50" : ""}`}
        />
      )}
      {apiName === "referred-branches" && (
        <>
          <input
            placeholder="Network Type"
            value={networkType}
            onChange={(e) => setNetworkType(e.target.value)}
            className="w-32 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
          />
          <input
            placeholder="Inventory Location"
            value={inventoryLocation}
            onChange={(e) => setInventoryLocation(e.target.value)}
            className="w-32 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
          />
        </>
      )}
      {apiName !== "referred-branches" && (
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          className="w-20 rounded-lg border border-[#2E75B6] px-3 py-1.5 text-sm focus:outline-none"
        />
      )}
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
