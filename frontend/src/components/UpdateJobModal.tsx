"use client";
import { useState } from "react";
import { Job } from "@/types";
import Modal from "@/components/Modal";

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
    <Modal open onClose={onClose} labelledById="update-job-title">
      <p className="eyebrow">Application details</p>
      <h2 id="update-job-title" className="page-title mt-2 text-2xl">Edit application</h2>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="field-label" htmlFor="edit-company">Company</label>
        <input
          id="edit-company"
          type="text"
          name="company"
          value={formData.company}
          onChange={handleChange}
          className="field-input"
          required
        />
        <label className="field-label" htmlFor="edit-position">Position</label>
        <input
          id="edit-position"
          type="text"
          name="position"
          value={formData.position}
          onChange={handleChange}
          className="field-input"
          required
        />
        <label className="field-label" htmlFor="edit-location">Location</label>
        <input
          id="edit-location"
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="field-input"
          required
        />
        <label className="field-label" htmlFor="edit-status">Status</label>
        <select
          id="edit-status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="field-input"
        >
          <option value="applied">Applied</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>
        <label className="field-label" htmlFor="edit-link">Application link</label>
        <input
          id="edit-link"
          type="text"
          name="link"
          value={formData.link}
          onChange={handleChange}
          className="field-input"
        />

        <div className="flex gap-3 pt-2">
          <button type="submit" className="button-primary">Save changes</button>
          <button type="button" onClick={onClose} className="button-secondary">Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
