import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Pencil, Trash2, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import { formatDate, STAGE_COLORS } from "@/lib/hooks";
import api from "@/lib/api";
import { PageLoader } from "@/components/spinner";
import { ConfirmModal, Breadcrumb } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";

export default function CustomerDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Only SUPER_ADMIN and MANAGER can delete (matches backend RBAC)
  const canDelete = user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "MANAGER");

  const { data, isLoading } = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/customers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer deleted");
      navigate({ to: "/customers" });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || "Delete failed"),
  });

  if (isLoading) return <PageLoader message="Loading customer..." />;
  if (!data) return <p className="text-gray-400">Customer not found</p>;

  const c = data;
  const leadCount = c.leads?.length ?? 0;

  return (
    <div className="w-full">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Customers", to: "/customers", icon: UserCircle },
          { label: `${c.firstName} ${c.lastName ?? ""}`.trim() },
        ]}
      />

      <div className="mt-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F3864]">
            {c.firstName} {c.lastName ?? ""}
          </h1>
          <p className="text-gray-500">{c.mobile}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/customers/$id/edit"
            params={{ id: String(c.id) }}
            className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <Pencil size={14} /> Edit
          </Link>
          {canDelete && (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Lead History ({leadCount})</h2>
          {leadCount > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b text-xs font-bold uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Enquiry No</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {c.leads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to="/leads/$id"
                          params={{ id: String(l.id) }}
                          className="font-bold text-[#2E75B6] hover:underline"
                        >
                          {l.enquiryNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{l.model ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[l.stage] ?? ""}`}
                        >
                          {l.stage?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{l.source}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatDate(l.enquiryDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400 border rounded-lg">No lead history found.</p>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-lg font-bold">Details</h2>
          <div className="rounded-lg border p-5 space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Mobile Number</p>
              <p className="mt-1 font-medium">{c.mobile}</p>
            </div>
            {c.altMobile && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Alt Mobile</p>
                <p className="mt-1 font-medium">{c.altMobile}</p>
              </div>
            )}
            {c.email && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Email Address</p>
                <p className="mt-1 font-medium">{c.email}</p>
              </div>
            )}
            {c.location && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Location</p>
                <p className="mt-1 font-medium">{c.location}</p>
              </div>
            )}
            {c.customerType && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Customer Type</p>
                <p className="mt-1 font-medium">{c.customerType.replace(/_/g, " ")}</p>
              </div>
            )}
            {c.dob && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Date of Birth</p>
                <p className="mt-1 font-medium">{formatDate(c.dob)}</p>
              </div>
            )}
            {c.anniversary && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">Anniversary</p>
                <p className="mt-1 font-medium">{formatDate(c.anniversary)}</p>
              </div>
            )}
            <hr className="my-4" />
            <p className="text-[11px] text-gray-400">Created on {formatDate(c.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        open={showConfirmDelete}
        title="Delete Customer?"
        message={
          leadCount > 0
            ? `${c.firstName} ${c.lastName ?? ""} has ${leadCount} lead${leadCount === 1 ? "" : "s"}. The customer will be hidden from lists but the records are retained for audit (soft delete). Continue?`
            : `${c.firstName} ${c.lastName ?? ""} will be hidden from the customers list. This is a soft delete — the record is retained for audit. Continue?`
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  dark = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${dark ? "text-gray-400" : "text-blue-200/40"}`}>
        {label}
      </p>
      <div className={`mt-1 flex items-center gap-2 text-sm font-semibold ${dark ? "text-gray-700" : "text-white"}`}>
        {icon} {value}
      </div>
    </div>
  );
}
