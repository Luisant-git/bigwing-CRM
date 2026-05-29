import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FileSpreadsheet,
  Bike,
  ClipboardList,
  Settings,
  Megaphone,
  Kanban,
  BarChart3,
  Rocket
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";

const menuItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, description: "Overview of your CRM performance and key metrics", accent: "#2E75B6", bg: "bg-blue-50" },
  { to: "/leads", search: { tab: "all" }, label: "Leads", icon: ClipboardList, description: "Manage, track, and follow up with all incoming enquiries", accent: "#6366F1", bg: "bg-indigo-50" },
  { to: "/meta-leads", label: "Meta Leads", icon: Megaphone, description: "Dedicated inbox for Facebook and Instagram campaign leads", accent: "#EC4899", bg: "bg-pink-50" },
  { to: "/pipeline", label: "Pipeline", icon: Kanban, description: "Visual drag-and-drop board for lead stages and progress", accent: "#9B59B6", bg: "bg-purple-50" },
  { to: "/customers", label: "Customers", icon: UserCircle, description: "Comprehensive customer database and purchase history", accent: "#0D9488", bg: "bg-teal-50" },
  { to: "/users", label: "Users", icon: Users, description: "Manage CRM staff, telecallers, executives and their roles", accent: "#F2994A", bg: "bg-orange-50", adminOnly: true },
  { to: "/import", label: "Import", icon: FileSpreadsheet, description: "Bulk upload leads and enquiries from Excel or CSV files", accent: "#27AE60", bg: "bg-green-50", adminOnly: true },
  { to: "/vehicle-catalogue", label: "Catalogue", icon: Bike, description: "Manage vehicle models, variants, and available colors", accent: "#EF4444", bg: "bg-red-50" },
  { to: "/settings", label: "Settings", icon: Settings, description: "Configure system preferences and dropdown lookups", accent: "#6C757D", bg: "bg-gray-50", adminOnly: true },
];

export default function QuickStartPage() {
  const { user } = useAuthStore();
  const isTele = user?.roles?.includes("TELE_CALLER");

  const visibleItems = menuItems.filter(item => {
    if (isTele && item.adminOnly) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[#2E75B6]/10 text-[#2E75B6] mt-0.5 sm:mt-0">
          <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F3864] leading-tight">Quick Start</h1>
          <p className="mt-1 text-sm sm:text-base text-gray-500 leading-snug">Welcome to the CRM! Choose a module below to get started.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            search={item.search}
            className={`group relative flex flex-col overflow-hidden rounded-2xl ${item.bg} p-6 shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-md`}
          >
            {/* Accent bar */}
            <div
              className="absolute left-0 top-0 h-full w-1.5"
              style={{ backgroundColor: item.accent }}
            />
            
            <div className="flex items-start justify-between">
              <div className="pr-4">
                <h3 className="mb-1 text-lg font-bold text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
              </div>
              
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${item.accent}20`, color: item.accent }}
              >
                <item.icon size={24} />
              </div>
            </div>
            
            <div className="mt-6 flex items-center text-sm font-semibold opacity-0 transition-opacity group-hover:opacity-100" style={{ color: item.accent }}>
              Open Module <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
