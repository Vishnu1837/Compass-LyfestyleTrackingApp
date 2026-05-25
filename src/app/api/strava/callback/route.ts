import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/cardio/strava/oauth";
import { encryptToken } from "@/lib/crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("strava_oauth_state")?.value;

  if (error || !code || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}/cardio?error=strava_auth`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const tokens = await exchangeCodeForTokens(code);
    await supabase.from("api_credentials").upsert(
      {
        user_id: user.id,
        provider: "strava",
        access_token: encryptToken(tokens.access_token),
        refresh_token: encryptToken(tokens.refresh_token),
        expires_at: new Date(tokens.expires_at * 1000).toISOString(),
        external_account_id: tokens.athlete?.id
          ? String(tokens.athlete.id)
          : null,
      },
      { onConflict: "user_id,provider" },
    );
  } catch {
    return NextResponse.redirect(`${origin}/cardio?error=strava_token`);
  }

  const res = NextResponse.redirect(`${origin}/cardio?connected=1`);
  res.cookies.delete("strava_oauth_state");
  return res;
}
