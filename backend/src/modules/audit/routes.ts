import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { auditService } from "./service.js";

const router = Router();

router.use(authMiddleware);

// GET /audit/:entityType/:entityId — view audit trail for an entity
router.get(
  "/:entityType/:entityId",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  async (req, res, next) => {
    try {
      const data = await auditService.getByEntity(
        req.params.entityType,
        BigInt(req.params.entityId)
      );
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

export { router as auditRoutes };
