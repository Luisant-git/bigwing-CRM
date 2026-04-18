import { Request, Response, NextFunction } from "express";

/**
 * RBAC middleware factory.
 * @param allowedRoles - Array of role names allowed to access the route.
 *
 * Usage: router.get('/users', authMiddleware, rbac(['SUPER_ADMIN', 'ADMIN']), controller.list)
 */
export function rbac(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      });
      return;
    }

    // SUPER_ADMIN bypasses all role checks
    if (req.user.roles.includes("SUPER_ADMIN")) {
      next();
      return;
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource",
        },
      });
      return;
    }

    next();
  };
}
