import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users as UsersIcon, Shield, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatDate } from "@/lib/hooks";
import { Avatar, Badge, Breadcrumb, FlyingModal } from "@/components/ui";
import { DataTable, SummaryCard, Pagination, type Column } from "@/components/data-table";

export default function UserListPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
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
            <p className="text-[11px] text-gray-400">{u.email}</p>
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
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Users", icon: UsersIcon }]} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Users</h1>
          <p className="text-[12px] text-gray-400">Manage team members and their access</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
        >
          <Plus size={16} /> Add User
        </button>
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

      <FlyingModal open={showForm} onClose={() => setShowForm(false)} title="Create New User">
        <UserForm onSubmit={(d) => createMut.mutate(d)} loading={createMut.isPending} onCancel={() => setShowForm(false)} />
      </FlyingModal>
    </div>
  );
}

function UserForm({ onSubmit, loading, onCancel }: { onSubmit: (d: any) => void; loading: boolean; onCancel: () => void }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", mobile: "", gender: "MALE", role: "SALES_EXECUTIVE" });
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Full Name *</label>
        <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Email *</label>
        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Password *</label>
        <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Mobile</label>
          <input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none" />
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
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Role *</label>
        <select value={form.role} onChange={(e) => set("role", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none">
          {["ADMIN","MANAGER","SALES_EXECUTIVE","TELE_CALLER","SERVICE","VIEWER"].map(r => <option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#2E75B6] py-2 text-sm font-semibold text-white hover:bg-[#245f96] disabled:opacity-50">{loading ? "Creating..." : "Create User"}</button>
      </div>
    </form>
  );
}
