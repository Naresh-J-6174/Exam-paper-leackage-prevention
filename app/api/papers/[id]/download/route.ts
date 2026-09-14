import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, getCurrentProfile } from "@/lib/supabaseServer";
import { decryptBuffer } from "@/lib/crypto";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createClient();
  const { data: paper, error } = await supabase.from("papers").select("*").eq("id", params.id).single();
  if (error || !paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  if (!paper.released || paper.revoked) {
    await supabase.from("access_log").insert({
      paper_id: paper.id,
      actor: profile.id,
      action: "download",
      result: "denied",
    });
    return NextResponse.json({ error: "This paper has not been released yet." }, { status: 403 });
  }

  const service = createServiceClient();
  const { data: fileData, error: downloadError } = await service.storage
    .from("exam-papers")
    .download(paper.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Could not fetch stored file." }, { status: 500 });
  }

  const encrypted = Buffer.from(await fileData.arrayBuffer());
  const decrypted = decryptBuffer(encrypted);

  await supabase.from("access_log").insert({
    paper_id: paper.id,
    actor: profile.id,
    action: "download",
    result: "success",
  });

  return new NextResponse(new Uint8Array(decrypted), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${paper.storage_path.split("/").pop()?.replace(/\.enc$/, "")}"`,
    },
  });
}
