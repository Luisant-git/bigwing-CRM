import { Router } from "express";
import { lookupController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { createLookupSchema, updateLookupSchema } from "@bigwing/shared";
import multer from "multer";
import path from "path";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = [".xlsx", ".xls", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx, .xls, and .csv files are accepted"));
    }
  },
});

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

router.get(
  "/:name/export",
  authMiddleware,
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  (req, res, next) => lookupController.exportExcel(req, res, next)
);

router.post(
  "/:name/import",
  authMiddleware,
  rbac(["SUPER_ADMIN", "ADMIN"]),
  upload.single("file"),
  (req, res, next) => lookupController.importExcel(req, res, next)
);

router.patch(
  "/:name/:id",
  authMiddleware,
  rbac(["SUPER_ADMIN", "ADMIN"]),
  validate(updateLookupSchema),
  (req, res, next) => lookupController.update(req, res, next)
);

router.delete(
  "/:name/:id",
  authMiddleware,
  rbac(["SUPER_ADMIN", "ADMIN"]),
  (req, res, next) => lookupController.delete(req, res, next)
);

export { router as lookupRoutes };
