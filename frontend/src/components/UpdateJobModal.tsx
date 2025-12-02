"use client";
import { useState } from "react";
import { Job } from "@/types";

interface UpdateJobModalProps {
  job: Job;
  onClose: () => void;
  onUpdate: (updatedJob: Partial<Job>) => void;
}

export default function UpdateJobModal({
  job,
  onClose,
  onUpdate,
}: UpdateJobModalProps) {
  const [formData, setFormData] = useState({
    company: job.company || "",
    position: job.position || "",
    location: job.location || "",
    status: job.status || "applied",
    link: job.link || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-blue-600">Update Job</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Company"
            className="border p-2 rounded text-black"
            required
          />
          <input
            type="text"
            name="position"
            value={formData.position}
            onChange={handleChange}
            placeholder="Position"
            className="border p-2 rounded text-black" 
            required
          />
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="Location"
            className="border p-2 rounded text-black"
            required
          />
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="border p-2 rounded text-black"
          >
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="text"
            name="link"
            value={formData.link}
            onChange={handleChange}
            placeholder="Application Link"
            className="border p-2 rounded text-black"
          />

          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            Update Job
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 mt-2 hover:underline"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
