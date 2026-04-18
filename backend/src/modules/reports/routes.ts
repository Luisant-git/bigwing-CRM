import { Router } from "express";
import { reportController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";

const router = Router();

router.use(authMiddleware);

// All report endpoints accept optional ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD

router.get(
  "/dashboard",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "VIEWER"]),
  (req, res, next) => reportController.dashboard(req, res, next)
);

router.get(
  "/funnel",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  (req, res, next) => reportController.funnel(req, res, next)
);

router.get(
  "/executive",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  (req, res, next) => reportController.executive(req, res, next)
);

router.get(
  "/source",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  (req, res, next) => reportController.source(req, res, next)
);

router.get(
  "/model-mix",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  (req, res, next) => reportController.modelMix(req, res, next)
);

router.get(
  "/referred-branch",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  (req, res, next) => reportController.referredBranch(req, res, next)
);

router.get(
  "/lost-reasons",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  (req, res, next) => reportController.lostReasons(req, res, next)
);

router.get(
  "/telecaller",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "TELE_CALLER", "VIEWER"]),
  (req, res, next) => reportController.telecallerDashboard(req, res, next)
);

export { router as reportRoutes };
