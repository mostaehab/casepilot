import express from "express";
import cors from "cors";
import userRoutes from "./modules/users/user.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import teamRoutes from "./modules/team/team.routes.js";
import caseRoutes from "./modules/case/case.routes.js";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();
const app = express();

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
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/cases", caseRoutes);
export default app;
