import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncStrava } from "@/lib/cardio/strava/sync";
import type { StravaWebhookEvent } from "@/lib/cardio/strava/types";

// Strava subscription validation handshake.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Near-realtime activity events. Strava expects a fast 200; we ack immediately
// and sync in the background.
export async function POST(request: Request) {
  let event: StravaWebhookEvent;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (event.object_type === "activity" && event.aspect_type !== "delete") {
    const supabase = createAdminClient();
    const { data: cred } = await supabase
      .from("api_credentials")
      .select("user_id")
      .eq("provider", "strava")
      .eq("external_account_id", String(event.owner_id))
      .maybeSingle();

    if (cred?.user_id) {
      // Fire-and-forget; don't block the webhook ack.
      void syncStrava(supabase, cred.user_id).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
