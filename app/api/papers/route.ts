import { NextResponse } from "next/server";
import { createClient, getCurrentProfile } from "@/lib/supabaseServer";

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("papers")
    .select("id, chain_key, chain_tx_hash, file_hash, released, revoked, created_at, exams(exam_code, title, release_at)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ papers: data });
}
