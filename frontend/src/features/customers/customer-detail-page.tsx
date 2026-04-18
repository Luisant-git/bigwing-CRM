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
    <div className="mx-auto max-w-4xl">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Customers", to: "/customers", icon: UserCircle },
          { label: `${c.firstName} ${c.lastName ?? ""}`.trim() },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/customers" className="rounded-lg p-1.5 hover:bg-gray-200">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#1F3864]">
              {c.firstName} {c.lastName ?? ""}
            </h1>
            <p className="text-sm text-gray-500">{c.mobile}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/customers/$id/edit"
            params={{ id: String(c.id) }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            <Pencil size={14} /> Edit
          </Link>
          {canDelete && (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-[#EB5757] hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          {/* Lead history */}
          <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
            <h2 className="mb-4 font-semibold">
              Lead History ({leadCount})
            </h2>
            {leadCount > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="pb-2">Enquiry No</th>
                    <th className="pb-2">Model</th>
                    <th className="pb-2">Stage</th>
                    <th className="pb-2">Source</th>
                    <th className="pb-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {c.leads.map((l: any) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="py-2">
                        <Link
                          to="/leads/$id"
                          params={{ id: String(l.id) }}
                          className="font-medium text-[#2E75B6] hover:underline"
                        >
                          {l.enquiryNo}
                        </Link>
                      </td>
                      <td className="py-2">{l.model ?? "—"}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[l.stage] ?? ""}`}
                        >
                          {l.stage?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">{l.source}</td>
                      <td className="py-2 text-gray-500">
                        {formatDate(l.enquiryDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No leads for this customer</p>
            )}
          </div>
        </div>

        {/* Customer details */}
        <div className="rounded-xl bg-white p-5 ring-1 ring-gray-200">
          <h2 className="mb-4 font-semibold">Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={14} /> {c.mobile}
            </div>
            {c.altMobile && (
              <div className="flex items-center gap-2 text-gray-500">
                <Phone size={14} /> {c.altMobile} (alt)
              </div>
            )}
            {c.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} /> {c.email}
              </div>
            )}
            {c.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={14} /> {c.location}
              </div>
            )}
            {c.customerType && (
              <p className="text-gray-500">
                Type: {c.customerType.replace(/_/g, " ")}
              </p>
            )}
            {c.dob && (
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={14} /> DOB: {formatDate(c.dob)}
              </div>
            )}
            {c.anniversary && (
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar size={14} /> Anniversary: {formatDate(c.anniversary)}
              </div>
            )}
            {c.accountName && <p className="text-gray-500">Account: {c.accountName}</p>}
            <hr />
            <p className="text-xs text-gray-400">Created {formatDate(c.createdAt)}</p>
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
