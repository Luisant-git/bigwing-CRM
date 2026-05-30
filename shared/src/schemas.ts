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

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(160),
  role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
});

// ─── User ───────────────────────────────────────────────────────
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(160),
  mobile: mobileSchema.optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  role: z.nativeEnum(UserRole),
  branchId: z.coerce.number().optional(),
  brandAccess: z.enum(["BOTH", "BIGWING", "REDWING"]).optional(),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  mobile: mobileSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  branchId: z.coerce.number().optional(),
  brandAccess: z.enum(["BOTH", "BIGWING", "REDWING"]).optional(),
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
  customerId: z.number({ required_error: "Customer is required", invalid_type_error: "Invalid customer ID" }).int().positive().optional(),
  // If no customerId, inline customer creation
  customer: createCustomerSchema.optional(),
  channel: z.nativeEnum(LeadChannel, { required_error: "Channel is required", invalid_type_error: "Invalid channel" }),
  sourceId: z.number({ required_error: "Source is required", invalid_type_error: "Please select a source" }).int().positive("Please select a source"),
  enquiryTypeId: z.number({ required_error: "Enquiry type is required", invalid_type_error: "Please select an enquiry type" }).int().positive("Please select an enquiry type"),
  purchaseType: z.nativeEnum(PurchaseType, { invalid_type_error: "Invalid purchase type" }).nullable().optional(),
  exchangeFlag: z.boolean({ invalid_type_error: "Exchange must be yes or no" }).default(false),
  modelId: z.number({ invalid_type_error: "Please select a model" }).int().positive("Please select a model").nullable().optional(),
  variantId: z.number({ invalid_type_error: "Please select a variant" }).int().positive("Please select a variant").nullable().optional(),
  colourId: z.number({ invalid_type_error: "Please select a colour" }).int().positive("Please select a colour").nullable().optional(),
  assignedTo: z.number({ invalid_type_error: "Please select an executive" }).int().positive("Please select an executive").nullable().optional(),
  executiveName: z.string({ invalid_type_error: "Executive name is invalid" }).max(100).nullable().optional(),
  interestLevel: z.nativeEnum(InterestLevel, { invalid_type_error: "Invalid interest level" }).nullable().optional(),
  testRideFlag: z.boolean({ invalid_type_error: "Test ride must be yes or no" }).default(false),
  nextFollowupAt: z.string({ invalid_type_error: "Next follow-up must be a valid date" }).datetime({ message: "Invalid date format" }).nullable().optional(),
  enquiryDate: z.string({ required_error: "Enquiry date is required", invalid_type_error: "Please select an enquiry date" }).date("Please select a valid date"),
  remark: z.string().max(2000).nullable().optional(),
  telecallerRemark: z.string().max(2000).nullable().optional(),
  referredFromBranch: z.string().max(80).nullable().optional(),
  metaFormName: z.string().max(120).nullable().optional(),
  // Service enquiry attributes (when channel=SERVICE)
  typeOfService: z.string().max(60).nullable().optional(),
  pickupDropFlag: z.boolean().default(false),
  expectedServiceDate: z.string().date().nullable().optional(),
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
  stage: z.preprocess((v) => v === "" ? undefined : v, z.nativeEnum(EnquiryStage).optional()),
  channel: z.preprocess((v) => v === "" ? undefined : v, z.nativeEnum(LeadChannel).optional()),
  interestLevel: z.preprocess((v) => v === "" ? undefined : v, z.nativeEnum(InterestLevel).optional()),
  assignedTo: z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().int().positive().optional()),
  executiveName: z.string().optional(),
  sourceId: z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().int().positive().optional()),
  modelId: z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().int().positive().optional()),
  dateFrom: z.preprocess((v) => v === "" ? undefined : v, z.string().date().optional()),
  dateTo: z.preprocess((v) => v === "" ? undefined : v, z.string().date().optional()),
  referredFromBranch: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  metaForm: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
  followupSeq: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
});

export const customerListQuerySchema = paginationSchema.extend({
  tab: z.preprocess((v) => v === "" ? undefined : v, z.string().optional()),
});

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
  branchName: z.string().max(120).optional(),
  networkCode: z.string().max(60).optional(),
  networkType: z.string().max(60).optional(),
  inventoryLocation: z.string().max(120).optional(),
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
