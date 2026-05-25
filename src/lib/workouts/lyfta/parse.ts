// Lyfta returns many numeric fields as strings, and sometimes the literal
// string "null" instead of JSON null. These helpers normalize that mess.

export function isNullish(v: unknown): boolean {
  return v === null || v === undefined || v === "null" || v === "";
}

export function toNumber(v: unknown): number | null {
  if (isNullish(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toInt(v: unknown): number | null {
  const n = toNumber(v);
  return n === null ? null : Math.trunc(n);
}

// Lyfta dates look like "2026-05-18 11:01:25" (space, no timezone) or a plain
// "2026-05-18". They carry no timezone, so we interpret them as UTC — this is
// deterministic regardless of host timezone (local dev vs. UTC on Vercel).
export function toDate(v: unknown): Date {
  if (typeof v !== "string" || !v) return new Date(NaN);
  if (v.includes(" ")) return new Date(`${v.replace(" ", "T")}Z`);
  return new Date(v); // date-only is already parsed as UTC midnight
}

// equipment_id etc. come as a JSON-encoded string like '["1","2"]', or the
// string "null". Parse to a string[] of ids.
export function toIdArray(v: unknown): string[] {
  if (isNullish(v)) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string") return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
