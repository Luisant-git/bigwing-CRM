import { Router } from "express";
import { prisma } from "@bigwing/db";
import { authMiddleware } from "../../middlewares/auth.js";
import { rbac } from "../../middlewares/rbac.js";
import { AppError } from "../../middlewares/errorHandler.js";

const router = Router();

router.use(authMiddleware);

/**
 * POST /admin/purge
 * DANGER: Wipes all business data (leads, customers, pipeline docs, follow-ups, stage history,
 * audit logs, import batches, notifications). Keeps users, roles, master data, and app settings.
 *
 * Body: { confirm: "PURGE_ALL_DATA" } — exact string required to prevent accidental calls
 */
router.post("/purge", rbac(["SUPER_ADMIN"]), async (req, res, next) => {
  try {
    if (req.body?.confirm !== "PURGE_ALL_DATA") {
      throw new AppError(
        400,
        "CONFIRMATION_REQUIRED",
        'Set body { "confirm": "PURGE_ALL_DATA" } to proceed'
      );
    }

    const userId = BigInt(req.user!.userId);

    // Delete in FK-safe order (children → parents)
    const before = {
      leads: await prisma.lead.count(),
      customers: await prisma.customer.count(),
      followups: await prisma.leadFollowup.count(),
      batches: await prisma.importBatch.count(),
    };

    await prisma.$transaction([
      // Pipeline docs (reference lead)
      prisma.delivery.deleteMany({}),
      prisma.invoice.deleteMany({}),
      prisma.booking.deleteMany({}),
      prisma.quotation.deleteMany({}),
      // Lead children
      prisma.leadStageHistory.deleteMany({}),
      prisma.leadFollowup.deleteMany({}),
      // Lead itself
      prisma.lead.deleteMany({}),
      // Customer children
      prisma.customerContact.deleteMany({}),
      // Customer
      prisma.customer.deleteMany({}),
      // App data (audit, tasks, notifications, imports)
      prisma.auditLog.deleteMany({
        where: { entityType: { in: ["lead", "customer"] } },
      }),
      prisma.task.deleteMany({}),
      prisma.notification.deleteMany({}),
      prisma.importRowError.deleteMany({}),
      prisma.importBatch.deleteMany({}),
    ]);

    // Log the purge as audit entry
    await prisma.auditLog.create({
      data: {
        userId,
        entityType: "system",
        entityId: BigInt(0),
        action: "DELETE",
        changes: { action: "PURGE_ALL", before },
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      data: {
        message: "All business data purged",
        deleted: before,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as adminRoutes };
