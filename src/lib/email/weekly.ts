import { Resend } from "resend";
import type { AccountabilitySummary } from "@/lib/accountability/score";
import type { CoachReview } from "@/lib/ai/types";

const FROM = process.env.EMAIL_FROM ?? "VXthenics <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

const SUBSCORES: { key: keyof AccountabilitySummary["subscores"]; label: string }[] = [
  { key: "workout", label: "Workouts" },
  { key: "cardio", label: "Cardio" },
  { key: "nutrition", label: "Nutrition" },
  { key: "sleep", label: "Sleep" },
  { key: "supplements", label: "Supplements" },
];

function buildHtml(summary: AccountabilitySummary, review: CoachReview | null): string {
  const rows = SUBSCORES.map(
    (s) =>
      `<tr><td style="padding:4px 8px;">${s.label}</td><td style="padding:4px 8px;text-align:right;font-variant-numeric:tabular-nums;">${summary.subscores[s.key]}/20</td></tr>`,
  ).join("");

  const recs = review?.recommendations?.length
    ? `<h3 style="margin:16px 0 4px;">This week's focus</h3><ul style="margin:0;padding-left:18px;">${review.recommendations
        .map((r) => `<li><strong style="text-transform:capitalize;">${r.area}:</strong> ${r.suggestion}</li>`)
        .join("")}</ul>`
    : "";

  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#111;">
    <h1 style="font-size:22px;margin:0 0 4px;">Your VXthenics week</h1>
    <p style="color:#555;margin:0 0 16px;">Weekly consistency score</p>
    <div style="font-size:48px;font-weight:800;">${summary.total}<span style="font-size:20px;color:#888;">/100</span></div>
    <table style="border-collapse:collapse;margin:12px 0;width:100%;font-size:14px;">${rows}</table>
    ${review?.summary ? `<p style="font-size:14px;line-height:1.5;">${review.summary}</p>` : ""}
    ${recs}
    <p style="color:#999;font-size:12px;margin-top:24px;">Logged in VXthenics. Reply STOP to opt out.</p>
  </div>`;
}

export async function sendWeeklyEmail(
  to: string,
  summary: AccountabilitySummary,
  review: CoachReview | null,
): Promise<{ ok: boolean; message?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, message: "RESEND_API_KEY not set" };

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your week: ${summary.total}/100`,
    html: buildHtml(summary, review),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
