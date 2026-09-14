import { NextRequest, NextResponse } from "next/server";
import { createClient, getCurrentProfile } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Only admins can change roles." }, { status: 403 });
  }

  const { userEmail, role } = await req.json();
  if (!userEmail || !["admin", "teacher", "invigilator"].includes(role)) {
    return NextResponse.json({ error: "userEmail and a valid role are required." }, { status: 400 });
  }

  const supabase = createClient();
  // Look the user up by email via the profiles/auth relation.
  const { data: authUsers, error: lookupError } = await supabase.rpc("get_user_id_by_email", {
    lookup_email: userEmail,
  });

  if (lookupError || !authUsers) {
    return NextResponse.json(
      { error: "Could not find that user. See README for the get_user_id_by_email SQL helper." },
      { status: 404 }
    );
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", authUsers);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: `${userEmail} is now ${role}.` });
}
