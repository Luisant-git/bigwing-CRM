import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { notificationService } from "./service.js";

const router = Router();

router.use(authMiddleware);

// GET / — list notifications (own only)
router.get("/", async (req, res, next) => {
  try {
    const userId = BigInt(req.user!.userId);
    const unreadOnly = req.query.unreadOnly === "true";
    const data = await notificationService.list(userId, unreadOnly);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /unread-count
router.get("/unread-count", async (req, res, next) => {
  try {
    const count = await notificationService.unreadCount(
      BigInt(req.user!.userId)
    );
    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
});

// POST /:id/read — mark single as read
router.post("/:id/read", async (req, res, next) => {
  try {
    const data = await notificationService.markRead(
      BigInt(req.params.id),
      BigInt(req.user!.userId)
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST /read-all — mark all as read
router.post("/read-all", async (req, res, next) => {
  try {
    const data = await notificationService.markAllRead(
      BigInt(req.user!.userId)
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export { router as notificationRoutes };
