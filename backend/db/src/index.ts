import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Global brand getter to be injected by the application
let getBrand: () => string | undefined = () => undefined;

export const setBrandGetter = (getter: () => string | undefined) => {
  getBrand = getter;
};

// Key models that have brand isolation (camelCase as used by Prisma Client)
const BRANDED_MODELS = [
  "lead",
  "customer",
  "vehicleModel",
  "vehicleColour",
  "enquirySource",
  "enquiryTypeLookup",
  "interestLevelLookup",
  "closureReason",
  "referredBranch",
  "salesExecutive",
  "quotation",
  "booking",
  "invoice",
  "delivery",
  "leadFollowup",
  "leadStageHistory",
  "customerContact",
  "importBatch",
  "importRowError",
  "task",
  "notification",
  "auditLog",
  "reportSnapshot"
];

const basePrisma = globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const brand = getBrand();
        // Lowercase model name for comparison
        const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
        
        if (brand && BRANDED_MODELS.includes(modelKey)) {
           // brand isolation is active
        }

        if (!brand || !BRANDED_MODELS.includes(modelKey)) {
          return query(args);
        }

        const a = args as any;

        // Apply brand filter to reading operations
        if (["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"].includes(operation)) {
          a.where = { ...a.where, brand };
          // findUnique doesn't support non-unique fields in 'where' in some versions,
          // so we convert to findFirst if needed.
          if (operation === "findUnique") {
            return (basePrisma as any)[modelKey].findFirst(a);
          }
        }

        // Apply brand to writing operations
        if (["create", "createMany"].includes(operation)) {
          if (operation === "create") {
            // Only add brand if not already provided explicitly
            if (!a.data.brand) {
              a.data = { ...a.data, brand };
            }
          }
          if (operation === "createMany") {
            const applyBrand = (d: any) => (d.brand ? d : { ...d, brand });
            if (Array.isArray(a.data)) {
              a.data = a.data.map(applyBrand);
            } else {
              a.data.data = a.data.data.map(applyBrand);
            }
          }
        }

        if (["update", "updateMany", "upsert", "delete", "deleteMany"].includes(operation)) {
          a.where = { ...a.where, brand };
        }

        return query(a);
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

export { PrismaClient };
export type { Prisma } from "@prisma/client";

