import { Router } from "express";
import { z } from "zod";
import { leadController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import {
  createLeadSchema,
  updateLeadSchema,
  moveStageSchema,
  assignLeadSchema,
  leadListQuerySchema,
  paginationSchema,
} from "@bigwing/shared";
import { followupRoutes } from "../followups/routes.js";
import { pipelineRoutes } from "../pipeline/routes.js";

const router = Router();

// Schema for follow-up view queries (same as lead list)
const followupViewQuerySchema = leadListQuerySchema;

router.use(authMiddleware);

router.get(
  "/export-excel",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  (req, res, next) => leadController.exportExcel(req, res, next)
);

// ─── Follow-up views (before /:id to avoid route conflicts) ────
router.get(
  "/today",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(followupViewQuerySchema, "query"),
  (req, res, next) => leadController.todayFollowups(req, res, next)
);

router.get(
  "/overdue",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(followupViewQuerySchema, "query"),
  (req, res, next) => leadController.overdueFollowups(req, res, next)
);

router.get(
  "/upcoming",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(followupViewQuerySchema, "query"),
  (req, res, next) => leadController.upcomingFollowups(req, res, next)
);

router.get(
  "/no-followup",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(followupViewQuerySchema, "query"),
  (req, res, next) => leadController.noFollowup(req, res, next)
);

// ─── Lead CRUD ─────────────────────────────────────────────────
router.get(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(leadListQuerySchema, "query"),
  (req, res, next) => leadController.list(req, res, next)
);

router.post(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(createLeadSchema),
  (req, res, next) => leadController.create(req, res, next)
);

router.get(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  (req, res, next) => leadController.getById(req, res, next)
);

router.patch(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(updateLeadSchema),
  (req, res, next) => leadController.update(req, res, next)
);

router.post(
  "/:id/stage",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(moveStageSchema),
  (req, res, next) => leadController.moveStage(req, res, next)
);

router.post(
  "/:id/assign",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(assignLeadSchema),
  (req, res, next) => leadController.assign(req, res, next)
);

router.delete(
  "/:id",
  rbac(["SUPER_ADMIN", "MANAGER"]),
  (req, res, next) => leadController.remove(req, res, next)
);

// ─── Follow-up sub-routes ──────────────────────────────────────
router.use("/:id/followups", followupRoutes);

// ─── Pipeline sub-routes (quotation, booking, invoice, delivery)
router.use("/:id", pipelineRoutes);

export { router as leadRoutes };
