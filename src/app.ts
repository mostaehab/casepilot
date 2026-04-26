import express from "express";
import userRoutes from "./modules/users/user.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import teamRoutes from "./modules/team/team.routes.js";
import caseRoutes from "./modules/case/case.routes.js";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();
const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/cases", caseRoutes);
export default app;
