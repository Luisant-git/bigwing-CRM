import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Zod validation middleware factory.
 * Validates request body, query, or params against a Zod schema.
 *
 * Usage: router.post('/leads', validate(createLeadSchema, 'body'), controller.create)
 */
export function validate(
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = formatZodError(result.error);
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: errors,
        },
      });
      return;
    }

    // Replace with parsed (cleaned) data
    req[source] = result.data;
    next();
  };
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}
