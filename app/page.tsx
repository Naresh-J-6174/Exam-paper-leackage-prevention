import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="flex items-center gap-3 mb-16">
          <span className="w-3 h-3 bg-signal rounded-full" />
          <span className="font-mono text-sm text-ink/70">LEDGER PAPER</span>
        </div>

        <h1 className="text-5xl leading-tight font-semibold mb-6">
          A paper trail<br />that can't be forged.
        </h1>
        <p className="text-lg text-ink/80 max-w-xl mb-12 leading-relaxed">
          Every question paper is encrypted, sealed with a fingerprint on a public
          blockchain, and checked against that seal the moment before it's
          released. If a single character changes after upload, the mismatch
          is impossible to hide.
        </p>

        <div className="grid grid-cols-3 gap-px bg-ink/10 mb-16 border border-ink/10">
          {[
            ["01", "Teacher uploads", "File is encrypted and its hash is written on-chain."],
            ["02", "Chain holds the seal", "The fingerprint sits on a public ledger no one controls alone."],
            ["03", "Invigilator releases", "Hash is recomputed and compared before the file unlocks."],
          ].map(([n, title, body]) => (
            <div key={n} className="bg-parchment p-6">
              <div className="font-mono text-xs text-ink/40 mb-3">{n}</div>
              <div className="font-semibold mb-2">{title}</div>
              <div className="text-sm text-ink/70 leading-relaxed">{body}</div>
            </div>
          ))}
        </div>

        <Link
          href="/login"
          className="inline-block bg-ink text-parchment px-6 py-3 font-mono text-sm hover:bg-ink/90 transition-colors"
        >
          Sign in →
        </Link>
      </div>
    </main>
  );
}
