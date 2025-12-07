"use client";
import { useEffect, useState } from "react";
import JobCard from "@/components/JobCard";
import UpdateJobModal from "@/components/UpdateJobModal";
import { Job } from "@/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log("Fetched jobs:", data);
        setJobs(Array.isArray(data) ? data : data.data || []);   // handle different response formats
      } catch (err) {
        console.error("Error fetching jobs:", err);
      }
    };
    fetchJobs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((job) => job.id !== id));
      }
    } catch (err) {
      console.error("Error deleting job:", err);
    }
  };

  const handleUpdate = (id: number) => {
    const jobToEdit = jobs.find((j) => j.id === id);
    if (jobToEdit) setEditingJob(jobToEdit);
  };

  const handleSaveUpdate = async (updatedData: Partial<Job>) => {
    if (!editingJob) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/jobs/${editingJob.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedData),
        }
      );
      const result = await res.json();
      if (res.ok) {
        setJobs((prev) =>
          prev.map((job) =>
            job.id === editingJob.id ? { ...job, ...updatedData } : job
          )
        );
        setEditingJob(null);
        alert("Job updated successfully!");
      } else {
        alert(result.message || "Failed to update job");
      }
    } catch (err) {
      console.error("Error updating job:", err);
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-blue-600">
        Your Applications
      </h1>

      {jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No job applications yet.</p>
      )}

      {/* 🟦 Modal for update */}
      {editingJob && (
        <UpdateJobModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onUpdate={handleSaveUpdate}
        />
      )}
    </section>
  );
}
