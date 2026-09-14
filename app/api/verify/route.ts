import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, getCurrentProfile } from "@/lib/supabaseServer";
import { sha256Hex } from "@/lib/crypto";
import { verifyPaperOnChain } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { paperId } = await req.json();
  if (!paperId) {
    return NextResponse.json({ error: "paperId is required." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: paper, error } = await supabase.from("papers").select("*").eq("id", paperId).single();
  if (error || !paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  // Re-download the (still encrypted) file exactly as stored and re-hash it.
  const service = createServiceClient();
  const { data: fileData, error: downloadError } = await service.storage
    .from("exam-papers")
    .download(paper.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Could not fetch stored file for verification." }, { status: 500 });
  }

  const bytes = Buffer.from(await fileData.arrayBuffer());
  const recomputedHash = sha256Hex(bytes);

  let matched = false;
  try {
    matched = await verifyPaperOnChain(paper.chain_key, recomputedHash);
  } catch (err: any) {
    return NextResponse.json({ error: `On-chain verification failed: ${err.message}` }, { status: 500 });
  }

  await supabase.from("access_log").insert({
    paper_id: paper.id,
    actor: profile.id,
    action: "verify",
    result: matched ? "success" : "hash_mismatch",
  });

  return NextResponse.json({
    matched,
    storedHash: paper.file_hash,
    recomputedHash,
    message: matched
      ? "Fingerprint matches the on-chain seal. The file is intact."
      : "MISMATCH — the stored file does not match its on-chain seal. Do not release it.",
  });
}
