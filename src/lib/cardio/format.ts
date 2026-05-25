// Display helpers for cardio activities.

export function formatDistance(meters?: number | null): string {
  if (meters == null) return "—";
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// avg_pace is stored as seconds per km -> "m:ss /km".
export function formatPace(secPerKm?: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm)) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function formatActivityType(type?: string | null): string {
  if (!type) return "Activity";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
