import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/asyncHandler";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognizes this as an error handler because it has 4 args.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Prisma known request errors (e.g. unique constraint violation)
  if (typeof err === "object" && err !== null && "code" in err) {
    const prismaErr = err as { code: string; meta?: unknown };
    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        error: "A record with this value already exists (unique constraint).",
        details: prismaErr.meta,
      });
    }
    if (prismaErr.code === "P2025") {
      return res.status(404).json({ error: "Record not found." });
    }
  }

  console.error("Unhandled error:", err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: "Internal server error", details: message });
}
