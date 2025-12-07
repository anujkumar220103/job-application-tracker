"use client";
import { useEffect, useState } from "react";
import { Job } from "@/types";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // defensive: check HTTP status
        if (!res.ok) {
          console.error("Failed to fetch jobs:", res.status, await res.text());
          setJobs([]);
          return;
        }

        const data2 = await res.json();
        
        const jobsArray = Array.isArray(data2) ? data2 : Array.isArray(data2?.data) ? data2.data : [];
        console.log("Dashboard - jobsArray:", jobsArray);
        setJobs(jobsArray);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setJobs([]);
      }
    };
    fetchJobs();
  }, []);

  const total = jobs.length;
  const counts = {
    applied: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "applied").length,
    interview: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "interview").length,
    offer: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "offer").length,
    rejected: jobs.filter((j) => (j?.status ?? "").toLowerCase() === "rejected").length,
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-blue-600">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="bg-white border rounded-lg shadow-sm p-4 text-center">
            <h2 className="font-semibold capitalize text-black">{key}</h2>
            <p className="text-2xl font-bold text-blue-600">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-gray-700">Total Applications: {total}</p>
    </section>
  );
}
