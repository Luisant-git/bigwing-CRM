import { prisma } from "@bigwing/db";

export class VehicleCatalogueRepository {
  // ─── Models ───────────────────────────────────────────────────
  async findAllModels(includeInactive = false) {
    return prisma.vehicleModel.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { variants: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
    });
  }

  async findModelById(id: bigint) {
    return prisma.vehicleModel.findUnique({
      where: { id },
      include: { variants: { orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
    });
  }

  async findModelByName(name: string) {
    return prisma.vehicleModel.findUnique({ where: { name } });
  }

  async createModel(data: any) {
    return prisma.vehicleModel.create({ data });
  }

  async updateModel(id: bigint, data: any) {
    return prisma.vehicleModel.update({ where: { id }, data });
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

  // ─── Colours ──────────────────────────────────────────────────
  async findAllColours(includeInactive = false) {
    return prisma.vehicleColour.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
  }

  async findColourById(id: bigint) {
    return prisma.vehicleColour.findUnique({ where: { id } });
  }

  async findColourByName(name: string) {
    return prisma.vehicleColour.findUnique({ where: { name } });
  }

  async createColour(data: any) {
    return prisma.vehicleColour.create({ data });
  }

  async updateColour(id: bigint, data: any) {
    return prisma.vehicleColour.update({ where: { id }, data });
  }
}

export const vehicleCatalogueRepository = new VehicleCatalogueRepository();
