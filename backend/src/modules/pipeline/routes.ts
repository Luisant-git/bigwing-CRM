import { Router } from "express";
import { pipelineController } from "./controller.js";
import { rbac } from "../../middlewares/rbac.js";
import { validate } from "../../middlewares/validate.js";
import {
  createQuotationSchema,
  createBookingSchema,
  createInvoiceSchema,
  createDeliverySchema,
} from "@bigwing/shared";

// mergeParams to access :id from parent lead routes
const router = Router({ mergeParams: true });

// ─── Quotation ────────────────────────────────────────────────
router.get(
  "/quotations",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  (req, res, next) => pipelineController.getQuotations(req, res, next)
);

router.post(
  "/quotations",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  validate(createQuotationSchema),
  (req, res, next) => pipelineController.createQuotation(req, res, next)
);

// ─── Booking ──────────────────────────────────────────────────
router.get(
  "/bookings",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  (req, res, next) => pipelineController.getBookings(req, res, next)
);

router.post(
  "/bookings",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  validate(createBookingSchema),
  (req, res, next) => pipelineController.createBooking(req, res, next)
);

// ─── Invoice ──────────────────────────────────────────────────
router.get(
  "/invoices",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  (req, res, next) => pipelineController.getInvoices(req, res, next)
);

router.post(
  "/invoices",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(createInvoiceSchema),
  (req, res, next) => pipelineController.createInvoice(req, res, next)
);

// ─── Delivery ─────────────────────────────────────────────────
router.get(
  "/deliveries",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER", "SALES_EXECUTIVE"]),
  (req, res, next) => pipelineController.getDeliveries(req, res, next)
);

router.post(
  "/deliveries",
  rbac(["SUPER_ADMIN", "ADMIN", "MANAGER"]),
  validate(createDeliverySchema),
  (req, res, next) => pipelineController.createDelivery(req, res, next)
);

export { router as pipelineRoutes };
