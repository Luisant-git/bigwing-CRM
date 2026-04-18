import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { searchService } from "./service.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) {
      res.json({ success: true, data: { customers: [], leads: [] } });
      return;
    }
    const userId = req.user ? BigInt(req.user.userId) : undefined;
    const roles = req.user?.roles;
    const data = await searchService.search(q, userId, roles);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export { router as searchRoutes };
