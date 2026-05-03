import { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { fromNodeHeaders } from "better-auth/node";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

const forwardAuthCookies = (headers: Headers, res: Response) => {
  const setCookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie");
  if (setCookies && (Array.isArray(setCookies) ? setCookies.length : true)) {
    res.setHeader("Set-Cookie", setCookies as string | string[]);
  }
};

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { headers, token, user } = await authService.login(req.body);
    forwardAuthCookies(headers, res);
    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: { token, user },
    });
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const { headers, user } = await authService.register(req.body);
    forwardAuthCookies(headers, res);
    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: user,
    });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { headers } = await authService.logout(fromNodeHeaders(req.headers));
    forwardAuthCookies(headers, res);
    res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  }),

  getCurrentUser: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getCurrentUser(fromNodeHeaders(req.headers));
    res.status(200).json({
      status: "success",
      message: "User retrieved successfully",
      data: user,
    });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.body, fromNodeHeaders(req.headers));
    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  }),

  forgetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const message = await authService.forgetPassword(email);
    res.status(200).json({ status: "success", message });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    res
      .status(200)
      .json({ status: "success", message: "Password reset successfully" });
  }),
};
