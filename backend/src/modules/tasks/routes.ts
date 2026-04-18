import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import { taskService } from "./service.js";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  assignedTo: z.number().int().positive(),
  leadId: z.number().int().positive().optional(),
  dueAt: z.string().datetime().optional(),
});

router.use(authMiddleware);

// GET / — list own tasks
router.get("/", async (req, res, next) => {
  try {
    const userId = BigInt(req.user!.userId);
    const showCompleted = req.query.showCompleted === "true";
    const data = await taskService.list(userId, showCompleted);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /:id
router.get("/:id", async (req, res, next) => {
  try {
    const data = await taskService.getById(BigInt(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST / — create task (Manager+ can assign to anyone)
router.post(
  "/",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(createTaskSchema),
  async (req, res, next) => {
    try {
      const createdBy = BigInt(req.user!.userId);
      const data = await taskService.create(req.body, createdBy);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// POST /:id/complete — mark task done
router.post("/:id/complete", async (req, res, next) => {
  try {
    const data = await taskService.complete(BigInt(req.params.id));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export { router as taskRoutes };
