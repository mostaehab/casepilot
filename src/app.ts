import express from "express";
import cors from "cors";
import userRoutes from "./modules/users/user.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import teamRoutes from "./modules/team/team.routes.js";
import caseRoutes from "./modules/case/case.routes.js";
import morgan from "morgan";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
dotenv.config();
const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
});

const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

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
app.set("trust proxy", 1); // Trust first proxy for rate limiting
app.use(express.json());
app.use(morgan("dev"));
app.use("/api/", apiLimiter);
app.use("/api/users", userRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/cases", caseRoutes);
export default app;
