"use client";
import { useState } from "react";
import api from "../api/client";

export default function AddJobPage() {
  const [form, setForm] = useState({
    company: "",
    position: "",
    location: "",
    status: "applied",
    link: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const token =localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:`Bearer ${token}`
        },
        body: JSON.stringify(form),
      });
      alert("Job added successfully!");
      setForm({ company: "", position: "", location: "", status: "applied", link: "" });
    } catch (err) {
      console.error("Error adding job:", err);
      alert("Failed to add job");
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6 text-blue-600">Add a New Job</h1>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 max-w-md mx-auto bg-white shadow p-6 rounded-lg"
      >
        <input
          type="text"
          name="company"
          placeholder="Company"
          value={form.company}
          onChange={handleChange}
          className="border p-2 rounded text-black"
          required
        />
        <input
          type="text"
          name="position"
          placeholder="Position"
          value={form.position}
          onChange={handleChange}
          className="border p-2 rounded text-black"
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          className="border p-2 rounded text-black"
          required
        />
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="border p-2 rounded text-black"
        >
          <option value="applied">Applied</option>
          <option value="interview">Interview</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="url"
          name="link"
          placeholder="Application Link"
          value={form.link}
          onChange={handleChange}
          className="border p-2 rounded text-black"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Add Job
        </button>
      </form>
    </section>
  );
}
