"use client";
import Navbar from "@/components/Navbar";
import Navbar2 from "@/components/Navbar2";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [user,setUser]=useState("")
  useEffect(()=>{
    const u=localStorage.getItem('user')||"";
    setUser(u);
  },[])
  return (
    <div>
      {/* <div>
        {user!=""?<Navbar2></Navbar2>:<Navbar></Navbar>}
      </div> */}
      <section className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4 text-blue-600">
        Welcome to Application Tracker
      </h1>
      <p className="text-gray-700 max-w-2xl mx-auto">
        Track all your job applications, monitor status updates, and manage your career journey — all in one place.
      </p>
    </section>
    </div>
  );
}
