import { Router } from "express";
import { authController } from "./controller.js";
import { validate } from "../../middlewares/validate.js";
import {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  registerSchema,
} from "@bigwing/shared";

const router = Router();

router.post("/register", validate(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post("/login", validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.post("/refresh", validate(refreshTokenSchema), (req, res, next) =>
  authController.refresh(req, res, next)
);

router.post("/logout", validate(refreshTokenSchema), (req, res, next) =>
  authController.logout(req, res, next)
);

router.post("/forgot-password", validate(forgotPasswordSchema), (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

router.post("/reset-password", validate(resetPasswordSchema), (req, res, next) =>
  authController.resetPassword(req, res, next)
);

export { router as authRoutes };
