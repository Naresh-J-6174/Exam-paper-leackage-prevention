"use client";

import { useEffect, useState, useCallback } from "react";

type Paper = {
  id: string;
  chain_key: string;
  chain_tx_hash: string;
  file_hash: string;
  released: boolean;
  revoked: boolean;
  created_at: string;
  exams: { exam_code: string; title: string; release_at: string } | null;
};

export default function PapersTable({ role }: { role: "admin" | "teacher" | "invigilator" }) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/papers");
    const data = await res.json();
    if (data.papers) setPapers(data.papers);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleVerify(id: string) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: id }),
    });
    const data = await res.json();
    setMessage({ id, text: data.message ?? data.error, ok: Boolean(data.matched) });
    setBusyId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this paper's file and record? This cannot be undone.")) return;
    setBusyId(id);
    setMessage(null);
    const res = await fetch(`/api/papers/${id}`, { method: "DELETE" });
    const data = await res.json();
    setMessage({ id, text: data.message ?? data.error, ok: res.ok });
    setBusyId(null);
    load();
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this paper? This cannot be undone and will block release/download.")) return;
    setBusyId(id);
    setMessage(null);
    const res = await fetch("/api/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: id, reason: "Revoked from admin dashboard" }),
    });
    const data = await res.json();
    setMessage({ id, text: data.message ?? data.error, ok: res.ok });
    setBusyId(null);
    load();
  }

  async function handleRelease(id: string) {
    setBusyId(id);
    setMessage(null);
    const res = await fetch("/api/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paperId: id }),
    });
    const data = await res.json();
    setMessage({ id, text: data.message ?? data.error, ok: res.ok });
    setBusyId(null);
    load();
  }

  if (papers.length === 0) {
    return <p className="text-ink/50 text-sm">No papers registered yet.</p>;
  }

  return (
    <div className="border border-ink/10 divide-y divide-ink/10">
      {papers.map((p) => (
        <div key={p.id} className="p-4 bg-white/40">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-semibold">{p.exams?.title ?? "Untitled exam"}</div>
              <div className="text-sm text-ink/60">
                {p.exams?.exam_code} · release {p.exams?.release_at ? new Date(p.exams.release_at).toLocaleString() : "—"}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              {p.revoked && <span className="seal-dot bg-alert" />}
              {!p.revoked && p.released && <span className="seal-dot bg-signal" />}
              {!p.revoked && !p.released && <span className="seal-dot bg-ink/30" />}
              {p.revoked ? "REVOKED" : p.released ? "RELEASED" : "SEALED"}
            </div>
          </div>

          <div className="hash-chip mb-3">{p.file_hash}</div>

          <div className="flex flex-wrap gap-2">
            {(role === "invigilator" || role === "admin") && !p.revoked && (
              <>
                <button
                  disabled={busyId === p.id}
                  onClick={() => handleVerify(p.id)}
                  className="px-3 py-1.5 text-xs font-mono border border-ink/30 hover:bg-ink hover:text-parchment transition-colors disabled:opacity-50"
                >
                  Verify hash
                </button>
                {!p.released && (
                  <button
                    disabled={busyId === p.id}
                    onClick={() => handleRelease(p.id)}
                    className="px-3 py-1.5 text-xs font-mono bg-signal text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Verify & release
                  </button>
                )}
              </>
            )}
            {p.released && !p.revoked && (
              <a
                href={`/api/papers/${p.id}/download`}
                className="px-3 py-1.5 text-xs font-mono border border-ink/30 hover:bg-ink hover:text-parchment transition-colors"
              >
                Download
              </a>
            )}
            {role === "admin" && !p.revoked && (
              <button
                disabled={busyId === p.id}
                onClick={() => handleRevoke(p.id)}
                className="px-3 py-1.5 text-xs font-mono border border-alert text-alert hover:bg-alert hover:text-white transition-colors disabled:opacity-50"
              >
                Revoke
              </button>
            )}
            {role === "admin" && (
              <button
                disabled={busyId === p.id}
                onClick={() => handleDelete(p.id)}
                className="px-3 py-1.5 text-xs font-mono border border-ink/30 text-ink/70 hover:bg-ink hover:text-parchment transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>

          {message?.id === p.id && (
            <p className={`mt-2 text-sm ${message.ok ? "text-signal" : "text-alert"}`}>{message.text}</p>
          )}
        </div>
      ))}
    </div>
  );
}
