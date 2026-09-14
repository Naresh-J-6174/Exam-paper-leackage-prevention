import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, getCurrentProfile } from "@/lib/supabaseServer";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete papers." }, { status: 403 });
  }

  const supabase = createClient();
  const { data: paper, error } = await supabase.from("papers").select("*").eq("id", params.id).single();
  if (error || !paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  // Remove the encrypted file from Supabase Storage first.
  const service = createServiceClient();
  const { error: storageError } = await service.storage.from("exam-papers").remove([paper.storage_path]);
  if (storageError) {
    return NextResponse.json({ error: `Could not delete stored file: ${storageError.message}` }, { status: 500 });
  }

  // Then remove the database row (access_log rows cascade-delete automatically).
  const { error: deleteError } = await supabase.from("papers").delete().eq("id", paper.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Note: the fingerprint written on-chain at upload time is permanent and
  // cannot be deleted — this is expected. A bare hash with no file behind
  // it reveals nothing and cannot be used to reconstruct the paper.
  return NextResponse.json({ message: "Paper file and record deleted. The on-chain seal remains as a historical record but is now orphaned and harmless." });
}