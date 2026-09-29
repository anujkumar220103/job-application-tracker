"use client";
import { useEffect, useState } from "react";
import JobCard from "@/components/JobCard";
import UpdateJobModal from "@/components/UpdateJobModal";
import { Job } from "@/types";
import { API_BASE_URL } from "@/lib/apiBase";
import Link from "next/link";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log("Fetched jobs:", data);
        setJobs(Array.isArray(data) ? data : data.data || []);   // handle different response formats
      } catch (err) {
        console.error("Error fetching jobs:", err);
        setError("We couldn't load your applications. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
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
        `${API_BASE_URL}/jobs/${editingJob.id}`,
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
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Application workspace</p><h1 className="page-title mt-2">Your applications</h1><p className="page-copy">Keep the details and next step for every opportunity in one place.</p></div>
        <Link href="/add-job" className="button-primary">Add application</Link>
      </div>

      {loading ? (
        <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="surface p-5"><div className="skeleton h-5 w-1/2" /><div className="skeleton mt-3 h-4 w-1/3" /><div className="skeleton mt-3 h-3 w-1/4" /></div>)}</div>
      ) : error ? (
        <div className="surface p-8"><p className="font-bold text-[var(--foreground)]">Unable to load applications</p><p className="mt-2 text-sm text-[var(--muted)]">{error}</p></div>
      ) : jobs.length > 0 ? (
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
        <div className="surface p-10 text-center"><p className="font-bold text-[var(--foreground)]">No applications yet</p><p className="page-copy">Start tracking your applications by adding your first job.</p><Link href="/add-job" className="button-primary mt-6">Add application</Link></div>
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
