import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, RotateCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Alert, Breadcrumb, ConfirmModal, StripedProgress } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { useBrandStore } from "@/stores/brand";

// The Truncate button is a dev-only maintenance/testing helper. It is shown
// exclusively for this account; the backend enforces the same check.
const SENIOR_DEVELOPER_EMAIL = "seniordeveloper@bigwing.in";

// The errors.xlsx route is auth-protected; a plain <a href> skips the Authorization
// header and gets a 401. Fetch via the axios client (which injects the Bearer token
// and handles 401→refresh) as a blob, then trigger a client-side download.
async function downloadErrorReport(batchId: number) {
  try {
    const res = await api.get(`/import/${batchId}/errors.xlsx`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `import-errors-${batchId}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    const msg =
      err?.response?.data?.error?.message ??
      err?.message ??
      "Failed to download error report";
    toast.error(msg);
  }
}

type Step = "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [batchId, setBatchId] = useState<number | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTruncate, setShowTruncate] = useState(false);
  const [truncateInput, setTruncateInput] = useState("");

  // Auto-restore active import on mount
  useEffect(() => {
    const checkActive = async () => {
      try {
        const res = await api.get("/import/active/status");
        const active = res.data.data;
        if (active) {
          setBatchId(active.id);
          if (active.status === "PROCESSING") {
            setStep("importing");
          } else if (active.status === "PENDING") {
             // If it's pending, we might want to show preview or just stay on upload
             // For now, let's just restore the batchId
          }
        }
      } catch (err) {
        console.error("Failed to check active import", err);
      }
    };
    checkActive();
  }, []);

  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isSeniorDeveloper = currentUser?.email === SENIOR_DEVELOPER_EMAIL;

  const truncateMut = useMutation({
    mutationFn: () => api.post("/admin/truncate", { confirm: "TRUNCATE" }),
    onSuccess: (res) => {
      const d = res.data.data.deleted;
      toast.success(
        `All data truncated — ${d.leads} leads, ${d.customers} customers, ${d.followups} follow-ups, ${d.batches} batches removed`,
        { duration: 6000 }
      );
      // Every list/detail view is now stale; blow away the query cache
      qc.clear();
      setShowTruncate(false);
      setTruncateInput("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || "Truncate failed");
    },
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const brand = useBrandStore.getState().brand;
      return api.post(`/import/upload?brand=${brand}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: (res) => {
      const data = res.data.data;
      setBatchId(data.batchId);
      toast.success(`File uploaded successfully`);
      previewMut.mutate(data.batchId);
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Upload failed"),
  });

  const previewMut = useMutation({
    mutationFn: (id: number) => api.post(`/import/${id}/preview`),
    onSuccess: (res) => {
      setPreview(res.data.data);
      setStep("preview");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || "Failed to preview file");
      setStep("upload");
    },
  });

  const commitMut = useMutation({
    mutationFn: (id: number) => api.post(`/import/${id}/commit`),
    onSuccess: () => {
      toast.success("Import started in background...");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || "Failed to start import");
      setStep("preview");
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => api.post(`/import/${id}/cancel`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["import-batch", batchId] });
      toast.success("Cancellation requested. Stopping import...");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || "Failed to cancel import");
    },
  });

  // Poll batch status during importing
  const { data: batchStatus } = useQuery({
    queryKey: ["import-batch", batchId],
    queryFn: () => api.get(`/import/${batchId}`).then((r) => r.data.data),
    enabled: step === "importing" && !!batchId,
    refetchInterval: (data: any) => {
      if (data?.status === "COMPLETED" || data?.status === "FAILED" || data?.status === "CANCELLED") return false;
      return 3000; // Poll every 3s
    },
  });

  // Sync state when batch completes/fails
  useEffect(() => {
    if (batchStatus?.status === "COMPLETED") {
      setResult({
        totalRows: batchStatus.totalRows,
        successRows: batchStatus.successRows,
        errorRows: batchStatus.errorRows,
        skippedRows: batchStatus.skippedRows,
      });
      setStep("done");
      toast.success("Import completed successfully!");
    } else if (batchStatus?.status === "FAILED") {
      setStep("preview");
      toast.error("Import failed in background. Check errors.");
    } else if (batchStatus?.status === "CANCELLED") {
      setStep("preview");
      toast.warn("Import was cancelled.");
    }
    
    if (batchStatus?.status === "PROCESSING" && batchStatus.totalRows > 0) {
      const processed = (batchStatus.successRows || 0) + (batchStatus.errorRows || 0) + (batchStatus.skippedRows || 0);
      setProgress(Math.round((processed / batchStatus.totalRows) * 100));
    }
  }, [batchStatus]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate(file);
  };

  const confirmImport = () => {
    setShowConfirm(false);
    setStep("importing");
    commitMut.mutate(batchId!);
  };

  const reset = () => {
    setStep("upload");
    setPreview(null);
    setResult(null);
    setBatchId(null);
    setProgress(0);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Data Import", icon: Upload }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1F3864]">Data Import</h1>
        {isSeniorDeveloper && (
          <button
            onClick={() => setShowTruncate(true)}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-[#EB5757] hover:bg-red-100 transition-colors"
            title="Dev-only: wipe all transactional data"
          >
            <Trash2 size={14} /> Truncate All Data
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center">
        {[
          { step: "upload", label: "Upload" },
          { step: "preview", label: "Preview" },
          { step: "importing", label: "Import" },
          { step: "done", label: "Complete" },
        ].map((s, i, arr) => {
          const stepIdx = ["upload", "preview", "importing", "done"].indexOf(step);
          const thisIdx = ["upload", "preview", "importing", "done"].indexOf(s.step);
          const completed = thisIdx < stepIdx;
          const current = thisIdx === stepIdx;
          return (
            <div key={s.step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    current ? "bg-[#2E75B6] text-white shadow-md" :
                    completed ? "bg-[#27AE60] text-white" :
                    "bg-gray-200 text-gray-400"
                  }`}
                >
                  {completed ? "✓" : i + 1}
                </div>
                <p className={`mt-1 text-[11px] font-medium uppercase tracking-wider ${current ? "text-[#2E75B6]" : completed ? "text-[#27AE60]" : "text-gray-400"}`}>{s.label}</p>
              </div>
              {i < arr.length - 1 && (
                <div className={`mx-2 h-[2px] flex-1 ${completed ? "bg-[#27AE60]" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Upload step */}
      {step === "upload" && (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 transition-colors hover:border-[#2E75B6]">
          <Upload size={48} className="mb-4 text-gray-300" />
          <p className="mb-2 text-lg font-semibold text-[#1F3864]">
            Upload Excel, CSV or XML file
          </p>
          <p className="mb-6 text-sm text-gray-400">
            Supports .xlsx, .xls, .csv, .xml — maximum 25 MB
          </p>
          <label className="cursor-pointer rounded-lg bg-[#2E75B6] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#245f96] hover:shadow-lg transition-all">
            {uploadMut.isPending ? "Uploading..." : "Choose File"}
            <input type="file" accept=".xlsx,.xls,.csv,.xml" onChange={handleFile} className="hidden" disabled={uploadMut.isPending} />
          </label>

          {uploadMut.isPending && (
            <div className="mt-6 w-full max-w-sm">
              <StripedProgress percent={50} label="Uploading file..." />
            </div>
          )}
        </div>
      )}

      {/* Preview step */}
      {step === "preview" && preview && (
        <div className="space-y-4">
          <Alert type={preview.errorRows > 0 ? "warning" : "success"}>
            <strong>{preview.validRows} valid rows</strong> ready to import.
            {preview.errorRows > 0 && <> {preview.errorRows} rows have errors and will be skipped.</>}
          </Alert>

          <div className="grid grid-cols-3 gap-4">
            <Stat icon={<FileSpreadsheet size={20} />} label="Total Rows" value={preview.totalRows} color="text-[#2E75B6]" />
            <Stat icon={<CheckCircle size={20} />} label="Valid" value={preview.validRows} color="text-[#27AE60]" />
            <Stat icon={<AlertCircle size={20} />} label="Errors" value={preview.errorRows} color="text-[#EB5757]" />
          </div>

          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-[#F8FAFC] uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Mobile</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.preview.map((r: any) => (
                  <tr key={r.rowNum} className={r.errors.length > 0 ? "bg-red-50" : ""}>
                    <td className="px-3 py-2 font-medium">{r.rowNum}</td>
                    <td className="px-3 py-2">{r.data.firstName} {r.data.lastName ?? ""}</td>
                    <td className="px-3 py-2">{r.data.mobile}</td>
                    <td className="px-3 py-2">{r.data.modelName ?? "—"}</td>
                    <td className="px-3 py-2">{r.data.stage}</td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0
                        ? <span className="text-[#EB5757] font-medium">{r.errors.map((e: any) => e.error).join(", ")}</span>
                        : <span className="text-[#27AE60] font-medium">✓ OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={preview.validRows === 0}
              className="rounded-lg bg-[#27AE60] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#219150] disabled:opacity-50"
            >
              Import {preview.validRows} Valid Rows
            </button>
          </div>
        </div>
      )}

      {/* Importing step — striped progress */}
      {step === "importing" && (
        <div className="rounded-xl bg-white p-10 shadow-sm ring-1 ring-black/5">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mx-auto">
            <RotateCw size={28} className="animate-spin text-[#2E75B6]" />
          </div>
          <h2 className="mb-1 text-xl font-bold text-[#1F3864]">Importing Data</h2>
          <p className="mb-4 text-sm text-gray-500">
            {batchStatus?.status === "PROCESSING" 
              ? `Processing row ${(batchStatus.successRows || 0) + (batchStatus.errorRows || 0) + (batchStatus.skippedRows || 0)} of ${batchStatus.totalRows}...`
              : "Preparing to import records..."
            }
          </p>
          <StripedProgress percent={Math.round(progress)} label={`${progress}% Complete`} />
          
          {batchStatus?.status === "PROCESSING" && (
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-gray-100 pt-6">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">Success</p>
                <p className="text-lg font-bold text-[#27AE60]">{batchStatus.successRows || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">Failed</p>
                <p className="text-lg font-bold text-[#EB5757]">{batchStatus.errorRows || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">Skipped</p>
                <p className="text-lg font-bold text-gray-600">{batchStatus.skippedRows || 0}</p>
              </div>
            </div>
          )}
          
          <div className="mt-4 rounded-lg bg-blue-50/50 p-3 text-[11px] text-[#1F3864]/70">
            <p><strong>Note:</strong> You can safely navigate away from this page. The import will continue in the background.</p>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to cancel this import? Already imported records will remain in the database.")) {
                cancelMut.mutate(batchId!);
              }
            }}
            disabled={cancelMut.isPending}
            className="mt-6 flex items-center justify-center gap-2 w-full rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-[#EB5757] hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {cancelMut.isPending ? "Cancelling..." : "Cancel Import"}
          </button>
          </div>
        </div>
      )}

      {/* Done step */}
      {step === "done" && result && (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <CheckCircle size={48} className="mx-auto mb-4 text-[#27AE60]" />
          <h2 className="mb-2 text-2xl font-bold text-[#1F3864]">Import Complete!</h2>

          <div className="mx-auto my-6 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs text-[#2E75B6]">Total</p>
              <p className="text-2xl font-bold text-[#2E75B6]">{result.totalRows}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-[#27AE60]">Imported</p>
              <p className="text-2xl font-bold text-[#27AE60]">{result.successRows}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs text-[#EB5757]">Errors</p>
              <p className="text-2xl font-bold text-[#EB5757]">{result.errorRows}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Download the error report to see missing or invalid details. Fields marked with 
            <span className="font-bold text-[#EB5757]"> * </span> are required. 
            Once fixed, you can re-upload the same file to complete the import.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            {result.errorRows > 0 && (
              <button
                type="button"
                onClick={() => downloadErrorReport(batchId!)}
                className="flex items-center gap-1.5 rounded-lg border border-[#EB5757] px-4 py-2 text-sm font-medium text-[#EB5757] hover:bg-red-50"
              >
                <Download size={14} /> Download Error Report
              </button>
            )}
            <button onClick={reset} className="rounded-lg bg-[#2E75B6] px-6 py-2 text-sm font-semibold text-white hover:bg-[#245f96]">
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        open={showConfirm}
        title="Confirm Import"
        message={`Are you sure you want to import ${preview?.validRows ?? 0} records into the database? This action cannot be undone.`}
        confirmLabel="Yes, Import"
        cancelLabel="Review Again"
        variant="warning"
        onConfirm={confirmImport}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Truncate confirmation — senior-developer only */}
      {showTruncate && isSeniorDeveloper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-[#EB5757]">
              <Trash2 size={20} />
              <h3 className="text-lg font-semibold">Truncate All Data</h3>
            </div>
            <p className="text-sm text-gray-600">
              This permanently deletes <strong>all</strong> leads, customers, follow-ups, stage
              history, quotations, bookings, invoices, deliveries, tasks, notifications, and
              import batches.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Users, roles, and lookup catalogs (models, variants, colours, sources, branches)
              are preserved so the app stays usable.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Type <span className="font-mono text-[#EB5757]">TRUNCATE</span> to confirm
            </p>
            <input
              autoFocus
              value={truncateInput}
              onChange={(e) => setTruncateInput(e.target.value)}
              placeholder="TRUNCATE"
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-[#EB5757] focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTruncate(false);
                  setTruncateInput("");
                }}
                disabled={truncateMut.isPending}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => truncateMut.mutate()}
                disabled={truncateInput !== "TRUNCATE" || truncateMut.isPending}
                className="rounded-lg bg-[#EB5757] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d14545] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {truncateMut.isPending ? "Truncating..." : "OK, Truncate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className={color}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
