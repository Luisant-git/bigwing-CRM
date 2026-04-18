import { Router } from "express";
import { vehicleCatalogueController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import {
  createVehicleModelSchema,
  updateVehicleModelSchema,
  createVehicleVariantSchema,
  updateVehicleVariantSchema,
  createVehicleColourSchema,
  updateVehicleColourSchema,
} from "@bigwing/shared";

const router = Router();

router.use(authMiddleware);

// ─── Models ───────────────────────────────────────────────────
router.get(
  "/models",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"]),
  (req, res, next) => vehicleCatalogueController.listModels(req, res, next)
);

router.get(
  "/models/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"]),
  (req, res, next) => vehicleCatalogueController.getModel(req, res, next)
);

router.post(
  "/models",
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(createVehicleModelSchema),
  (req, res, next) => vehicleCatalogueController.createModel(req, res, next)
);

router.patch(
  "/models/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(updateVehicleModelSchema),
  (req, res, next) => vehicleCatalogueController.updateModel(req, res, next)
);

// ─── Variants ─────────────────────────────────────────────────
router.get(
  "/variants",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"]),
  (req, res, next) => vehicleCatalogueController.listVariants(req, res, next)
);

router.get(
  "/variants/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"]),
  (req, res, next) => vehicleCatalogueController.getVariant(req, res, next)
);

router.post(
  "/variants",
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(createVehicleVariantSchema),
  (req, res, next) => vehicleCatalogueController.createVariant(req, res, next)
);

router.patch(
  "/variants/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(updateVehicleVariantSchema),
  (req, res, next) => vehicleCatalogueController.updateVariant(req, res, next)
);

// ─── Colours ──────────────────────────────────────────────────
router.get(
  "/colours",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"]),
  (req, res, next) => vehicleCatalogueController.listColours(req, res, next)
);

router.get(
  "/colours/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER", "SERVICE", "VIEWER"]),
  (req, res, next) => vehicleCatalogueController.getColour(req, res, next)
);

router.post(
  "/colours",
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(createVehicleColourSchema),
  (req, res, next) => vehicleCatalogueController.createColour(req, res, next)
);

router.patch(
  "/colours/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(updateVehicleColourSchema),
  (req, res, next) => vehicleCatalogueController.updateColour(req, res, next)
);

export { router as vehicleCatalogueRoutes };
