import { Request, Response, NextFunction } from "express";
import { followupService } from "./service.js";

export class FollowupController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const leadId = BigInt(req.params.id as string);
      const createdBy = BigInt(req.user!.userId);
      const followup = await followupService.create(
        leadId,
        req.body,
        createdBy
      );
      res.status(201).json({ success: true, data: followup });
    } catch (err) {
      next(err);
    }
  }
}

export const followupController = new FollowupController();
