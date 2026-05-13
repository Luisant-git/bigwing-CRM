import { prisma } from "@bigwing/db";
import { brandContext } from "../../middlewares/brand.js";



export class VehicleCatalogueRepository {
  // ─── Models ───────────────────────────────────────────────────
  async findAllModels(includeInactive = false) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleModel.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        brand,
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { variants: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
    });
  }

  async findModelById(id: bigint) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleModel.findFirst({
      where: { id, brand },
      include: { variants: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
    });
  }

  async findModelByName(name: string) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleModel.findFirst({ where: { name, brand } });
  }

  async createModel(data: any) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleModel.create({ data: { ...data, brand } });
  }

  async updateModel(id: bigint, data: any) {
    return prisma.vehicleModel.update({ where: { id }, data });
  }

  async deleteModel(id: bigint) {
    return prisma.vehicleModel.delete({ where: { id } });
  }

  // ─── Variants ─────────────────────────────────────────────────
  async findAllVariants(modelId?: bigint, includeInactive = false) {
    return prisma.vehicleVariant.findMany({
      where: {
        ...(modelId && { modelId }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { model: { select: { id: true, name: true } } },
    });
  }

  async findVariantById(id: bigint) {
    return prisma.vehicleVariant.findUnique({
      where: { id },
      include: { model: { select: { id: true, name: true } } },
    });
  }

  async createVariant(data: any) {
    return prisma.vehicleVariant.create({
      data,
      include: { model: { select: { id: true, name: true } } },
    });
  }

  async updateVariant(id: bigint, data: any) {
    return prisma.vehicleVariant.update({
      where: { id },
      data,
      include: { model: { select: { id: true, name: true } } },
    });
  }

  async deleteVariant(id: bigint) {
    return prisma.vehicleVariant.delete({ where: { id } });
  }

  // ─── Colours ──────────────────────────────────────────────────
  async findAllColours(includeInactive = false) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleColour.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        brand,
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  }

  async findColourById(id: bigint) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleColour.findFirst({ where: { id, brand } });
  }

  async findColourByName(name: string) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleColour.findFirst({ where: { name, brand } });
  }

  async createColour(data: any) {
    const brand = brandContext.getStore() || "BIGWING";
    return prisma.vehicleColour.create({ data: { ...data, brand } });
  }

  async updateColour(id: bigint, data: any) {
    return prisma.vehicleColour.update({ where: { id }, data });
  }

  async deleteColour(id: bigint) {
    return prisma.vehicleColour.delete({ where: { id } });
  }
}

export const vehicleCatalogueRepository = new VehicleCatalogueRepository();
