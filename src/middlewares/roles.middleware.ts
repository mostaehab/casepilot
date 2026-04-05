import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const userProtected = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: No active session",
      });
    }

    req.user = session.user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired session",
    });
  }
};

export const adminProtected = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized: No active session",
      });
    }

    if (session.user.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: You do not have admin privileges",
      });
    }

    req.user = session.user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired session",
    });
  }
};
