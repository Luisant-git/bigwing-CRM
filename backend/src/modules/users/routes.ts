import { Router } from "express";
import { userController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { createUserSchema, updateUserSchema } from "@bigwing/shared";
import { z } from "zod";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

router.get(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  (req, res, next) => userController.list(req, res, next)
);

router.get(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  (req, res, next) => userController.getById(req, res, next)
);

router.post(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(createUserSchema),
  (req, res, next) => userController.create(req, res, next)
);

router.patch(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(updateUserSchema),
  (req, res, next) => userController.update(req, res, next)
);

router.post(
  "/:id/reset-password",
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(z.object({ password: z.string().min(8).max(128) })),
  (req, res, next) => userController.resetPassword(req, res, next)
);

export { router as userRoutes };
