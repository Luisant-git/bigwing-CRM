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
  "service-executives": () => prisma.serviceExecutive,
  "meta-statuses": () => prisma.metaStatusLookup,
  "active-stages": () => ({} as any), // Dummy for mapping
  "locations": () => prisma.location,
} as const;

// Lookups that support admin CRUD via this module
const EDITABLE_LOOKUPS = new Set([
  "enquiry-sources",
  "enquiry-types",
  "interest-levels",
  "closure-reasons",
  "referred-branches",
  "sales-executives",
  "service-executives",
  "meta-statuses",
  "locations",
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

  async create(name: LookupName, data: { name?: string; color?: string; mobile?: string; branchName?: string; networkCode?: string; networkType?: string; inventoryLocation?: string; displayOrder?: number; isActive?: boolean; regionName?: string; divisionName?: string; officeName?: string; pincode?: string; district?: string; stateName?: string; }) {
    if (!this.isEditableLookup(name)) {
      throw new AppError(400, "NOT_EDITABLE", `Lookup '${name}' is managed via its dedicated module`);
    }

    const model = lookupModels[name]() as any;

    // Check uniqueness (not for locations as they don't have a single name field)
    if (name !== "locations" && data.name) {
      const existing = await model.findFirst({ where: { name: data.name } });
      if (existing) {
        throw new AppError(409, "NAME_EXISTS", `An item with this name already exists`, "name");
      }
    }

    const item = await model.create({
      data: {
        ...(name !== "locations" && { name: data.name }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.branchName !== undefined && { branchName: data.branchName }),
        ...(data.networkCode !== undefined && { networkCode: data.networkCode }),
        ...(data.networkType !== undefined && { networkType: data.networkType }),
        ...(data.inventoryLocation !== undefined && { inventoryLocation: data.inventoryLocation }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.regionName !== undefined && { regionName: data.regionName }),
        ...(data.divisionName !== undefined && { divisionName: data.divisionName }),
        ...(data.officeName !== undefined && { officeName: data.officeName }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.district !== undefined && { district: data.district }),
        ...(data.stateName !== undefined && { stateName: data.stateName }),
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

    if (name !== "locations" && data.name && data.name !== existing.name) {
      const dup = await model.findFirst({ where: { name: data.name } });
      if (dup) throw new AppError(409, "NAME_EXISTS", "An item with this name already exists", "name");
    }

    const updated = await model.update({
      where: { id },
      data: {
        ...(name !== "locations" && data.name !== undefined && { name: data.name }),
        ...(data.mobile !== undefined && { mobile: data.mobile }),
        ...(data.branchName !== undefined && { branchName: data.branchName }),
        ...(data.networkCode !== undefined && { networkCode: data.networkCode }),
        ...(data.networkType !== undefined && { networkType: data.networkType }),
        ...(data.inventoryLocation !== undefined && { inventoryLocation: data.inventoryLocation }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.regionName !== undefined && { regionName: data.regionName }),
        ...(data.divisionName !== undefined && { divisionName: data.divisionName }),
        ...(data.officeName !== undefined && { officeName: data.officeName }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.district !== undefined && { district: data.district }),
        ...(data.stateName !== undefined && { stateName: data.stateName }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return this.formatItem(updated, name);
  }

  async delete(name: LookupName, id: bigint) {
    if (!this.isEditableLookup(name)) {
      throw new AppError(400, "NOT_EDITABLE", `Lookup '${name}' is managed via its dedicated module`);
    }

    const model = lookupModels[name]() as any;

    const existing = await model.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", "Item not found");

    try {
      await model.delete({ where: { id } });
    } catch (err: any) {
      // Prisma error for foreign key constraint failure
      if (err.code === 'P2003') {
        throw new AppError(400, "IN_USE", "Cannot delete item because it is currently in use");
      }
      throw err;
    }
    
    return true;
  }

  private formatItem(item: any, name: LookupName) {
    const base = {
      id: Number(item.id),
      ...(name !== "locations" && { name: item.name }),
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      brand: item.brand,
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

    if (name === "sales-executives" || name === "service-executives") {
      return { ...base, mobile: item.mobile, branchName: item.branchName, networkCode: item.networkCode };
    }

    if (name === "referred-branches") {
      return { ...base, branchName: item.branchName, networkCode: item.networkCode, networkType: item.networkType, inventoryLocation: item.inventoryLocation };
    }

    if (name === "meta-statuses") {
      return { ...base, color: item.color };
    }

    if (name === "locations") {
      return {
        ...base,
        regionName: item.regionName,
        divisionName: item.divisionName,
        officeName: item.officeName,
        pincode: item.pincode,
        district: item.district,
        stateName: item.stateName,
      };
    }

    return base;
  }
}

export const lookupService = new LookupService();
