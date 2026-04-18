import { Router } from "express";
import { customerController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
} from "@bigwing/shared";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(customerListQuerySchema, "query"),
  (req, res, next) => customerController.list(req, res, next)
);

router.get(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  (req, res, next) => customerController.getById(req, res, next)
);

router.post(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE", "TELE_CALLER"]),
  validate(createCustomerSchema),
  (req, res, next) => customerController.create(req, res, next)
);

router.patch(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  validate(updateCustomerSchema),
  (req, res, next) => customerController.update(req, res, next)
);

router.delete(
  "/:id",
  rbac(["SUPER_ADMIN", "MANAGER"]),
  (req, res, next) => customerController.remove(req, res, next)
);

export { router as customerRoutes };
