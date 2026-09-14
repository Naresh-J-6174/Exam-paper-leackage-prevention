import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient, getCurrentProfile } from "@/lib/supabaseServer";
import { encryptBuffer, sha256Hex } from "@/lib/crypto";
import { registerPaperOnChain } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !["teacher", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Only teachers or admins can upload papers." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const examCode = form.get("examCode") as string | null;
  const title = form.get("title") as string | null;
  const releaseAtStr = form.get("releaseAt") as string | null;

  if (!file || !examCode || !title || !releaseAtStr) {
    return NextResponse.json({ error: "file, examCode, title and releaseAt are required." }, { status: 400 });
  }

  const releaseAtUnix = Math.floor(new Date(releaseAtStr).getTime() / 1000);
  if (Number.isNaN(releaseAtUnix)) {
    return NextResponse.json({ error: "releaseAt is not a valid date/time." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const plainBuffer = Buffer.from(arrayBuffer);

  // 1. Encrypt before it ever leaves this request handler.
  const encrypted = encryptBuffer(plainBuffer);
  const fileHash = sha256Hex(encrypted);

  // 2. Upload encrypted bytes to Supabase Storage.
  const service = createServiceClient();
  const storagePath = `${examCode}/${Date.now()}-${file.name}.enc`;
  const { error: storageError } = await service.storage
    .from("exam-papers")
    .upload(storagePath, encrypted, { contentType: "application/octet-stream" });

  if (storageError) {
    return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });
  }

  // 3. Anchor the fingerprint on-chain.
  let chainResult;
  try {
    chainResult = await registerPaperOnChain(examCode, fileHash, releaseAtUnix);
  } catch (err: any) {
    return NextResponse.json({ error: `Blockchain registration failed: ${err.message}` }, { status: 500 });
  }

  // 4. Record everything in Postgres.
  const supabase = createClient();
  const { data: exam } = await supabase
    .from("exams")
    .upsert(
      { exam_code: examCode, title, release_at: releaseAtStr, created_by: profile.id },
      { onConflict: "exam_code" }
    )
    .select()
    .single();

  const { data: paper, error: paperError } = await supabase
    .from("papers")
    .insert({
      exam_id: exam?.id,
      storage_path: storagePath,
      file_hash: fileHash,
      chain_key: chainResult.key,
      chain_tx_hash: chainResult.txHash,
      uploaded_by: profile.id,
    })
    .select()
    .single();

  if (paperError) {
    return NextResponse.json({ error: paperError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Paper encrypted, stored, and sealed on-chain.",
    paper,
    chainTxHash: chainResult.txHash,
  });
}
