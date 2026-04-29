import { z } from "zod";
import {
  LeadChannel,
  EnquiryStage,
  InterestLevel,
  PurchaseType,
  FollowupChannel,
  FollowupOutcome,
  CustomerType,
  UserRole,
} from "./enums.js";

// ─── Shared validators ─────────────────────────────────────────
const mobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number");

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().optional(),
  q: z.string().optional(),
});

// ─── Auth ───────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

// ─── User ───────────────────────────────────────────────────────
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(160),
  mobile: mobileSchema.optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  mobile: mobileSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

// ─── Customer ───────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional(),
  mobile: mobileSchema,
  altMobile: mobileSchema.optional(),
  email: z.string().email().optional(),
  dob: z.string().date().optional(),
  anniversary: z.string().date().optional(),
  location: z.string().max(120).optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  accountType: z.string().max(40).optional(),
  accountName: z.string().max(160).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ─── Lead ───────────────────────────────────────────────────────
export const createLeadSchema = z.object({
  customerId: z.number().int().positive().optional(),
  // If no customerId, inline customer creation
  customer: createCustomerSchema.optional(),
  channel: z.nativeEnum(LeadChannel),
  sourceId: z.number().int().positive(),
  enquiryTypeId: z.number().int().positive(),
  purchaseType: z.nativeEnum(PurchaseType).optional(),
  exchangeFlag: z.boolean().default(false),
  modelId: z.number().int().positive().optional(),
  variantId: z.number().int().positive().optional(),
  colourId: z.number().int().positive().optional(),
  assignedTo: z.number().int().positive().optional(),
  executiveName: z.string().max(100).optional(),
  interestLevel: z.nativeEnum(InterestLevel).optional(),
  testRideFlag: z.boolean().default(false),
  nextFollowupAt: z.string().datetime().optional(),
  enquiryDate: z.string().date(),
  remark: z.string().max(2000).optional(),
  referredFromBranch: z.string().max(80).optional(),
  // Service enquiry attributes (when channel=SERVICE)
  typeOfService: z.string().max(60).optional(),
  pickupDropFlag: z.boolean().default(false),
  expectedServiceDate: z.string().date().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().omit({
  customer: true,
  customerId: true,
  channel: true,
});

export const moveStageSchema = z.object({
  stage: z.nativeEnum(EnquiryStage),
  closureReasonId: z.number().int().positive().optional(),
  remark: z.string().max(2000).optional(),
});

export const assignLeadSchema = z.object({
  assignedTo: z.union([z.number().int().positive(), z.string().min(1)]),
});

// ─── Follow-up ──────────────────────────────────────────────────
export const createFollowupSchema = z.object({
  followupDate: z.string().datetime(),
  channel: z.nativeEnum(FollowupChannel).optional(),
  remark: z.string().max(2000).optional(),
  outcome: z.nativeEnum(FollowupOutcome).optional(),
  nextActionAt: z.string().datetime().optional(),
});

// ─── Lead List Filters ──────────────────────────────────────────
export const leadListQuerySchema = paginationSchema.extend({
  stage: z.nativeEnum(EnquiryStage).optional(),
  channel: z.nativeEnum(LeadChannel).optional(),
  interestLevel: z.nativeEnum(InterestLevel).optional(),
  assignedTo: z.coerce.number().int().positive().optional(),
  executiveName: z.string().optional(),
  sourceId: z.coerce.number().int().positive().optional(),
  modelId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  referredFromBranch: z.string().optional(),
});

export const customerListQuerySchema = paginationSchema;

// ─── Vehicle Catalogue (admin CRUD) ────────────────────────────
export const createVehicleModelSchema = z.object({
  name: z.string().min(1).max(120),
  segment: z.string().max(40).optional(),
  bodyType: z.string().max(40).optional(),
  obdType: z.string().max(40).optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateVehicleModelSchema = createVehicleModelSchema.partial();

export const createVehicleVariantSchema = z.object({
  modelId: z.number().int().positive(),
  name: z.string().min(1).max(120),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateVehicleVariantSchema = createVehicleVariantSchema.partial();

export const createVehicleColourSchema = z.object({
  name: z.string().min(1).max(120),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateVehicleColourSchema = createVehicleColourSchema.partial();

// ─── Pipeline (Quotation / Booking / Invoice / Delivery) ───────
export const createQuotationSchema = z.object({
  variantId: z.number().int().positive(),
  colourId: z.number().int().positive().optional(),
  exShowroom: z.number().positive(),
  onRoad: z.number().positive(),
  discount: z.number().min(0).default(0),
  netAmount: z.number().positive(),
  validTill: z.string().date(),
  remark: z.string().max(2000).optional(),
});

export const createBookingSchema = z.object({
  bookingAmount: z.number().positive(),
  bookingDate: z.string().date(),
  remark: z.string().max(2000).optional(),
});

export const createInvoiceSchema = z.object({
  invoiceDate: z.string().date(),
  totalAmount: z.number().positive(),
  remark: z.string().max(2000).optional(),
});

export const createDeliverySchema = z.object({
  deliveryDate: z.string().date(),
  remark: z.string().max(2000).optional(),
});

// ─── Lookup (master table) ──────────────────────────────────────
export const createLookupSchema = z.object({
  name: z.string().min(1).max(120),
  mobile: z.string().max(15).optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateLookupSchema = createLookupSchema.partial();

// ─── API Response envelope ──────────────────────────────────────
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  field: z.string().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
} | {
  success: false;
  error: ApiError;
};

// Re-export pagination for use in API and frontend
export { paginationSchema, mobileSchema };
