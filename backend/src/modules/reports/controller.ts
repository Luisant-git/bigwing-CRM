import { Request, Response, NextFunction } from "express";
import { reportService } from "./service.js";

function dateFilter(req: Request) {
  return {
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
  };
}

export class ReportController {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.dashboard(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async funnel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.funnel(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async executive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.executive(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async source(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.source(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async modelMix(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.modelMix(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async referredBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.referredBranch(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async lostReasons(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.lostReasons(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async telecallerDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.telecallerDashboard(dateFilter(req), (req as any).user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const reportController = new ReportController();
