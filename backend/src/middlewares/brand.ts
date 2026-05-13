import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";

export const brandContext = new AsyncLocalStorage<string>();

export const brandMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract brand from header, default to BIGWING
  const brand = (req.headers["x-brand"] as string || "BIGWING").toUpperCase();
  
  brandContext.run(brand, () => {
    // Attach to req for convenience if needed
    (req as any).brand = brand;
    next();
  });
};
