import { prisma } from "@bigwing/db";
import { AppError } from "../../middlewares/errorHandler.js";

// Lookup tables that are managed via this generic CRUD.
// (vehicle-models/variants/colours have their own dedicated module at /vehicle-catalogue.)
const lookupModels = {
  "enquiry-sources": () => prisma.enquirySource,
  "enquiry-types": () => prisma.enquiryTypeLookup,
  "interest-levels": () => prisma.interestLevelLookup,
  "closure-reasons": () => prisma.closureReason,
  "vehicle-models": () => prisma.vehicleModel,
  "vehicle-variants": () => prisma.vehicleVariant,
  "vehicle-colours": () => prisma.vehicleColour,
  "referred-branches": () => prisma.referredBranch,
  "sales-executives": () => prisma.salesExecutive,
  "active-stages": () => ({} as any), // Dummy for mapping
} as const;

// Lookups that support admin CRUD via this module
const EDITABLE_LOOKUPS = new Set([
  "enquiry-sources",
  "enquiry-types",
  "interest-levels",
  "closure-reasons",
  "referred-branches",
  "sales-executives",
]);

type LookupName = keyof typeof lookupModels;

export class LookupService {
  private validNames = new Set<string>(Object.keys(lookupModels));

  isValidLookup(name: string): name is LookupName {
    return this.validNames.has(name);
  }

  isEditableLookup(name: string): boolean {
    return EDITABLE_LOOKUPS.has(name);
  }

  async getItems(name: LookupName, modelId?: number, includeInactive = false) {
    if (name === "active-stages") {
      const stages = await prisma.lead.groupBy({
        by: ["stage"],
        where: { NOT: { stage: "DELIVERED_CLOSED" } },
      });
      return stages.map((s) => ({ stage: s.stage, label: s.stage.replace(/_/g, " ") }));
    }

    const model = lookupModels[name]() as any;

    const where: any = includeInactive ? {} : { isActive: true };
    if (name === "vehicle-variants" && modelId) {
      where.modelId = BigInt(modelId);
    }

    const items = await model.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return items.map((item: any) => this.formatItem(item, name));
  }

  async create(name: LookupName, data: { name: string; mobile?: string; displayOrder?: number; isActive?: boolean }) {
    if (!this.isEditableLookup(name)) {
      throw new AppError(400, "NOT_EDITABLE", `Lookup '${name}' is managed via its dedicated module`);
    }

    const model = lookupModels[name]() as any;

    // Check uniqueness
    const existing = await model.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new AppError(409, "NAME_EXISTS", `An item with this name already exists`, "name");
    }

    const item = await model.create({
      data: {
        name: data.name,
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    return this.formatItem(item, name);
  }

  async update(name: LookupName, id: bigint, data: any) {
    if (!this.isEditableLookup(name)) {
      throw new AppError(400, "NOT_EDITABLE", `Lookup '${name}' is managed via its dedicated module`);
    }

    const model = lookupModels[name]() as any;

    const existing = await model.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Item not found");

    if (data.name && data.name !== existing.name) {
      const dup = await model.findUnique({ where: { name: data.name } });
      if (dup) throw new AppError(409, "NAME_EXISTS", "An item with this name already exists", "name");
    }

    const updated = await model.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.formatItem(updated, name);
  }

  private formatItem(item: any, name: LookupName) {
    const base = {
      id: Number(item.id),
      name: item.name,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
    };

    if (name === "vehicle-models") {
      return {
        ...base,
        segment: item.segment,
        bodyType: item.bodyType,
        obdType: item.obdType,
      };
    }

    if (name === "vehicle-variants") {
      return { ...base, modelId: Number(item.modelId) };
    }

    if (name === "sales-executives") {
      return { ...base, mobile: item.mobile };
    }

    return base;
  }
}

export const lookupService = new LookupService();
