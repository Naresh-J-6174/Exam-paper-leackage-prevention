"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function DashboardShell({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-signal rounded-full" />
            <span className="font-mono text-sm text-ink/70">LEDGER PAPER</span>
            <span className="font-mono text-xs uppercase text-ink/40 border border-ink/20 px-2 py-0.5">
              {role}
            </span>
          </div>
          <button onClick={signOut} className="text-sm text-ink/60 hover:text-ink underline">
            Sign out
          </button>
        </div>
        {children}
      </div>
    </main>
  );
}
