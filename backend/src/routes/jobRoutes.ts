// src/routes/jobRoutes.ts
import { Router } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  deleteJob,
} from "../controllers/jobController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = Router();


//temprarty home route
// router.get("/", (req, res) => {
//   res.send("jobs API is running ✅");
// });
// Protected routes — require valid token
router.post("/", authenticateUser, createJob);
router.get("/", authenticateUser, getAllJobs);
router.get("/:id", authenticateUser, getJobById);
router.put("/:id", authenticateUser, updateJob);
router.delete("/:id", authenticateUser, deleteJob);

export default router;
