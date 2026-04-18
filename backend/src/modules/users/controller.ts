import { Request, Response, NextFunction } from "express";
import { userService } from "./service.js";

export class UserController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, pageSize, q } = req.query as any;
      const result = await userService.list(
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
      const user = await userService.getById(BigInt(req.params.id));
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const createdBy = req.user ? BigInt(req.user.userId) : undefined;
      const user = await userService.create(req.body, createdBy);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedBy = req.user ? BigInt(req.user.userId) : undefined;
      const user = await userService.update(
        BigInt(req.params.id),
        req.body,
        updatedBy
      );
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      const result = await userService.resetPassword(
        BigInt(req.params.id),
        password
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
