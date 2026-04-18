import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plus, Search, UserCircle, Users,
  TrendingUp, Repeat, Building2,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/hooks";
import { Breadcrumb } from "@/components/ui";
import { DataTable, SummaryCard, Pagination, type Column } from "@/components/data-table";

export default function CustomerListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { page, pageSize, q: search }],
    queryFn: () =>
      api.get("/customers", { params: { page, pageSize, q: search || undefined } }).then((r) => r.data),
  });

  const customers = data?.data ?? [];
  const meta = data?.meta;

  // Quick counts from current page
  const firstTime = customers.filter((c: any) => c.customerType === "FIRST_TIME").length;
  const repeat = customers.filter((c: any) => c.customerType === "REPEAT").length;
  const institutional = customers.filter((c: any) => c.customerType === "INSTITUTIONAL").length;

  const columns: Column<any>[] = [
    {
      key: "name",
      label: "Customer",
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1F3864] to-[#2E75B6] text-[11px] font-bold text-white">
            {c.firstName?.[0]}{c.lastName?.[0] ?? ""}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{c.firstName} {c.lastName ?? ""}</p>
            {c.customerType && (
              <p className="text-[11px] text-gray-400">{c.customerType.replace(/_/g, " ")}</p>
            )}
          </div>
        </div>
      ),
      sortValue: (c) => `${c.firstName} ${c.lastName}`,
    },
    {
      key: "mobile",
      label: "Mobile",
      sortable: true,
      render: (c) => (
        <span className="font-medium text-gray-700">{c.mobile}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (c) => c.email ? (
        <span className="text-gray-600">{c.email}</span>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      render: (c) => c.location ? (
        <span className="text-gray-600">{c.location}</span>
      ) : <span className="text-gray-300">—</span>,
      sortValue: (c) => c.location ?? "",
    },
    {
      key: "type",
      label: "Type",
      render: (c) => {
        if (!c.customerType) return <span className="text-gray-300">—</span>;
        const color =
          c.customerType === "FIRST_TIME" ? "bg-blue-100 text-blue-700" :
          c.customerType === "REPEAT" ? "bg-green-100 text-green-700" :
          "bg-purple-100 text-purple-700";
        return (
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${color}`}>
            {c.customerType.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (c) => <span className="text-gray-500">{formatDate(c.createdAt)}</span>,
      sortValue: (c) => c.createdAt,
    },
  ];

  return (
    <div>
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Customers", icon: UserCircle }]} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">Customers</h1>
          <p className="text-[12px] text-gray-400">Master list of all customers</p>
        </div>
        <Link
          to="/customers/new"
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2E75B6] to-[#245f96] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
        >
          <Plus size={16} /> New Customer
        </Link>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total" value={meta?.total ?? "—"} icon={Users} color="#2E75B6" />
        <SummaryCard label="First Time" value={firstTime} icon={TrendingUp} color="#3B82F6" />
        <SummaryCard label="Repeat" value={repeat} icon={Repeat} color="#27AE60" />
        <SummaryCard label="Institutional" value={institutional} icon={Building2} color="#9B59B6" />
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-72 rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(c) => c.id}
        loading={isLoading}
        emptyIcon={UserCircle}
        emptyMessage="No customers yet — click 'New Customer' to create one"
        onRowClick={(c) => navigate({ to: "/customers/$id", params: { id: String(c.id) } })}
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
    </div>
  );
}
