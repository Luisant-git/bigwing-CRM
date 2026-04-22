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

/**
 * POST /admin/truncate
 * DEV-ONLY maintenance/testing button surfaced on the Import page.
 * Same blast radius as /purge (business data only — preserves users, roles,
 * lookups, settings), but gated on a specific email rather than a role so that
 * regular SUPER_ADMINs can't trigger it from the UI by accident.
 *
 * Gate: req.user.email must be exactly `seniordeveloper@bigwing.in`.
 * Body: { confirm: "TRUNCATE" } — the UI requires the operator to type this.
 */
const SENIOR_DEVELOPER_EMAIL = "seniordeveloper@bigwing.in";

router.post("/truncate", async (req, res, next) => {
  try {
    if (req.user?.email !== SENIOR_DEVELOPER_EMAIL) {
      throw new AppError(403, "FORBIDDEN", "Truncate is restricted to the senior developer account");
    }
    if (req.body?.confirm !== "TRUNCATE") {
      throw new AppError(
        400,
        "CONFIRMATION_REQUIRED",
        'Set body { "confirm": "TRUNCATE" } to proceed'
      );
    }

    const userId = BigInt(req.user!.userId);

    const before = {
      leads: await prisma.lead.count(),
      customers: await prisma.customer.count(),
      followups: await prisma.leadFollowup.count(),
      batches: await prisma.importBatch.count(),
    };

    await prisma.$transaction([
      prisma.delivery.deleteMany({}),
      prisma.invoice.deleteMany({}),
      prisma.booking.deleteMany({}),
      prisma.quotation.deleteMany({}),
      prisma.leadStageHistory.deleteMany({}),
      prisma.leadFollowup.deleteMany({}),
      prisma.lead.deleteMany({}),
      prisma.customerContact.deleteMany({}),
      prisma.customer.deleteMany({}),
      prisma.auditLog.deleteMany({
        where: { entityType: { in: ["lead", "customer"] } },
      }),
      prisma.task.deleteMany({}),
      prisma.notification.deleteMany({}),
      prisma.importRowError.deleteMany({}),
      prisma.importBatch.deleteMany({}),
    ]);

    await prisma.auditLog.create({
      data: {
        userId,
        entityType: "system",
        entityId: BigInt(0),
        action: "DELETE",
        changes: { action: "TRUNCATE_ALL", by: SENIOR_DEVELOPER_EMAIL, before },
        ipAddress: req.ip,
      },
    });

    res.json({
      success: true,
      data: {
        message: "All business data truncated",
        deleted: before,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as adminRoutes };
