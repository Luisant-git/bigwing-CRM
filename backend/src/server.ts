import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, logger } from "./config/index.js";
import { requestIdMiddleware, errorHandler } from "./middlewares/index.js";
import { authRoutes } from "./modules/auth/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { lookupRoutes } from "./modules/lookups/routes.js";
import { customerRoutes } from "./modules/customers/routes.js";
import { leadRoutes } from "./modules/leads/routes.js";
import { vehicleCatalogueRoutes } from "./modules/vehicle-catalogue/routes.js";
import { importRoutes } from "./modules/imports/routes.js";
import { reportRoutes } from "./modules/reports/routes.js";
import { searchRoutes } from "./modules/search/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { notificationRoutes } from "./modules/notifications/routes.js";
import { taskRoutes } from "./modules/tasks/routes.js";
import { profileRoutes } from "./modules/profile/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";

const app = express();

// ─── Global middleware ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(","),
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(requestIdMiddleware);
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests" },
    },
  })
);

// ─── Health check ───────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API routes ─────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/lookups", lookupRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/vehicle-catalogue", vehicleCatalogueRoutes);
app.use("/api/v1/import", importRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);

// Serve uploaded files (avatars)
app.use("/uploads", express.static("uploads"));

// ─── Scalar API documentation ───────────────────────────────────
app.get("/api/docs/openapi.json", (_req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: "Bigwing CRM API",
      version: "0.1.0",
      description: "REST API for Bigwing Honda two-wheeler premium dealership CRM",
    },
    servers: [
      { url: `http://localhost:${env.PORT}`, description: "Development" },
    ],
    paths: {
      "/api/v1/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          description: "Authenticate with email and password, returns JWT + refresh token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "admin@bigwing.in" },
                    password: { type: "string", minLength: 8, example: "BigWing@2026" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Login successful — returns accessToken, refreshToken, user" },
            "401": { description: "Invalid credentials" },
          },
        },
      },
      "/api/v1/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh token",
          description: "Exchange a refresh token for a new JWT + refresh token pair",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "New token pair" }, "401": { description: "Invalid refresh token" } },
        },
      },
      "/api/v1/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout",
          description: "Revoke the refresh token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: { refreshToken: { type: "string" } },
                },
              },
            },
          },
          responses: { "200": { description: "Logged out" } },
        },
      },
      "/api/v1/users": {
        get: {
          tags: ["Users"],
          summary: "List users",
          description: "Paginated user list (Admin+ only)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search by name or email" },
          ],
          responses: { "200": { description: "User list with pagination meta" }, "403": { description: "Forbidden" } },
        },
        post: {
          tags: ["Users"],
          summary: "Create user",
          description: "Create a new user with role assignment (Admin+ only)",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "fullName", "role"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    fullName: { type: "string" },
                    mobile: { type: "string", pattern: "^[6-9]\\d{9}$" },
                    role: { type: "string", enum: ["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"] },
                    isActive: { type: "boolean", default: true },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "User created" }, "409": { description: "Email already exists" } },
        },
      },
      "/api/v1/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get user by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "User details" }, "404": { description: "Not found" } },
        },
        patch: {
          tags: ["Users"],
          summary: "Update user",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    fullName: { type: "string" },
                    mobile: { type: "string" },
                    role: { type: "string" },
                    isActive: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "User updated" } },
        },
      },
      // ─── Lookups ────────────────────────────────────────────────
      "/api/v1/lookups/{name}": {
        get: {
          tags: ["Lookups"],
          summary: "Get lookup items",
          description: "Returns active items sorted by display_order ASC, name ASC. No auth required.",
          parameters: [
            { name: "name", in: "path", required: true, schema: { type: "string", enum: ["enquiry-sources", "enquiry-types", "interest-levels", "closure-reasons", "vehicle-models", "vehicle-variants", "vehicle-colours", "referred-branches"] } },
            { name: "modelId", in: "query", schema: { type: "integer" }, description: "Filter variants by model (vehicle-variants only)" },
          ],
          responses: { "200": { description: "List of lookup items" }, "404": { description: "Unknown lookup name" } },
        },
      },
      // ─── Customers ──────────────────────────────────────────────
      "/api/v1/customers": {
        get: {
          tags: ["Customers"],
          summary: "List customers",
          description: "Paginated list with search on name/mobile",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25, maximum: 200 } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search by name or mobile" },
          ],
          responses: { "200": { description: "Customer list with pagination meta" } },
        },
        post: {
          tags: ["Customers"],
          summary: "Create customer",
          description: "Create a new customer. firstName is auto-uppercased, mobile is normalized (strips +91).",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstName", "mobile"],
                  properties: {
                    firstName: { type: "string", maxLength: 80 },
                    lastName: { type: "string", maxLength: 80 },
                    mobile: { type: "string", pattern: "^[6-9]\\d{9}$" },
                    altMobile: { type: "string" },
                    email: { type: "string", format: "email" },
                    dob: { type: "string", format: "date" },
                    anniversary: { type: "string", format: "date" },
                    location: { type: "string", maxLength: 120 },
                    customerType: { type: "string", enum: ["FIRST_TIME", "REPEAT", "INSTITUTIONAL"] },
                    accountType: { type: "string" },
                    accountName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Customer created" }, "409": { description: "Mobile already exists" } },
        },
      },
      "/api/v1/customers/{id}": {
        get: {
          tags: ["Customers"],
          summary: "Get customer by ID",
          description: "Customer detail with lead history",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Customer details with leads" }, "404": { description: "Not found" } },
        },
        patch: {
          tags: ["Customers"],
          summary: "Update customer",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    mobile: { type: "string" },
                    email: { type: "string" },
                    location: { type: "string" },
                    customerType: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Customer updated" }, "404": { description: "Not found" } },
        },
      },
      // ─── Leads ──────────────────────────────────────────────────
      "/api/v1/leads": {
        get: {
          tags: ["Leads"],
          summary: "List leads",
          description: "Paginated list with filters: stage, channel, interestLevel, assignedTo, sourceId, modelId, dateFrom, dateTo, referredFromBranch, q",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25, maximum: 200 } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Search by enquiryNo, customer name, or mobile" },
            { name: "stage", in: "query", schema: { type: "string", enum: ["NOT_CONTACTED", "CONTACTED", "NOT_REACHABLE", "TEST_RIDE_SCHEDULED", "TEST_RIDE_COMPLETED", "QUOTATION_SHARED", "BOOKED", "INVOICED", "DELIVERED_CLOSED", "LOST"] } },
            { name: "channel", in: "query", schema: { type: "string", enum: ["TELE", "WALKIN", "DIGITAL", "SOCIAL", "REFERENCE", "WEBSITE", "SERVICE"] } },
            { name: "interestLevel", in: "query", schema: { type: "string", enum: ["HOT", "WARM", "COLD"] } },
            { name: "assignedTo", in: "query", schema: { type: "integer" } },
            { name: "sourceId", in: "query", schema: { type: "integer" } },
            { name: "modelId", in: "query", schema: { type: "integer" } },
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
            { name: "referredFromBranch", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Lead list with pagination meta" } },
        },
        post: {
          tags: ["Leads"],
          summary: "Create lead",
          description: "Create a lead with optional inline customer creation. Auto-generates enquiry_no as BW-YYYYMM-NNNNN.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["channel", "sourceId", "enquiryTypeId", "enquiryDate"],
                  properties: {
                    customerId: { type: "integer", description: "Existing customer ID" },
                    customer: { type: "object", description: "Inline customer creation (if no customerId)" },
                    channel: { type: "string", enum: ["TELE", "WALKIN", "DIGITAL", "SOCIAL", "REFERENCE", "WEBSITE", "SERVICE"] },
                    sourceId: { type: "integer" },
                    enquiryTypeId: { type: "integer" },
                    purchaseType: { type: "string", enum: ["CASH", "FINANCE", "EXCHANGE"] },
                    exchangeFlag: { type: "boolean", default: false },
                    modelId: { type: "integer" },
                    variantId: { type: "integer" },
                    colourId: { type: "integer" },
                    assignedTo: { type: "integer" },
                    interestLevel: { type: "string", enum: ["HOT", "WARM", "COLD"] },
                    testRideFlag: { type: "boolean", default: false },
                    nextFollowupAt: { type: "string", format: "date-time" },
                    enquiryDate: { type: "string", format: "date" },
                    remark: { type: "string", maxLength: 2000 },
                    referredFromBranch: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Lead created" }, "404": { description: "Customer not found" } },
        },
      },
      "/api/v1/leads/today": {
        get: {
          tags: ["Leads"],
          summary: "Today's follow-ups",
          description: "Leads with next_followup_at = today",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
            { name: "assignedTo", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Leads due today" } },
        },
      },
      "/api/v1/leads/overdue": {
        get: {
          tags: ["Leads"],
          summary: "Overdue follow-ups",
          description: "Leads with next_followup_at before today (not closed)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
            { name: "assignedTo", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Overdue leads" } },
        },
      },
      "/api/v1/leads/upcoming": {
        get: {
          tags: ["Leads"],
          summary: "Upcoming follow-ups",
          description: "Leads with next_followup_at after today",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
            { name: "assignedTo", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Upcoming leads" } },
        },
      },
      "/api/v1/leads/no-followup": {
        get: {
          tags: ["Leads"],
          summary: "Leads with no follow-up scheduled",
          description: "Active leads with no next_followup_at set",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 25 } },
            { name: "assignedTo", in: "query", schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Leads without follow-ups" } },
        },
      },
      "/api/v1/leads/{id}": {
        get: {
          tags: ["Leads"],
          summary: "Get lead by ID",
          description: "Full detail with follow-ups, stage history, customer info",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Lead details" }, "404": { description: "Not found" } },
        },
        patch: {
          tags: ["Leads"],
          summary: "Update lead",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sourceId: { type: "integer" },
                    enquiryTypeId: { type: "integer" },
                    purchaseType: { type: "string" },
                    modelId: { type: "integer" },
                    variantId: { type: "integer" },
                    colourId: { type: "integer" },
                    interestLevel: { type: "string" },
                    remark: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Lead updated" }, "404": { description: "Not found" } },
        },
      },
      "/api/v1/leads/{id}/stage": {
        post: {
          tags: ["Leads"],
          summary: "Move lead stage",
          description: "Transitions lead to a new stage and creates stage history entry",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["stage"],
                  properties: {
                    stage: { type: "string", enum: ["NOT_CONTACTED", "CONTACTED", "NOT_REACHABLE", "TEST_RIDE_SCHEDULED", "TEST_RIDE_COMPLETED", "QUOTATION_SHARED", "BOOKED", "INVOICED", "DELIVERED_CLOSED", "LOST"] },
                    closureReasonId: { type: "integer", description: "Required for LOST stage" },
                    remark: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Stage updated" }, "400": { description: "Already in this stage" } },
        },
      },
      "/api/v1/leads/{id}/assign": {
        post: {
          tags: ["Leads"],
          summary: "Reassign lead",
          description: "Reassign lead to a different sales executive (Manager+ only)",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["assignedTo"],
                  properties: { assignedTo: { type: "integer" } },
                },
              },
            },
          },
          responses: { "200": { description: "Lead reassigned" } },
        },
      },
      "/api/v1/leads/{id}/followups": {
        post: {
          tags: ["Follow-ups"],
          summary: "Add follow-up",
          description: "Add a follow-up to a lead. Auto-increments seq_no and updates lead.next_followup_at.",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["followupDate"],
                  properties: {
                    followupDate: { type: "string", format: "date-time" },
                    channel: { type: "string", enum: ["CALL", "SMS", "WHATSAPP", "VISIT", "EMAIL"] },
                    remark: { type: "string", maxLength: 2000 },
                    outcome: { type: "string", enum: ["CONNECTED", "RNR", "BUSY", "WRONG_NO", "SWITCHED_OFF", "CALLBACK_REQUESTED"] },
                    nextActionAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Follow-up created" }, "404": { description: "Lead not found" } },
        },
      },
      // ─── Vehicle Catalogue ──────────────────────────────────────
      "/api/v1/vehicle-catalogue/models": {
        get: {
          tags: ["Vehicle Catalogue"],
          summary: "List vehicle models",
          description: "Returns all models with their variants. Pass ?includeInactive=true to include inactive.",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "includeInactive", in: "query", schema: { type: "boolean" } }],
          responses: { "200": { description: "Model list with variants" } },
        },
        post: {
          tags: ["Vehicle Catalogue"],
          summary: "Create vehicle model",
          description: "Admin only",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, segment: { type: "string" }, bodyType: { type: "string" }, obdType: { type: "string" }, displayOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } },
          responses: { "201": { description: "Model created" }, "409": { description: "Name already exists" } },
        },
      },
      "/api/v1/vehicle-catalogue/models/{id}": {
        get: { tags: ["Vehicle Catalogue"], summary: "Get model by ID", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Model details with variants" } } },
        patch: { tags: ["Vehicle Catalogue"], summary: "Update model", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, segment: { type: "string" }, bodyType: { type: "string" }, displayOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } }, responses: { "200": { description: "Model updated" } } },
      },
      "/api/v1/vehicle-catalogue/variants": {
        get: { tags: ["Vehicle Catalogue"], summary: "List variants", security: [{ bearerAuth: [] }], parameters: [{ name: "modelId", in: "query", schema: { type: "integer" } }, { name: "includeInactive", in: "query", schema: { type: "boolean" } }], responses: { "200": { description: "Variant list" } } },
        post: { tags: ["Vehicle Catalogue"], summary: "Create variant", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["modelId", "name"], properties: { modelId: { type: "integer" }, name: { type: "string" }, displayOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } }, responses: { "201": { description: "Variant created" } } },
      },
      "/api/v1/vehicle-catalogue/variants/{id}": {
        get: { tags: ["Vehicle Catalogue"], summary: "Get variant", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Variant details" } } },
        patch: { tags: ["Vehicle Catalogue"], summary: "Update variant", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, modelId: { type: "integer" }, displayOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } }, responses: { "200": { description: "Variant updated" } } },
      },
      "/api/v1/vehicle-catalogue/colours": {
        get: { tags: ["Vehicle Catalogue"], summary: "List colours", security: [{ bearerAuth: [] }], parameters: [{ name: "includeInactive", in: "query", schema: { type: "boolean" } }], responses: { "200": { description: "Colour list" } } },
        post: { tags: ["Vehicle Catalogue"], summary: "Create colour", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, displayOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } }, responses: { "201": { description: "Colour created" } } },
      },
      "/api/v1/vehicle-catalogue/colours/{id}": {
        get: { tags: ["Vehicle Catalogue"], summary: "Get colour", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Colour details" } } },
        patch: { tags: ["Vehicle Catalogue"], summary: "Update colour", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, displayOrder: { type: "integer" }, isActive: { type: "boolean" } } } } } }, responses: { "200": { description: "Colour updated" } } },
      },
      // ─── Pipeline ───────────────────────────────────────────────
      "/api/v1/leads/{id}/quotations": {
        get: { tags: ["Pipeline"], summary: "List quotations for a lead", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Quotation list" } } },
        post: {
          tags: ["Pipeline"], summary: "Create quotation", description: "Creates quotation and auto-advances lead to QUOTATION_SHARED", security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["variantId", "exShowroom", "onRoad", "netAmount", "validTill"], properties: { variantId: { type: "integer" }, colourId: { type: "integer" }, exShowroom: { type: "number" }, onRoad: { type: "number" }, discount: { type: "number", default: 0 }, netAmount: { type: "number" }, validTill: { type: "string", format: "date" }, remark: { type: "string" } } } } } },
          responses: { "201": { description: "Quotation created, lead stage updated" } },
        },
      },
      "/api/v1/leads/{id}/bookings": {
        get: { tags: ["Pipeline"], summary: "List bookings for a lead", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Booking list" } } },
        post: {
          tags: ["Pipeline"], summary: "Create booking", description: "Creates booking and auto-advances lead to BOOKED", security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["bookingAmount", "bookingDate"], properties: { bookingAmount: { type: "number" }, bookingDate: { type: "string", format: "date" }, remark: { type: "string" } } } } } },
          responses: { "201": { description: "Booking created, lead stage updated" } },
        },
      },
      "/api/v1/leads/{id}/invoices": {
        get: { tags: ["Pipeline"], summary: "List invoices for a lead", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Invoice list" } } },
        post: {
          tags: ["Pipeline"], summary: "Create invoice", description: "Creates invoice and auto-advances lead to INVOICED", security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["invoiceDate", "totalAmount"], properties: { invoiceDate: { type: "string", format: "date" }, totalAmount: { type: "number" }, remark: { type: "string" } } } } } },
          responses: { "201": { description: "Invoice created, lead stage updated" } },
        },
      },
      "/api/v1/leads/{id}/deliveries": {
        get: { tags: ["Pipeline"], summary: "List deliveries for a lead", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Delivery list" } } },
        post: {
          tags: ["Pipeline"], summary: "Record delivery", description: "Records delivery and auto-closes lead (DELIVERED_CLOSED)", security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["deliveryDate"], properties: { deliveryDate: { type: "string", format: "date" }, remark: { type: "string" } } } } } },
          responses: { "201": { description: "Delivery recorded, lead closed" } },
        },
      },
      // ─── Import ───────────────────────────────────────────────
      "/api/v1/import/upload": {
        post: {
          tags: ["Import"],
          summary: "Upload Excel/CSV file",
          description: "Upload a file for import. Max 25 MB. Accepts .xlsx, .xls, .csv. Returns batch ID and detected sheets.",
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["file"], properties: { file: { type: "string", format: "binary" } } } } } },
          responses: { "201": { description: "File uploaded, batch created" }, "409": { description: "Duplicate file" } },
        },
      },
      "/api/v1/import/{id}/preview": {
        post: {
          tags: ["Import"],
          summary: "Preview import",
          description: "Parses file, normalizes data, returns first 50 rows + error/valid counts. Pass ?sheet=SheetName to select a sheet.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
            { name: "sheet", in: "query", schema: { type: "string" }, description: "Sheet name to import from" },
          ],
          responses: { "200": { description: "Preview with row data and error counts" } },
        },
      },
      "/api/v1/import/{id}/commit": {
        post: {
          tags: ["Import"],
          summary: "Commit import",
          description: "Runs the full import: normalize, validate, dedupe, load into DB. Creates customers and leads.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
            { name: "sheet", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Import complete with success/error counts" } },
        },
      },
      "/api/v1/import/{id}/errors.xlsx": {
        get: {
          tags: ["Import"],
          summary: "Download error report",
          description: "Downloads an Excel file with all row-level errors from the import.",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: { "200": { description: "Excel file download" } },
        },
      },
      // ─── Reports ──────────────────────────────────────────────
      "/api/v1/reports/dashboard": {
        get: {
          tags: ["Reports"], summary: "Sales dashboard KPIs",
          description: "Total enquiries, active, today, overdue, upcoming, no-followup, booked, invoiced, delivered, lost",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "dateFrom", in: "query", schema: { type: "string", format: "date" } },
            { name: "dateTo", in: "query", schema: { type: "string", format: "date" } },
          ],
          responses: { "200": { description: "Dashboard KPIs" } },
        },
      },
      "/api/v1/reports/funnel": {
        get: { tags: ["Reports"], summary: "Stage-wise funnel", description: "Lead counts per stage, ordered by pipeline position", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Funnel data" } } },
      },
      "/api/v1/reports/executive": {
        get: { tags: ["Reports"], summary: "Executive performance", description: "Per-executive: total leads, contacted %, test rides, bookings, invoiced, lost", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Executive metrics" } } },
      },
      "/api/v1/reports/source": {
        get: { tags: ["Reports"], summary: "Source performance", description: "Per-source: enquiry count, invoiced, delivered, lost, conversion %", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Source metrics" } } },
      },
      "/api/v1/reports/model-mix": {
        get: { tags: ["Reports"], summary: "Model mix", description: "Enquiries and invoices by vehicle model", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Model mix data" } } },
      },
      "/api/v1/reports/referred-branch": {
        get: { tags: ["Reports"], summary: "Referred branch count", description: "Enquiries received from other branches", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Branch referral counts" } } },
      },
      "/api/v1/reports/lost-reasons": {
        get: { tags: ["Reports"], summary: "Lost reason analysis", description: "Closure reason breakdown for lost leads", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Lost reason counts" } } },
      },
      "/api/v1/reports/telecaller": {
        get: { tags: ["Reports"], summary: "Tele-caller dashboard", description: "Source × stage matrix for tele-enquiry leads", security: [{ bearerAuth: [] }], parameters: [{ name: "dateFrom", in: "query", schema: { type: "string", format: "date" } }, { name: "dateTo", in: "query", schema: { type: "string", format: "date" } }], responses: { "200": { description: "Source-stage matrix" } } },
      },
      // ─── Search ───────────────────────────────────────────────
      "/api/v1/search": {
        get: { tags: ["Search"], summary: "Unified search", description: "Search across customers and leads by name, mobile, email, enquiry no. Returns top 10 of each.", security: [{ bearerAuth: [] }], parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } }], responses: { "200": { description: "Matching customers and leads" } } },
      },
      // ─── Audit ──────────────────────────────────────────────────
      "/api/v1/audit/{entityType}/{entityId}": {
        get: { tags: ["Audit"], summary: "Entity audit trail", description: "View audit log for a specific entity (e.g. lead, customer)", security: [{ bearerAuth: [] }], parameters: [{ name: "entityType", in: "path", required: true, schema: { type: "string" } }, { name: "entityId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Audit log entries" } } },
      },
      // ─── Notifications ──────────────────────────────────────────
      "/api/v1/notifications": {
        get: { tags: ["Notifications"], summary: "List notifications", description: "Own notifications. Pass ?unreadOnly=true for unread only.", security: [{ bearerAuth: [] }], parameters: [{ name: "unreadOnly", in: "query", schema: { type: "boolean" } }], responses: { "200": { description: "Notification list" } } },
      },
      "/api/v1/notifications/unread-count": {
        get: { tags: ["Notifications"], summary: "Unread count", security: [{ bearerAuth: [] }], responses: { "200": { description: "Count of unread notifications" } } },
      },
      "/api/v1/notifications/{id}/read": {
        post: { tags: ["Notifications"], summary: "Mark as read", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Marked as read" } } },
      },
      "/api/v1/notifications/read-all": {
        post: { tags: ["Notifications"], summary: "Mark all as read", security: [{ bearerAuth: [] }], responses: { "200": { description: "All marked as read" } } },
      },
      // ─── Tasks ──────────────────────────────────────────────────
      "/api/v1/tasks": {
        get: { tags: ["Tasks"], summary: "List own tasks", description: "Pass ?showCompleted=true to include completed tasks", security: [{ bearerAuth: [] }], parameters: [{ name: "showCompleted", in: "query", schema: { type: "boolean" } }], responses: { "200": { description: "Task list" } } },
        post: { tags: ["Tasks"], summary: "Create task", description: "Manager+ only. Assign to any user, optionally link to a lead.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["title", "assignedTo"], properties: { title: { type: "string" }, description: { type: "string" }, assignedTo: { type: "integer" }, leadId: { type: "integer" }, dueAt: { type: "string", format: "date-time" } } } } } }, responses: { "201": { description: "Task created" } } },
      },
      "/api/v1/tasks/{id}": {
        get: { tags: ["Tasks"], summary: "Get task by ID", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Task details" } } },
      },
      "/api/v1/tasks/{id}/complete": {
        post: { tags: ["Tasks"], summary: "Complete task", security: [{ bearerAuth: [] }], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Task completed" } } },
      },
      "/api/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          responses: { "200": { description: "API is running" } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  });
});

app.get("/api/docs", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Bigwing CRM — API Docs</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <script id="api-reference" data-url="/api/docs/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`);
});

// ─── 404 handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ─── Error handler (must be last) ───────────────────────────────
app.use(errorHandler);

// ─── Start server ───────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`🚀 Bigwing CRM API running on port ${env.PORT}`);
  logger.info(`📖 API docs: http://localhost:${env.PORT}/api/docs`);
  logger.info(`🔧 Environment: ${env.NODE_ENV}`);
});

export default app;
