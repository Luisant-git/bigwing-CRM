import { Router } from "express";
import { followupController } from "./controller.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { createFollowupSchema } from "@bigwing/shared";

// mergeParams to access :id from parent lead routes
const router = Router({ mergeParams: true });

router.post(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(createFollowupSchema),
  (req, res, next) => followupController.create(req, res, next)
);

export { router as followupRoutes };
