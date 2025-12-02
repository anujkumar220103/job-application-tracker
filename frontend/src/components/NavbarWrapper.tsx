"use client";
import Navbar1 from "./Navbar";
import Navbar2 from "./Navbar2";
import { useAuth } from "@/context/AuthContext";

export default function NavbarWrapper() {
  const { user } = useAuth();
  return user ? <Navbar1 /> : <Navbar2 />;
}
