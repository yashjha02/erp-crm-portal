import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/asyncHandler";

// Validates req.body against a Zod schema. On success, replaces req.body
// with the parsed (and type-coerced) value.
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ApiError(400, "Validation failed", result.error.flatten().fieldErrors)
      );
    }
    req.body = result.data;
    next();
  };
}
