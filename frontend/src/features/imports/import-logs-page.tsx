import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Download } from "lucide-react";
import api from "@/lib/api";
import { Breadcrumb } from "@/components/ui";
import { useBrandStore } from "@/stores/brand";

async function triggerBlobDownload(url: string, filename: string) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default function ImportLogsPage() {
  const { brand } = useBrandStore();
  const { data: history } = useQuery({
    queryKey: ["import-history", brand],
    queryFn: () => api.get("/import").then((r) => r.data.data),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Import Logs", icon: FileSpreadsheet }]} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1F3864]">Import Logs</h1>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-[#F8FAFC] text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Report Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Imported</th>
                <th className="px-4 py-3 text-right">Skipped</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history?.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {b.fileName}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      b.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      b.status === "FAILED" ? "bg-red-100 text-red-700" :
                      b.status === "CANCELLED" ? "bg-gray-100 text-gray-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#27AE60]">
                    {b.successRows ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-500">
                    {b.skippedRows ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#EB5757]">
                    {b.errorRows ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => triggerBlobDownload(`/import/${b.id}/file`, b.fileName)}
                      className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                    >
                      <Download size={12} /> Download
                    </button>
                  </td>
                </tr>
              ))}
              {!history?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                    No imports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
