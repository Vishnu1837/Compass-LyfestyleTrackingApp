"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/react";
import { StepRing } from "@/components/steps/step-ring";
import { StepsHeatmap } from "@/components/steps/steps-heatmap";
import { LogStepsDialog } from "@/components/steps/log-steps-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STEP_GOAL = 10000;

export default function StepsPage() {
  const range = trpc.steps.range.useQuery({ days: 120 });

  const { today, weekAvg } = useMemo(() => {
    const rows = range.data ?? [];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const today =
      rows.find((r) => r.date === todayStr)?.step_count ?? 0;

    const last7 = rows.slice(-7);
    const weekAvg =
      last7.length > 0
        ? Math.round(
            last7.reduce((s, r) => s + (r.step_count ?? 0), 0) / last7.length,
          )
        : 0;
    return { today: Number(today), weekAvg };
  }, [range.data]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Steps</h1>
          <p className="text-muted-foreground">
            Daily step tracking. Auto-sync from your phone arrives with the
            mobile app.
          </p>
        </div>
        <LogStepsDialog defaultSteps={today || undefined} />
      </div>

      {range.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Today</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <StepRing steps={today} goal={STEP_GOAL} />
              <p className="text-muted-foreground text-sm">
                7-day average:{" "}
                <span className="text-foreground font-semibold">
                  {weekAvg.toLocaleString()}
                </span>{" "}
                steps
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Last 17 weeks</CardTitle>
            </CardHeader>
            <CardContent>
              {(range.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No steps logged yet. Use “Log steps” to add a day.
                </p>
              ) : (
                <StepsHeatmap data={range.data!} goal={STEP_GOAL} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
