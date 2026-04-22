import { Request, Response, NextFunction } from "express";
import { lookupService } from "./service.js";

export class LookupController {
  async getItems(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;

      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({
          success: false,
          error: {
            code: "INVALID_LOOKUP",
            message: `Unknown lookup: ${name}`,
          },
        });
        return;
      }

      const modelId = req.query.modelId ? Number(req.query.modelId) : undefined;
      const includeInactive = req.query.includeInactive === "true";
      const items = await lookupService.getItems(name, modelId, includeInactive);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      const item = await lookupService.create(name, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const name = req.params.name as string;
      const id = req.params.id as string;
      if (!lookupService.isValidLookup(name)) {
        res.status(404).json({ success: false, error: { code: "INVALID_LOOKUP", message: `Unknown lookup: ${name}` } });
        return;
      }
      const item = await lookupService.update(name, BigInt(id), req.body);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }
}

export const lookupController = new LookupController();
