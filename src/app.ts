import express from "express";
import cors from "cors";
import helmet from "helmet";
import userRoutes from "./modules/users/user.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import teamRoutes from "./modules/team/team.routes.js";
import caseRoutes from "./modules/case/case.routes.js";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import {
  errorHandler,
  notFoundHandler,
} from "./middlewares/error.middleware.js";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
});

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "success", message: "ok" });
});

app.use("/api/", apiLimiter);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/cases", caseRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
