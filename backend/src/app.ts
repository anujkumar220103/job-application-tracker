import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jobRoutes from "./routes/jobRoutes";
import authRoutes from "./routes/authRoutes";


dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Job Tracker API is running 🚀");
});

export default app;
