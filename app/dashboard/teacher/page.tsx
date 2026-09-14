"use client";

import { useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import UploadForm from "@/components/UploadForm";
import PapersTable from "@/components/PapersTable";

export default function TeacherDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DashboardShell role="teacher">
      <h1 className="text-2xl font-semibold mb-6">Upload a paper</h1>
      <UploadForm onUploaded={() => setRefreshKey((k) => k + 1)} />

      <h2 className="text-lg font-semibold mb-4">Your sealed papers</h2>
      <PapersTable key={refreshKey} role="teacher" />
    </DashboardShell>
  );
}
