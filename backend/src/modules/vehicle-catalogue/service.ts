import { prisma } from "@bigwing/db";
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

    const { variants, ...modelData } = data;
    const model = await vehicleCatalogueRepository.createModel({
      ...modelData,
      variants: variants && variants.length > 0 ? {
        create: variants.map((v: any) => ({
          name: v.name,
          stock: Number(v.stock) || 0,
          isActive: true,
        })),
      } : undefined,
    });

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

  async updateModelFull(id: bigint, data: any) {
    const { variants, ...modelData } = data;
    
    // Update model basic info
    await this.updateModel(id, modelData);

    if (variants) {
      const existingVariants = await vehicleCatalogueRepository.findAllVariants(id, true);
      const incomingIds = variants.map((v: any) => v.id).filter(Boolean);

      // 1. Delete removed variants (check leads first)
      const toDelete = existingVariants.filter(v => !incomingIds.includes(Number(v.id)));
      for (const v of toDelete) {
        await this.deleteVariant(v.id);
      }

      // 2. Update or Create variants
      for (const v of variants) {
        if (v.id) {
          await this.updateVariant(BigInt(v.id), {
            name: v.name,
            stock: Number(v.stock),
          });
        } else {
          await vehicleCatalogueRepository.createVariant({
            name: v.name,
            stock: Number(v.stock) || 0,
            modelId: id,
            isActive: true,
          });
        }
      }
    }

    return this.getModel(id);
  }

  async deleteModel(id: bigint) {
    const existing = await vehicleCatalogueRepository.findModelById(id);
    if (!existing) throw new AppError(404, "MODEL_NOT_FOUND", "Vehicle model not found");

    // Check if any variant has leads
    const variants = existing.variants || [];
    for (const v of variants) {
      const leadCount = await prisma.lead.count({ where: { variantId: v.id } });
      if (leadCount > 0) {
        throw new AppError(400, "MODEL_IN_USE", `Cannot delete model. Variant "${v.name}" is used in ${leadCount} leads.`);
      }
    }

    // Delete variants first
    await prisma.vehicleVariant.deleteMany({ where: { modelId: id } });
    await vehicleCatalogueRepository.deleteModel(id);
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
    if (data.stock !== undefined) updateData.stock = Number(data.stock);

    const variant = await vehicleCatalogueRepository.updateVariant(id, updateData);
    return this.formatVariant(variant);
  }

  async deleteVariant(id: bigint) {
    const existing = await vehicleCatalogueRepository.findVariantById(id);
    if (!existing) throw new AppError(404, "VARIANT_NOT_FOUND", "Vehicle variant not found");

    const leadCount = await prisma.lead.count({ where: { variantId: id } });
    if (leadCount > 0) {
      throw new AppError(400, "VARIANT_IN_USE", `Cannot delete variant. It is used in ${leadCount} leads.`);
    }

    await vehicleCatalogueRepository.deleteVariant(id);
  }

  async importStock(data: any[]) {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const row of data) {
      try {
        const modelName = String(row.model || row.Model || "").trim();
        const variantName = String(row.variant || row.Variant || "").trim();
        const stock = parseInt(row.stock || row.Stock, 10);

        if (!modelName || !variantName || isNaN(stock)) {
          results.failed++;
          results.errors.push(`Invalid data: ${modelName} / ${variantName} / ${stock}`);
          continue;
        }

        const model = await vehicleCatalogueRepository.findModelByName(modelName);
        if (!model) {
          results.failed++;
          results.errors.push(`Model not found: ${modelName}`);
          continue;
        }

        const variants = await vehicleCatalogueRepository.findAllVariants(model.id, true);
        const variant = variants.find(v => v.name.toLowerCase() === variantName.toLowerCase());

        if (!variant) {
          results.failed++;
          results.errors.push(`Variant not found: ${variantName} for model ${modelName}`);
          continue;
        }

        await vehicleCatalogueRepository.updateVariant(variant.id, { stock });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error: ${err.message}`);
      }
    }

    return results;
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

  async deleteColour(id: bigint) {
    const existing = await vehicleCatalogueRepository.findColourById(id);
    if (!existing) throw new AppError(404, "COLOUR_NOT_FOUND", "Vehicle colour not found");

    const leadCount = await prisma.lead.count({ where: { colourId: id } });
    if (leadCount > 0) {
      throw new AppError(400, "COLOUR_IN_USE", `Cannot delete colour. It is used in ${leadCount} leads.`);
    }

    await vehicleCatalogueRepository.deleteColour(id);
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
        stock: v.stock || 0,
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
      stock: v.stock || 0,
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
