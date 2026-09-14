import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledger Paper — Tamper-Evident Exam Distribution",
  description: "Blockchain-anchored, encrypted exam paper storage and release.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-parchment text-ink font-serif antialiased">{children}</body>
    </html>
  );
}
