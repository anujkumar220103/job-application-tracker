import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import jobRoutes from "./routes/jobRoutes";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);

app.get("/", (req, res) => {
  // console.log("ff")
  res.json({msg:"✅ Server is running..."});
});


app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
