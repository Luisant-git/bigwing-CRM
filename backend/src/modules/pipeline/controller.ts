import { Request, Response, NextFunction } from "express";
import { pipelineService } from "./service.js";

export class PipelineController {
  // ─── Quotation ────────────────────────────────────────────────
  async getQuotations(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pipelineService.getQuotations(BigInt(req.params.id as string));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createQuotation(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = BigInt(req.user!.userId);
      const data = await pipelineService.createQuotation(
        BigInt(req.params.id as string), req.body, createdBy
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  // ─── Booking ──────────────────────────────────────────────────
  async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pipelineService.getBookings(BigInt(req.params.id as string));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = BigInt(req.user!.userId);
      const data = await pipelineService.createBooking(
        BigInt(req.params.id as string), req.body, createdBy
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  // ─── Invoice ──────────────────────────────────────────────────
  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pipelineService.getInvoices(BigInt(req.params.id as string));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = BigInt(req.user!.userId);
      const data = await pipelineService.createInvoice(
        BigInt(req.params.id as string), req.body, createdBy
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  // ─── Delivery ─────────────────────────────────────────────────
  async getDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pipelineService.getDeliveries(BigInt(req.params.id as string));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async createDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = BigInt(req.user!.userId);
      const data = await pipelineService.createDelivery(
        BigInt(req.params.id as string), req.body, createdBy
      );
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const pipelineController = new PipelineController();
