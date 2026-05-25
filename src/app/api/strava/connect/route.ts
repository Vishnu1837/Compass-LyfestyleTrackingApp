import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/cardio/strava/oauth";

// Kicks off the Strava OAuth flow for the logged-in user.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/strava/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const res = NextResponse.redirect(buildAuthorizeUrl(redirectUri, state));
  // CSRF guard: verify this same value comes back in the callback.
  res.cookies.set("strava_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
