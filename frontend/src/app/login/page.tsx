"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      // ✅ Save token to localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", data.name);
      // ✅ Redirect to dashboard
    //   router.push("/dashboard");
    window.location.href = "/";
    } catch (err:any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-sm mx-auto mt-20 bg-white p-6 rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4 text-blue-600">Login</h1>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="border p-2 w-full text-black rounded mb-3"
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="border p-2 w-full text-black rounded mb-3"
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className={`w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </section>
  );
}
