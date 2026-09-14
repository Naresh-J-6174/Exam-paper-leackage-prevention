"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import PapersTable from "@/components/PapersTable";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("teacher");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSetRole(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/admin/set-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: email, role }),
    });
    const data = await res.json();
    setMessage(data.message ?? data.error);
    setLoading(false);
  }

  return (
    <DashboardShell role="admin">
      <h1 className="text-2xl font-semibold mb-6">Assign roles</h1>
      <form onSubmit={handleSetRole} className="border border-ink/10 bg-white/40 p-5 mb-10 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm text-ink/70 mb-1">User email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:border-ink"
          >
            <option value="teacher">Teacher</option>
            <option value="invigilator">Invigilator</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-ink text-parchment px-5 py-2 text-sm font-mono hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set role"}
        </button>
        {message && <span className="text-sm text-ink/70">{message}</span>}
      </form>

      <h2 className="text-lg font-semibold mb-4">All papers</h2>
      <PapersTable role="admin" />
    </DashboardShell>
  );
}
