import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { Spinner } from "@/components/spinner";
import { RoadAnimation } from "@/components/road-animation";
import PostLoginLoader from "./post-login-loader";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPostLoader, setShowPostLoader] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // Show 3-second bike animation before going to dashboard
      setShowPostLoader(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || "Login failed. Please try again."
      );
      setLoading(false);
    }
  };

  if (showPostLoader) {
    return <PostLoginLoader onComplete={() => navigate({ to: "/" })} />;
  }

  return (
    <div className="relative flex min-h-screen font-sans">
      {/* Left — branded panel with animated background */}
      <div
        className="relative hidden w-[45%] flex-col items-center justify-center overflow-hidden lg:flex"
        style={{
          background: "linear-gradient(135deg, #1F3864 0%, #162B4D 50%, #1F3864 100%)",
        }}
      >
        {/* Animated decorative circles */}
        <div className="absolute -left-16 -top-16 h-64 w-64 animate-pulse rounded-full bg-[rgba(46,117,182,0.08)]" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[rgba(46,117,182,0.06)]" style={{ animation: "pulse 3s ease-in-out infinite" }} />
        <div className="absolute right-20 top-20 h-32 w-32 rounded-full bg-[rgba(232,121,47,0.06)]" style={{ animation: "pulse 4s ease-in-out infinite 1s" }} />
        <div className="absolute bottom-32 left-16 h-24 w-24 rounded-full bg-[rgba(232,121,47,0.08)]" />

        <div className="relative z-10 text-center">
          {/* Logo with glow */}
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#E8792F] text-4xl font-bold text-white shadow-[0_0_40px_rgba(232,121,47,0.3)]">
            BW
          </div>
          <h1 className="text-3xl font-bold text-white">Bigwing CRM</h1>
          <p className="mt-2 text-sm font-medium text-white/50">
            Honda Premium Dealership
          </p>
          <div className="mx-auto mt-1 h-[2px] w-12 rounded bg-[#E8792F]/50" />
          <p className="mt-3 text-xs text-white/30">Bangalore</p>

          {/* Feature highlights */}
          <div className="mt-12 space-y-3 text-left">
            {["Lead Management", "Sales Pipeline", "Reports & Analytics"].map(
              (feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-2.5"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8792F]/20">
                    <div className="h-2 w-2 rounded-full bg-[#E8792F]" />
                  </div>
                  <span className="text-[13px] font-medium text-white/70">
                    {feature}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex flex-1 items-center justify-center bg-white px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-[#E8792F] text-2xl font-bold text-white shadow-lg">
              BW
            </div>
            <h1 className="text-2xl font-bold text-[#1F3864]">Bigwing CRM</h1>
          </div>

          <div className="mb-1 flex items-center gap-2">
            <Shield size={20} className="text-[#2E75B6]" />
            <h2 className="text-xl font-bold text-[#1F3864]">Sign In</h2>
          </div>
          <p className="mb-6 text-sm text-gray-500">
            Enter your credentials to access the CRM
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-[#D4D9E0] bg-[#FAFBFC] px-3.5 py-3 text-sm transition-all focus:border-[#2E75B6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                placeholder="admin@bigwing.in"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#D4D9E0] bg-[#FAFBFC] px-3.5 py-3 pr-10 text-sm transition-all focus:border-[#2E75B6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[rgba(46,117,182,0.15)]"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-[#EB5757]">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EB5757] text-[8px] font-bold text-white">
                  !
                </div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2E75B6] px-4 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#245f96] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/50 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Spinner size={18} className="text-white" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-gray-300">
            Bigwing CRM v1.0 — Honda Premium Dealership
          </p>
        </div>
      </div>

      {/* Animated two-wheelers at the bottom */}
      <RoadAnimation />
    </div>
  );
}
