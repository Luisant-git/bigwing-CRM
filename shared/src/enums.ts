// ─── Lead Channel ───────────────────────────────────────────────
export const LeadChannel = {
  TELE: "TELE",
  WALKIN: "WALKIN",
  DIGITAL: "DIGITAL",
  SOCIAL: "SOCIAL",
  REFERENCE: "REFERENCE",
  WEBSITE: "WEBSITE",
  SERVICE: "SERVICE",
} as const;
export type LeadChannel = (typeof LeadChannel)[keyof typeof LeadChannel];

// ─── Enquiry Stage ──────────────────────────────────────────────
export const EnquiryStage = {
  NEW: "NEW",
  ENQUIRED: "ENQUIRED",
  NOT_REACHABLE: "NOT_REACHABLE",
  TEST_RIDE_SCHEDULED: "TEST_RIDE_SCHEDULED",
  TEST_RIDE_COMPLETED: "TEST_RIDE_COMPLETED",
  QUOTATION_SHARED: "QUOTATION_SHARED",
  BOOKED: "BOOKED",
  INVOICED: "INVOICED",
  DELIVERED_CLOSED: "DELIVERED_CLOSED",
  LOST: "LOST",
} as const;
export type EnquiryStage = (typeof EnquiryStage)[keyof typeof EnquiryStage];

// ─── Interest Level ─────────────────────────────────────────────
export const InterestLevel = {
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
} as const;
export type InterestLevel = (typeof InterestLevel)[keyof typeof InterestLevel];

// ─── Purchase Type ──────────────────────────────────────────────
export const PurchaseType = {
  CASH: "CASH",
  FINANCE: "FINANCE",
  EXCHANGE: "EXCHANGE",
} as const;
export type PurchaseType = (typeof PurchaseType)[keyof typeof PurchaseType];

// ─── Follow-up Channel ──────────────────────────────────────────
export const FollowupChannel = {
  CALL: "CALL",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
  VISIT: "VISIT",
  EMAIL: "EMAIL",
} as const;
export type FollowupChannel = (typeof FollowupChannel)[keyof typeof FollowupChannel];

// ─── Follow-up Outcome ──────────────────────────────────────────
export const FollowupOutcome = {
  CONNECTED: "CONNECTED",
  RNR: "RNR",
  BUSY: "BUSY",
  WRONG_NO: "WRONG_NO",
  SWITCHED_OFF: "SWITCHED_OFF",
  CALLBACK_REQUESTED: "CALLBACK_REQUESTED",
} as const;
export type FollowupOutcome = (typeof FollowupOutcome)[keyof typeof FollowupOutcome];

// ─── Customer Type ──────────────────────────────────────────────
export const CustomerType = {
  FIRST_TIME: "FIRST_TIME",
  REPEAT: "REPEAT",
  INSTITUTIONAL: "INSTITUTIONAL",
} as const;
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];

// ─── User Role ──────────────────────────────────────────────────
export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SALES_EXECUTIVE: "SALES_EXECUTIVE",
  TELE_CALLER: "TELE_CALLER",
  SERVICE: "SERVICE",
  VIEWER: "VIEWER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Enquiry Type ───────────────────────────────────────────────
export const EnquiryType = {
  NEW: "NEW",
  SERVICE: "SERVICE",
  SPARES: "SPARES",
  INSURANCE: "INSURANCE",
  ACCESSORIES: "ACCESSORIES",
} as const;
export type EnquiryType = (typeof EnquiryType)[keyof typeof EnquiryType];


