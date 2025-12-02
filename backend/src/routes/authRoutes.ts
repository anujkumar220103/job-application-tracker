import express from "express";
import { registerUser, loginUser } from "../controllers/authController";

const router = express.Router();

//temprarty home route
router.get("/", (req, res) => {
  // console.error("vfdgf")
  res.send("Auth API is running ✅");
});
//is line upr tk
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
