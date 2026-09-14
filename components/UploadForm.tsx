"use client";

import { useState } from "react";

export default function UploadForm({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [examCode, setExamCode] = useState("");
  const [title, setTitle] = useState("");
  const [releaseAt, setReleaseAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const form = new FormData();
    form.append("file", file);
    form.append("examCode", examCode);
    form.append("title", title);
    form.append("releaseAt", releaseAt);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ text: data.error, ok: false });
      return;
    }

    setMessage({ text: data.message, ok: true });
    setFile(null);
    setExamCode("");
    setTitle("");
    setReleaseAt("");
    onUploaded();
  }

  return (
    <form onSubmit={handleSubmit} className="border border-ink/10 bg-white/40 p-5 space-y-4 mb-8">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-ink/70 mb-1">Exam code</label>
          <input
            required
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
            placeholder="CS301-MIDTERM"
            className="w-full border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:border-ink"
          />
        </div>
        <div>
          <label className="block text-sm text-ink/70 mb-1">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Data Structures — Midterm"
            className="w-full border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-ink/70 mb-1">Release at</label>
        <input
          required
          type="datetime-local"
          value={releaseAt}
          onChange={(e) => setReleaseAt(e.target.value)}
          className="w-full border border-ink/20 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:border-ink"
        />
      </div>

      <div>
        <label className="block text-sm text-ink/70 mb-1">Question paper file</label>
        <input
          required
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-ink text-parchment px-5 py-2 text-sm font-mono hover:bg-ink/90 transition-colors disabled:opacity-50"
      >
        {loading ? "Encrypting & sealing…" : "Encrypt, upload & seal on-chain"}
      </button>

      {message && <p className={`text-sm ${message.ok ? "text-signal" : "text-alert"}`}>{message.text}</p>}
    </form>
  );
}
