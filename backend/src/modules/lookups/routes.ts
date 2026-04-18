import { Router } from "express";
import { lookupController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { createLookupSchema, updateLookupSchema } from "@bigwing/shared";

const router = Router();

// GET — no auth (public dropdowns)
router.get(
  "/:name",
  (req, res, next) => lookupController.getItems(req, res, next)
);

// POST/PATCH — admin only
router.post(
  "/:name",
  authMiddleware,
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(createLookupSchema),
  (req, res, next) => lookupController.create(req, res, next)
);

router.patch(
  "/:name/:id",
  authMiddleware,
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(updateLookupSchema),
  (req, res, next) => lookupController.update(req, res, next)
);

export { router as lookupRoutes };
