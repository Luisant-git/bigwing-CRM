import { vehicleCatalogueRepository } from "./repository.js";
import { AppError } from "../../middlewares/errorHandler.js";

export class VehicleCatalogueService {
  // ─── Models ───────────────────────────────────────────────────

  async listModels(includeInactive = false) {
    const models = await vehicleCatalogueRepository.findAllModels(includeInactive);
    return models.map(this.formatModel);
  }

  async getModel(id: bigint) {
    const model = await vehicleCatalogueRepository.findModelById(id);
    if (!model) throw new AppError(404, "MODEL_NOT_FOUND", "Vehicle model not found");
    return this.formatModel(model);
  }

  async createModel(data: any) {
    const existing = await vehicleCatalogueRepository.findModelByName(data.name);
    if (existing) {
      throw new AppError(409, "MODEL_EXISTS", "A model with this name already exists", "name");
    }
    const model = await vehicleCatalogueRepository.createModel(data);
    return this.formatModel(model);
  }

  async updateModel(id: bigint, data: any) {
    const existing = await vehicleCatalogueRepository.findModelById(id);
    if (!existing) throw new AppError(404, "MODEL_NOT_FOUND", "Vehicle model not found");

    if (data.name && data.name !== existing.name) {
      const dup = await vehicleCatalogueRepository.findModelByName(data.name);
      if (dup) throw new AppError(409, "MODEL_EXISTS", "A model with this name already exists", "name");
    }

    const model = await vehicleCatalogueRepository.updateModel(id, data);
    return this.formatModel(model);
  }

  // ─── Variants ─────────────────────────────────────────────────

  async listVariants(modelId?: number, includeInactive = false) {
    const mid = modelId ? BigInt(modelId) : undefined;
    const variants = await vehicleCatalogueRepository.findAllVariants(mid, includeInactive);
    return variants.map(this.formatVariant);
  }

  async getVariant(id: bigint) {
    const variant = await vehicleCatalogueRepository.findVariantById(id);
    if (!variant) throw new AppError(404, "VARIANT_NOT_FOUND", "Vehicle variant not found");
    return this.formatVariant(variant);
  }

  async createVariant(data: any) {
    const model = await vehicleCatalogueRepository.findModelById(BigInt(data.modelId));
    if (!model) throw new AppError(404, "MODEL_NOT_FOUND", "Vehicle model not found", "modelId");

    const variant = await vehicleCatalogueRepository.createVariant({
      name: data.name,
      modelId: BigInt(data.modelId),
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    });
    return this.formatVariant(variant);
  }

  async updateVariant(id: bigint, data: any) {
    const existing = await vehicleCatalogueRepository.findVariantById(id);
    if (!existing) throw new AppError(404, "VARIANT_NOT_FOUND", "Vehicle variant not found");

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.modelId !== undefined) updateData.modelId = BigInt(data.modelId);

    const variant = await vehicleCatalogueRepository.updateVariant(id, updateData);
    return this.formatVariant(variant);
  }

  // ─── Colours ──────────────────────────────────────────────────

  async listColours(includeInactive = false) {
    const colours = await vehicleCatalogueRepository.findAllColours(includeInactive);
    return colours.map(this.formatColour);
  }

  async getColour(id: bigint) {
    const colour = await vehicleCatalogueRepository.findColourById(id);
    if (!colour) throw new AppError(404, "COLOUR_NOT_FOUND", "Vehicle colour not found");
    return this.formatColour(colour);
  }

  async createColour(data: any) {
    const existing = await vehicleCatalogueRepository.findColourByName(data.name);
    if (existing) {
      throw new AppError(409, "COLOUR_EXISTS", "A colour with this name already exists", "name");
    }
    const colour = await vehicleCatalogueRepository.createColour(data);
    return this.formatColour(colour);
  }

  async updateColour(id: bigint, data: any) {
    const existing = await vehicleCatalogueRepository.findColourById(id);
    if (!existing) throw new AppError(404, "COLOUR_NOT_FOUND", "Vehicle colour not found");

    if (data.name && data.name !== existing.name) {
      const dup = await vehicleCatalogueRepository.findColourByName(data.name);
      if (dup) throw new AppError(409, "COLOUR_EXISTS", "A colour with this name already exists", "name");
    }

    const colour = await vehicleCatalogueRepository.updateColour(id, data);
    return this.formatColour(colour);
  }

  // ─── Formatters ───────────────────────────────────────────────

  private formatModel(m: any) {
    return {
      id: Number(m.id),
      name: m.name,
      segment: m.segment,
      bodyType: m.bodyType,
      obdType: m.obdType,
      displayOrder: m.displayOrder,
      isActive: m.isActive,
      variants: m.variants?.map((v: any) => ({
        id: Number(v.id),
        name: v.name,
        displayOrder: v.displayOrder,
        isActive: v.isActive,
      })),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }

  private formatVariant(v: any) {
    return {
      id: Number(v.id),
      name: v.name,
      modelId: Number(v.modelId),
      model: v.model?.name,
      displayOrder: v.displayOrder,
      isActive: v.isActive,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  private formatColour(c: any) {
    return {
      id: Number(c.id),
      name: c.name,
      displayOrder: c.displayOrder,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}

export const vehicleCatalogueService = new VehicleCatalogueService();
