import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../prisma/client";

const JWT_SECRET = process.env.JWT_SECRET as string;

// 🧾 Register
export const registerUser = async (req: Request, res: Response) => {
  try {
    console.log("fgdfg");
    const { name, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "Email klalready in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
    const r={name:user.name,id:user.id,email:user.email,createdAt:user.createdAt,updatedAt:user.updatedAt}
    console.log(r)
    res.status(201).json({ message: "User registered successfully", r});
  } catch (error: any) {
  console.error("Register Error:", error);
  res.status(500).json({ message: "Error registering user", error: error.message });
}


};

// 🔑 Login
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Login successful",name:user.name, token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
};
