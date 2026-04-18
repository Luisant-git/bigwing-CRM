import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, User, Mail, Phone, Shield, Save, Lock, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Avatar, Alert, Breadcrumb, Tooltip } from "@/components/ui";
import { PageLoader } from "@/components/spinner";
import { formatDate } from "@/lib/hooks";

export default function ProfilePage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => api.get("/profile/me").then((r) => r.data.data),
  });

  const [form, setForm] = useState({ fullName: "", mobile: "", gender: "" });

  useEffect(() => {
    if (me) {
      setForm({
        fullName: me.fullName ?? "",
        mobile: me.mobile ?? "",
        gender: me.gender ?? "",
      });
    }
  }, [me]);

  const updateMut = useMutation({
    mutationFn: (body: any) => api.patch("/profile/me", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("avatar", file);
      return api.post("/profile/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile picture updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Upload failed"),
  });

  const passwordMut = useMutation({
    mutationFn: (body: any) => api.post("/profile/me/password", body),
    onSuccess: () => toast.success("Password changed successfully"),
    onError: (err: any) => toast.error(err.response?.data?.error?.message || "Failed"),
  });

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large (max 2 MB)");
      return;
    }
    uploadMut.mutate(file);
  };

  if (isLoading) return <PageLoader message="Loading profile..." />;

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "My Profile", icon: User }]} />

      <h1 className="mb-6 text-2xl font-bold text-[#1F3864]">My Profile</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Avatar card */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar
                name={me?.fullName}
                gender={me?.gender}
                url={me?.avatarUrl}
                size={120}
                className="shadow-lg"
              />
              <Tooltip content="Change picture">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#2E75B6] text-white shadow-lg hover:bg-[#245f96]"
                >
                  <Camera size={18} />
                </button>
              </Tooltip>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>

            <h2 className="mt-4 text-lg font-bold text-[#1F3864]">{me?.fullName}</h2>
            <p className="text-sm text-gray-500">{me?.email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1F3864] px-3 py-0.5 text-[11px] font-semibold text-white">
              <Shield size={11} /> {me?.roles?.[0]}
            </span>

            {uploadMut.isPending && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#2E75B6]">
                <Upload size={12} className="animate-pulse" /> Uploading...
              </p>
            )}

            <div className="mt-6 w-full space-y-2 text-left text-[12px] text-gray-500">
              <div className="flex items-center gap-2">
                <Mail size={13} /> {me?.email}
              </div>
              {me?.mobile && (
                <div className="flex items-center gap-2">
                  <Phone size={13} /> {me.mobile}
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px]">
                Member since {formatDate(me?.createdAt)}
              </div>
              {me?.lastLogin && (
                <div className="flex items-center gap-2 text-[11px]">
                  Last login {formatDate(me.lastLogin)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="mb-4 text-[15px] font-semibold text-[#1F3864]">Personal Information</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const body: any = {};
                if (form.fullName) body.fullName = form.fullName;
                if (form.mobile) body.mobile = form.mobile;
                if (form.gender) body.gender = form.gender;
                updateMut.mutate(body);
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Full Name</label>
                <input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.1)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Mobile</label>
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    placeholder="10-digit"
                    className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                    className="w-full rounded-lg border border-[#D4D9E0] px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={updateMut.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[#2E75B6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#245f96] disabled:opacity-50"
              >
                <Save size={14} /> {updateMut.isPending ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-[#1F3864]">
              <Lock size={16} /> Change Password
            </h3>
            <Alert type="info">
              For your security, you'll need to enter your current password to set a new one.
            </Alert>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                passwordMut.mutate(pwForm, {
                  onSuccess: () => setPwForm({ currentPassword: "", newPassword: "" }),
                });
              }}
              className="mt-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  required
                  className="rounded-lg border border-[#D4D9E0] px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="rounded-lg border border-[#D4D9E0] px-3 py-2.5 text-sm focus:border-[#2E75B6] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={passwordMut.isPending}
                className="rounded-lg bg-[#1F3864] px-5 py-2 text-sm font-semibold text-white hover:bg-[#162B4D] disabled:opacity-50"
              >
                {passwordMut.isPending ? "Updating..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
