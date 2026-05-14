import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "async_hooks";

export const brandContext = new AsyncLocalStorage<string>();

export const brandMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Extract brand from query or header, default to BIGWING
  const brandHeader = req.headers["x-brand"] as string;
  const brandQuery = req.query.brand as string;
  const brand = (brandQuery || brandHeader || "BIGWING").toUpperCase();
  
  if (req.path.includes("/import")) {
    // console.log(`[BrandMiddleware] Path: ${req.path}, Query: ${brandQuery}, Header: ${brandHeader}, Resolved: ${brand}`);
  }
  
  brandContext.run(brand, () => {
    // Attach to req for convenience if needed
    (req as any).brand = brand;
    next();
  });
};
