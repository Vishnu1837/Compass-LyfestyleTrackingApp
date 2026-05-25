"use client";

import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";

interface DayRow {
  date: string;
  step_count: number | null;
}

// GitHub-style contribution heatmap of the last ~17 weeks of steps.
export function StepsHeatmap({
  data,
  goal,
}: {
  data: DayRow[];
  goal: number;
}) {
  const { weeks, byDate } = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.date, d.step_count ?? 0);

    const today = new Date();
    const end = startOfWeek(today, { weekStartsOn: 1 });
    const WEEKS = 17;
    const start = addDays(end, -7 * (WEEKS - 1));

    const cols: Date[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) col.push(addDays(start, w * 7 + d));
      cols.push(col);
    }
    return { weeks: cols, byDate: map };
  }, [data]);

  function level(steps: number): string {
    if (steps <= 0) return "bg-muted";
    const r = steps / goal;
    if (r >= 1) return "bg-primary";
    if (r >= 0.66) return "bg-primary/70";
    if (r >= 0.33) return "bg-primary/40";
    return "bg-primary/20";
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((col, i) => (
        <div key={i} className="flex flex-col gap-1">
          {col.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const steps = byDate.get(key) ?? 0;
            const future = key > todayStr;
            return (
              <div
                key={key}
                title={`${format(day, "MMM d")}: ${steps.toLocaleString()} steps`}
                className={`size-3 rounded-sm ${future ? "bg-transparent" : level(steps)}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
