import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: "error",
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
    });
  }

  const anyErr = err as { status?: number; statusCode?: number; message?: string };
  const status =
    typeof anyErr?.status === "number"
      ? anyErr.status
      : typeof anyErr?.statusCode === "number"
        ? anyErr.statusCode
        : 500;

  if (status >= 500) {
    console.error("[error]", err);
  }

  res.status(status).json({
    status: "error",
    message: anyErr?.message || "Internal server error",
  });
};
