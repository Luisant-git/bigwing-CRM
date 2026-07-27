import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users as UsersIcon, Shield, UserCheck, UserX, Edit3, Trash2, Power, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatDate } from "@/lib/hooks";
import { Avatar, Badge, Breadcrumb, FlyingModal } from "@/components/ui";
import { DataTable, SummaryCard, Pagination, type Column } from "@/components/data-table";

import { useAuthStore } from "@/stores/auth";
import { Navigate } from "@tanstack/react-router";

export default function UserListPage() {
  const user = useAuthStore((s) => s.user);
  const isTele = user?.roles?.includes("TELE_CALLER") || user?.roles?.includes("TELE_CALLER_TELE") || user?.roles?.includes("TELE_CALLER_META");

  if (isTele) {
    return <Navigate to="/" />;
  }

  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [statusUser, setStatusUser] = useState<any>(null);
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ["users", { page, pageSize, q: search }],
    queryFn: () => api.get("/users", { params: { page, pageSize, q: search || undefined } }).then((r) => r.data),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const activeCount = users.filter((u: any) => u.isActive).length;
  const inactiveCount = users.filter((u: any) => !u.isActive).length;
  const adminCount = users.filter((u: any) => u.roles?.includes("ADMIN") || u.roles?.includes("SUPER_ADMIN")).length;

  const createMut = useMutation({
    mutationFn: (body: any) => api.post("/users", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User created"); setShowForm(false); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: bigint; body: any }) => api.patch(`/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User updated"); setEditUser(null); setStatusUser(null); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: bigint) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("User deleted"); setDeleteUser(null); },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const columns: Column<any>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} gender={u.gender} url={u.avatarUrl} size={34} />
          <div>
            <p className="font-semibold text-gray-800">{u.fullName}</p>
            <p className="text-[11px] text-gray-400">@{u.username}</p>
          </div>
        </div>
      ),
      sortValue: (u) => u.fullName,
    },
    {
      key: "mobile",
      label: "Mobile",
      render: (u) => u.mobile ? (
        <span className="text-gray-700">{u.mobile}</span>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (u) => {
        const role = u.roles?.[0];
        const variant: any =
          role === "SUPER_ADMIN" ? "danger" :
          role === "ADMIN" ? "primary" :
          role === "MANAGER" ? "info" :
          role === "SALES_EXECUTIVE" ? "success" :
          role === "TELE_CALLER" ? "warning" : "default";
        return <Badge variant={variant} dot>{role?.replace(/_/g, " ")}</Badge>;
      },
      sortValue: (u) => u.roles?.[0] ?? "",
    },
    {
      key: "brand",
      label: "Brand",
      sortable: true,
      render: (u) => {
        const brand = u.brandAccess;
        const variant: any =
          brand === "BIGWING" ? "primary" :
          brand === "REDWING" ? "danger" : "default";
        return <Badge variant={variant}>{brand}</Badge>;
      },
      sortValue: (u) => u.brandAccess ?? "",
    },
    {
      key: "status",
      label: "Status",
      render: (u) => (
        <Badge variant={u.isActive ? "success" : "danger"} dot>
          {u.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      label: "Last Login",
      sortable: true,
      render: (u) => <span className="text-gray-500">{formatDate(u.lastLogin)}</span>,
      sortValue: (u) => u.lastLogin ?? "",
    },
    {
      key: "action",
      label: "Actions",
      render: (u) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setEditUser(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
            <Edit3 size={16} />
          </button>
          <button onClick={() => setStatusUser(u)} className={`p-1.5 rounded ${u.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} title={u.isActive ? "Deactivate" : "Activate"}>
            <Power size={16} />
          </button>
          <button onClick={() => setDeleteUser(u)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Users", icon: UsersIcon }]} />

      <div className="mb-5 flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F3864] truncate">Users</h1>
          <p className="text-[11px] sm:text-[12px] text-gray-400 line-clamp-1 sm:line-clamp-none">
            Manage team members and their access
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-[#245f96] hover:to-[#1a4472]"
          >
            <Plus size={16} /> <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total Users" value={users.length} icon={UsersIcon} color="#2E75B6" />
        <SummaryCard label="Active" value={activeCount} icon={UserCheck} color="#27AE60" />
        <SummaryCard label="Inactive" value={inactiveCount} icon={UserX} color="#EB5757" />
        <SummaryCard label="Admins" value={adminCount} icon={Shield} color="#9B59B6" />
      </div>

      <div className="mb-4 flex justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u.id}
        loading={isLoading}
        emptyIcon={UsersIcon}
        emptyMessage="No users found"
        footer={meta && meta.total > 0 && (
          <Pagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        )}
      />

      <FlyingModal open={showForm || !!editUser} onClose={() => { setShowForm(false); setEditUser(null); }} title={editUser ? "Edit User" : "Create New User"}>
        <UserForm 
          initialData={editUser}
          onSubmit={(d) => editUser ? updateMut.mutate({ id: editUser.id, body: d }) : createMut.mutate(d)} 
          loading={createMut.isPending || updateMut.isPending} 
          onCancel={() => { setShowForm(false); setEditUser(null); }} 
          canEditBrandAccess={user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("ADMIN") ?? false} 
        />
      </FlyingModal>

      <ConfirmModal
        open={!!deleteUser}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUser?.fullName}? This action cannot be undone.`}
        onConfirm={() => deleteUser && deleteMut.mutate(deleteUser.id)}
        onClose={() => setDeleteUser(null)}
        loading={deleteMut.isPending}
        confirmText="Delete"
      />

      <ConfirmModal
        open={!!statusUser}
        title={statusUser?.isActive ? "Deactivate User" : "Activate User"}
        description={`Are you sure you want to ${statusUser?.isActive ? "deactivate" : "activate"} ${statusUser?.fullName}?`}
        onConfirm={() => statusUser && updateMut.mutate({ id: statusUser.id, body: { isActive: !statusUser.isActive } })}
        onClose={() => setStatusUser(null)}
        loading={updateMut.isPending}
        confirmText={statusUser?.isActive ? "Deactivate" : "Activate"}
        confirmStyle={statusUser?.isActive ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"}
      />
    </div>
  );
}

function UserForm({ initialData, onSubmit, loading, onCancel, canEditBrandAccess }: { initialData?: any; onSubmit: (d: any) => void; loading: boolean; onCancel: () => void; canEditBrandAccess: boolean }) {
  const [form, setForm] = useState({ 
    username: initialData?.username || "", 
    email: initialData?.email || "", 
    password: "", 
    fullName: initialData?.fullName || "", 
    mobile: initialData?.mobile || "", 
    gender: initialData?.gender || "MALE", 
    role: initialData?.roles?.[0] || "TELE_CALLER", 
    branchId: initialData?.branchId?.toString() || "", 
    brandAccess: initialData?.brandAccess || "BOTH" 
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        username: initialData.username || "",
        email: initialData.email || "",
        password: "",
        fullName: initialData.fullName || "",
        mobile: initialData.mobile || "",
        gender: initialData.gender || "MALE",
        role: initialData.roles?.[0] || "TELE_CALLER",
        branchId: initialData.branchId?.toString() || "",
        brandAccess: initialData.brandAccess || "BOTH"
      });
    } else {
      setForm({
        username: "", email: "", password: "", fullName: "", mobile: "", gender: "MALE", role: "TELE_CALLER", branchId: "", brandAccess: "BOTH"
      });
    }
  }, [initialData]);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const [showPassword, setShowPassword] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ["lookups", "referred-branches", { includeInactive: false }],
    queryFn: () => api.get("/lookups/referred-branches").then((r) => r.data.data),
  });

  return (
    <form onSubmit={(e) => { 
      e.preventDefault();
      if (!/^[0-9]{10}$/.test(form.mobile)) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }
      onSubmit({
        ...form,
        username: form.username.trim(),
        password: form.password ? form.password.trim() : undefined,
        email: form.email ? form.email.trim() : undefined,
        gender: form.gender,
        branchId: form.role !== "ADMIN" && form.branchId ? Number(form.branchId) : null,
      }); 
    }} className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Full Name *</label>
        <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Username *</label>
        <input value={form.username} onChange={(e) => set("username", e.target.value)} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
      </div>
      {/* <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Email</label>
        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
      </div> */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Password {initialData ? "(Leave blank to keep current)" : "*"}</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} required={!initialData} minLength={8} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none pr-10" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none" tabIndex={-1} title={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Mobile *</label>
          <input value={form.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ''))} required maxLength={10} pattern="[0-9]{10}" title="Please enter a valid 10-digit mobile number" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Gender</label>
          <select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none">
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role *</label>
          <select value={form.role} onChange={(e) => set("role", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none">
            {["ADMIN","MANAGER","TELE_CALLER", "TELE_CALLER_TELE", "TELE_CALLER_META", "SERVICE","VIEWER"].map(r => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
          </select>
        </div>
        {canEditBrandAccess && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Brand Access *</label>
            <select value={form.brandAccess} onChange={(e) => {
              setForm(p => ({ ...p, brandAccess: e.target.value, branchId: "" }));
            }} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none">
              <option value="BOTH">Both (Bigwing & Redwing)</option>
              <option value="BIGWING">Bigwing Only</option>
              <option value="REDWING">Redwing Only</option>
            </select>
          </div>
        )}
      </div>
      {form.role !== "ADMIN" && (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Branch</label>
          <select value={form.branchId} onChange={(e) => set("branchId", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none">
            <option value="">-- None --</option>
            {(branches ?? [])
              .filter((b: any) => form.brandAccess === "BOTH" || b.brand === form.brandAccess)
              .map((b: any) => (
                <option key={b.id} value={b.id}>{b.branchName || b.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#2E75B6] py-2 text-sm font-semibold text-white hover:bg-[#245f96] disabled:opacity-50">{loading ? "Saving..." : "Save User"}</button>
      </div>
    </form>
  );
}

function ConfirmModal({ open, title, description, onConfirm, onClose, loading, confirmText = "Confirm", confirmStyle = "bg-red-600 hover:bg-red-700" }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-500">{description}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${confirmStyle}`}>{loading ? "..." : confirmText}</button>
        </div>
      </div>
    </div>
  );
}
