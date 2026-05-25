"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpc } from "@/lib/trpc/react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazily mounted (only when expanded) so each chart costs one live API call.
export function ExerciseProgressChart({ exerciseId }: { exerciseId: string }) {
  const progress = trpc.workouts.exerciseProgress.useQuery(
    { exerciseId, days: 365 },
    { staleTime: 5 * 60 * 1000 },
  );

  if (progress.isLoading) return <Skeleton className="h-48 w-full" />;
  if (!progress.data || progress.data.points.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        No progress data for this exercise yet.
      </p>
    );
  }

  return (
    <div className="h-48 w-full">
      <p className="text-muted-foreground mb-2 text-xs">
        Estimated 1RM over the last year (kg)
      </p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={progress.data.points} margin={{ left: -16, top: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            labelFormatter={(l) => `Date: ${l}`}
            formatter={(v) => [`${Number(v)} kg`, "Est. 1RM"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            className="text-primary"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
