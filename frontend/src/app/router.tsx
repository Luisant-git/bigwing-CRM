import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from "@tanstack/react-router";
import AppLayout from "./layout";
import LoginPage from "@/features/auth/login-page";
import DashboardPage from "@/features/dashboard/dashboard-page";
import LeadListPage from "@/features/leads/lead-list-page";
import LeadDetailPage from "@/features/leads/lead-detail-page";
import LeadFormPage from "@/features/leads/lead-form-page";
import CustomerListPage from "@/features/customers/customer-list-page";
import CustomerDetailPage from "@/features/customers/customer-detail-page";
import CustomerFormPage from "@/features/customers/customer-form-page";
import ReportsPage from "@/features/reports/reports-page";
import UserListPage from "@/features/users/user-list-page";
import ImportPage from "@/features/imports/import-page";
import CataloguePage from "@/features/vehicle-catalogue/catalogue-page";
import LeadEditPage from "@/features/leads/lead-edit-page";
import CustomerEditPage from "@/features/customers/customer-edit-page";
import PipelineBoardPage from "@/features/leads/pipeline-board-page";
import SettingsPage from "@/features/settings/settings-page";
import NotFoundPage from "@/features/errors/not-found-page";
import ProfilePage from "@/features/profile/profile-page";

// ─── Root ──────────────────────────────────────────────────────
const rootRoute = createRootRoute();

function requireAuth() {
  const token = localStorage.getItem("accessToken");
  if (!token) throw redirect({ to: "/login" });
}

// ─── Public ────────────────────────────────────────────────────
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

// ─── Authenticated shell ───────────────────────────────────────
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AppLayout,
  beforeLoad: requireAuth,
});

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: DashboardPage,
});

// Leads
const leadsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/leads",
  component: LeadListPage,
});

const leadNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/leads/new",
  component: LeadFormPage,
});

const leadDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/leads/$id",
  component: LeadDetailPage,
});

const leadEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/leads/$id/edit",
  component: LeadEditPage,
});

// Customers
const customersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/customers",
  component: CustomerListPage,
});

const customerNewRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/customers/new",
  component: CustomerFormPage,
});

const customerDetailRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/customers/$id",
  component: CustomerDetailPage,
});

const customerEditRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/customers/$id/edit",
  component: CustomerEditPage,
});

// Reports, Users, Import, Catalogue
const reportsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/reports",
  component: ReportsPage,
});

const usersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/users",
  component: UserListPage,
});

const importRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/import",
  component: ImportPage,
});

const catalogueRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/vehicle-catalogue",
  component: CataloguePage,
});

const pipelineRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/pipeline",
  component: PipelineBoardPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/profile",
  component: ProfilePage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/$",
  component: NotFoundPage,
});

// ─── Build tree ────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    leadsRoute,
    leadNewRoute,
    leadDetailRoute,
    leadEditRoute,
    customersRoute,
    customerNewRoute,
    customerDetailRoute,
    customerEditRoute,
    reportsRoute,
    usersRoute,
    importRoute,
    catalogueRoute,
    pipelineRoute,
    settingsRoute,
    profileRoute,
    notFoundRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
