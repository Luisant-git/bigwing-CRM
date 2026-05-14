import { Router } from "express";
import multer from "multer";
import path from "path";
import { importController } from "./controller.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";

const router = Router();

// Multer config — store in apps/api/uploads/
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${ts}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".xlsx", ".xls", ".csv", ".xml"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx, .xls, .csv, and .xml files are accepted"));
    }
  },
});

router.use(authMiddleware);

router.post(
  "/upload",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "TELE_CALLER"]),
  upload.single("file"),
  (req, res, next) => importController.upload(req, res, next)
);

// GET /:id — fetch batch status (for progress polling)
router.get(
  "/:id",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "TELE_CALLER"]),
  async (req, res, next) => {
    try {
      const { importRepository } = await import("./repository.js");
      const batch = await importRepository.findBatchById(BigInt(req.params.id as string));
      if (!batch) {
        res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Batch not found" } });
        return;
      }
      res.json({
        success: true,
        data: {
          id: Number(batch.id),
          fileName: batch.fileName,
          status: batch.status,
          totalRows: batch.totalRows,
          successRows: batch.successRows,
          errorRows: batch.errorRows,
          skippedRows: batch.skippedRows,
          startedAt: batch.startedAt,
          completedAt: batch.completedAt,
          createdAt: batch.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:id/preview",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "TELE_CALLER"]),
  (req, res, next) => importController.preview(req, res, next)
);

router.post(
  "/:id/commit",
  rbac(["SUPER_ADMIN", "ADMIN", "TELE_CALLER"]),
  (req, res, next) => importController.commit(req, res, next)
);

router.get(
  "/:id/errors.xlsx",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "TELE_CALLER"]),
  (req, res, next) => importController.downloadErrors(req, res, next)
);

export { router as importRoutes };
