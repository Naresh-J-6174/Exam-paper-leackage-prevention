import DashboardShell from "@/components/DashboardShell";
import PapersTable from "@/components/PapersTable";

export default function InvigilatorDashboard() {
  return (
    <DashboardShell role="invigilator">
      <h1 className="text-2xl font-semibold mb-6">Papers awaiting release</h1>
      <p className="text-sm text-ink/60 mb-6 leading-relaxed">
        Verifying re-downloads the stored file, recomputes its fingerprint, and checks it
        against the seal written on-chain at upload time. Release is blocked automatically
        if anything doesn't match.
      </p>
      <PapersTable role="invigilator" />
    </DashboardShell>
  );
}
