import { NextRequest, NextResponse } from "next/server";
import { createClient, getCurrentProfile } from "@/lib/supabaseServer";
import { revokePaperOnChain } from "@/lib/blockchain";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Only admins can revoke papers." }, { status: 403 });
  }

  const { paperId, reason } = await req.json();
  const supabase = createClient();
  const { data: paper, error } = await supabase.from("papers").select("*").eq("id", paperId).single();
  if (error || !paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  try {
    await revokePaperOnChain(paper.chain_key, reason ?? "Revoked by admin");
  } catch (err: any) {
    return NextResponse.json({ error: `On-chain revoke failed: ${err.message}` }, { status: 500 });
  }

  await supabase.from("papers").update({ revoked: true }).eq("id", paper.id);
  await supabase.from("access_log").insert({
    paper_id: paper.id,
    actor: profile.id,
    action: "revoke",
    result: "success",
  });

  return NextResponse.json({ message: "Paper revoked." });
}
