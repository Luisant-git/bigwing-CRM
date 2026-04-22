import { Request, Response, NextFunction } from "express";
import { vehicleCatalogueService } from "./service.js";

export class VehicleCatalogueController {
  // ─── Models ───────────────────────────────────────────────────
  async listModels(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const models = await vehicleCatalogueService.listModels(includeInactive);
      res.json({ success: true, data: models });
    } catch (err) { next(err); }
  }

  async getModel(req: Request, res: Response, next: NextFunction) {
    try {
      const model = await vehicleCatalogueService.getModel(BigInt(req.params.id as string));
      res.json({ success: true, data: model });
    } catch (err) { next(err); }
  }

  async createModel(req: Request, res: Response, next: NextFunction) {
    try {
      const model = await vehicleCatalogueService.createModel(req.body);
      res.status(201).json({ success: true, data: model });
    } catch (err) { next(err); }
  }

  async updateModel(req: Request, res: Response, next: NextFunction) {
    try {
      const model = await vehicleCatalogueService.updateModel(BigInt(req.params.id as string), req.body);
      res.json({ success: true, data: model });
    } catch (err) { next(err); }
  }

  // ─── Variants ─────────────────────────────────────────────────
  async listVariants(req: Request, res: Response, next: NextFunction) {
    try {
      const modelId = req.query.modelId ? Number(req.query.modelId) : undefined;
      const includeInactive = req.query.includeInactive === "true";
      const variants = await vehicleCatalogueService.listVariants(modelId, includeInactive);
      res.json({ success: true, data: variants });
    } catch (err) { next(err); }
  }

  async getVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await vehicleCatalogueService.getVariant(BigInt(req.params.id as string));
      res.json({ success: true, data: variant });
    } catch (err) { next(err); }
  }

  async createVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await vehicleCatalogueService.createVariant(req.body);
      res.status(201).json({ success: true, data: variant });
    } catch (err) { next(err); }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await vehicleCatalogueService.updateVariant(BigInt(req.params.id as string), req.body);
      res.json({ success: true, data: variant });
    } catch (err) { next(err); }
  }

  // ─── Colours ──────────────────────────────────────────────────
  async listColours(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const colours = await vehicleCatalogueService.listColours(includeInactive);
      res.json({ success: true, data: colours });
    } catch (err) { next(err); }
  }

  async getColour(req: Request, res: Response, next: NextFunction) {
    try {
      const colour = await vehicleCatalogueService.getColour(BigInt(req.params.id as string));
      res.json({ success: true, data: colour });
    } catch (err) { next(err); }
  }

  async createColour(req: Request, res: Response, next: NextFunction) {
    try {
      const colour = await vehicleCatalogueService.createColour(req.body);
      res.status(201).json({ success: true, data: colour });
    } catch (err) { next(err); }
  }

  async updateColour(req: Request, res: Response, next: NextFunction) {
    try {
      const colour = await vehicleCatalogueService.updateColour(BigInt(req.params.id as string), req.body);
      res.json({ success: true, data: colour });
    } catch (err) { next(err); }
  }
}

export const vehicleCatalogueController = new VehicleCatalogueController();
