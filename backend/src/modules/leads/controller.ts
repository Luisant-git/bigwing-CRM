import { Request, Response, NextFunction } from "express";
import { leadService } from "./service.js";

export class LeadController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user ? BigInt(req.user.userId) : undefined;
      const lead = await leadService.create(req.body, createdBy);
      res.status(201).json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadService.list(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await leadService.getById(BigInt(req.params.id));
      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user ? BigInt(req.user.userId) : undefined;
      const lead = await leadService.update(
        BigInt(req.params.id),
        req.body,
        updatedBy
      );
      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  async moveStage(req: Request, res: Response, next: NextFunction) {
    try {
      const changedBy = BigInt(req.user!.userId);
      const lead = await leadService.moveStage(
        BigInt(req.params.id),
        req.body,
        changedBy
      );
      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = BigInt(req.user!.userId);
      const lead = await leadService.assign(
        BigInt(req.params.id),
        req.body.assignedTo,
        updatedBy
      );
      res.json({ success: true, data: lead });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedBy = BigInt(req.user!.userId);
      const result = await leadService.softDelete(BigInt(req.params.id), deletedBy);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async todayFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadService.getFollowupView("today", req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async overdueFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadService.getFollowupView("overdue", req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async upcomingFollowups(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadService.getFollowupView("upcoming", req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async noFollowup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadService.getFollowupView(
        "no-followup",
        req.query,
        req.user
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export const leadController = new LeadController();
