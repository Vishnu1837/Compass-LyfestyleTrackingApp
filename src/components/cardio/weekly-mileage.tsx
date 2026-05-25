"use client";

import { useMemo } from "react";
import { format, startOfWeek } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Activity {
  start_time: string;
  distance_m: number | null;
}

// Last 12 weeks of total distance (km), bucketed by week start (Monday).
export function WeeklyMileage({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const a of activities) {
      if (a.distance_m == null) continue;
      const wk = startOfWeek(new Date(a.start_time), { weekStartsOn: 1 });
      const key = format(wk, "yyyy-MM-dd");
      buckets.set(key, (buckets.get(key) ?? 0) + Number(a.distance_m) / 1000);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, km]) => ({
        week: format(new Date(key), "MMM d"),
        km: Math.round(km * 10) / 10,
      }));
  }, [activities]);

  if (data.length === 0) return null;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, top: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} minTickGap={16} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(v) => [`${Number(v)} km`, "Distance"]}
          />
          <Bar
            dataKey="km"
            className="fill-primary"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
