import { Request, Response, NextFunction } from "express";
import { customerService } from "./service.js";

export class CustomerController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, pageSize, q } = req.query as any;
      const result = await customerService.list(
        Number(page) || 1,
        Number(pageSize) || 25,
        q as string
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.getById(BigInt(req.params.id));
      res.json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user ? BigInt(req.user.userId) : undefined;
      const customer = await customerService.create(req.body, createdBy);
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user ? BigInt(req.user.userId) : undefined;
      const customer = await customerService.update(
        BigInt(req.params.id),
        req.body,
        updatedBy
      );
      res.json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const deletedBy = req.user ? BigInt(req.user.userId) : undefined;
      const result = await customerService.softDelete(
        BigInt(req.params.id),
        deletedBy!
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const customerController = new CustomerController();
