import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Bell,
  LogOut,
  FileSpreadsheet,
  BarChart3,
  Bike,
  ClipboardList,
  X,
  Menu,
  Kanban,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import api from "@/lib/api";
import { Avatar, Tooltip } from "@/components/ui";
import { GlobalSearch } from "@/components/global-search";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/leads", label: "Leads", icon: ClipboardList, search: { tab: "all" } },
  { to: "/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/customers", label: "Customers", icon: UserCircle },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/users", label: "Users", icon: Users },
  { to: "/import", label: "Import", icon: FileSpreadsheet },
  { to: "/vehicle-catalogue", label: "Catalogue", icon: Bike },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop collapsed state (persisted across reloads)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, []);

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () =>
      api.get("/notifications/unread-count").then((r) => r.data.data.count),
    refetchInterval: 30000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", "me", user?.id],
    queryFn: () => api.get("/profile/me").then((r) => r.data.data),
  });

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  // Build sidebar content. `isCollapsed` applies only on desktop; the mobile overlay always shows the full sidebar.
  const renderSidebar = (isCollapsed: boolean) => (
    <>
      <div className={`flex h-14 items-center border-b border-white/10 ${isCollapsed ? "justify-center" : "justify-between px-4"}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8792F] text-sm font-bold text-white">
                BW
              </div>
              <span className="text-[15px] font-semibold text-white">Bigwing CRM</span>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          </>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8792F] text-sm font-bold text-white">
            BW
          </div>
        )}
      </div>

      <nav className={`flex-1 space-y-0.5 overflow-y-auto ${isCollapsed ? "p-2" : "p-3"}`}>
        {navItems
          .filter((item) => {
            const isTele = user?.roles?.includes("TELE_CALLER");
            if (isTele) {
              return item.to !== "/users";
            }
            return true;
          })
          .map((item) =>
          isCollapsed ? (
            <Tooltip key={item.to} content={item.label} side="right">
              <Link
                to={item.to}
                search={(item as any).search}
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-[rgba(46,117,182,0.15)] hover:text-white [&.active]:bg-[rgba(232,121,47,0.15)] [&.active]:text-[#E8792F]"
              >
                <item.icon size={18} />
              </Link>
            </Tooltip>
          ) : (
            <Link
              key={item.to}
              to={item.to}
              search={(item as any).search}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-[rgba(46,117,182,0.15)] hover:text-white [&.active]:border-l-[3px] [&.active]:border-[#E8792F] [&.active]:bg-[rgba(232,121,47,0.15)] [&.active]:text-[#E8792F] [&.active]:font-semibold"
            >
              <item.icon size={18} className="shrink-0" />
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className={`border-t border-white/10 ${isCollapsed ? "p-2" : "p-3"}`}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Tooltip content={profile?.fullName ?? user?.email ?? "Profile"} side="right">
              <Link to="/profile" onClick={() => setMobileOpen(false)}>
                <Avatar
                  name={profile?.fullName ?? user?.email}
                  gender={profile?.gender}
                  url={profile?.avatarUrl}
                  size={32}
                />
              </Link>
            </Tooltip>
            <Tooltip content="Logout" side="right">
              <button
                onClick={handleLogout}
                className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link to="/profile" onClick={() => setMobileOpen(false)} className="shrink-0">
              <Avatar
                name={profile?.fullName ?? user?.email}
                gender={profile?.gender}
                url={profile?.avatarUrl}
                size={36}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.fullName ?? user?.email?.split("@")[0]}
              </p>
              <p className="truncate text-[11px] text-white/50">
                {user?.roles?.[0]?.replace(/_/g, " ")}
              </p>
            </div>
            <Tooltip content="Logout">
              <button
                onClick={handleLogout}
                className="rounded p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <LogOut size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen font-sans">
      {/* Desktop sidebar — collapsible */}
      <aside
        className={`hidden flex-col transition-[width] duration-300 ease-in-out lg:flex ${collapsed ? "w-[64px]" : "w-[260px]"}`}
        style={{ background: "#1F3864" }}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile sidebar overlay — always full width */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative flex h-full w-[260px] flex-col"
            style={{ background: "#1F3864" }}
          >
            {renderSidebar(false)}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#F5F7FA]">
        {/* Top header */}
        <header className="flex h-14 items-center justify-between border-b border-[#E8EBF0] bg-white px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-3 rounded p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Desktop sidebar toggle */}
          <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mr-3 hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:block"
            >
              {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </Tooltip>

          {/* Global search with keyboard navigation */}
          <GlobalSearch />

          {/* Mobile: show app name */}
          <span className="text-sm font-semibold text-[#1F3864] sm:hidden">
            Bigwing CRM
          </span>

          <div className="flex items-center gap-2">
            <Tooltip content="Notifications">
              <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                <Bell size={20} />
                {(unread ?? 0) > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#EB5757] text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
            </Tooltip>
            <Tooltip content="My profile">
              <Link to="/profile">
                <Avatar
                  name={profile?.fullName ?? user?.email}
                  gender={profile?.gender}
                  url={profile?.avatarUrl}
                  size={34}
                  className="ring-2 ring-transparent hover:ring-[#2E75B6]/30 transition-all cursor-pointer"
                />
              </Link>
            </Tooltip>
          </div>
        </header>

        {/* Page content — responsive padding */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
