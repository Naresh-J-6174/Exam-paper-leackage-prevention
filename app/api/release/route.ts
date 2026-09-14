import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, getCurrentProfile } from "@/lib/supabaseServer";
import { sha256Hex } from "@/lib/crypto";
import { verifyPaperOnChain, releasePaperOnChain } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["invigilator", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only invigilators or admins can release papers." }, { status: 403 });
  }

  const { paperId } = await req.json();
  const supabase = createClient();
  const { data: paper, error } = await supabase.from("papers").select("*").eq("id", paperId).single();
  if (error || !paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  if (paper.revoked) {
    return NextResponse.json({ error: "This paper has been revoked and cannot be released." }, { status: 409 });
  }

  // Always re-verify immediately before release — never trust a stale check.
  const service = createServiceClient();
  const { data: fileData, error: downloadError } = await service.storage
    .from("exam-papers")
    .download(paper.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Could not fetch stored file." }, { status: 500 });
  }

  const bytes = Buffer.from(await fileData.arrayBuffer());
  const recomputedHash = sha256Hex(bytes);

  const matched = await verifyPaperOnChain(paper.chain_key, recomputedHash);
  if (!matched) {
    await supabase.from("access_log").insert({
      paper_id: paper.id,
      actor: profile.id,
      action: "release",
      result: "hash_mismatch",
    });
    return NextResponse.json(
      { error: "Hash mismatch detected — release blocked. The paper may have been tampered with." },
      { status: 409 }
    );
  }

  let txHash: string;
  try {
    txHash = await releasePaperOnChain(paper.chain_key);
  } catch (err: any) {
    return NextResponse.json({ error: `On-chain release failed: ${err.message}` }, { status: 500 });
  }

  await supabase.from("papers").update({ released: true }).eq("id", paper.id);
  await supabase.from("access_log").insert({
    paper_id: paper.id,
    actor: profile.id,
    action: "release",
    result: "success",
  });

  return NextResponse.json({ message: "Paper verified and released.", txHash });
}
