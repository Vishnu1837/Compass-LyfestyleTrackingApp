"use client";

import {
  Droplet,
  Dumbbell,
  Flame,
  Heart,
  Moon,
  Pill,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { MacroRing } from "@/components/nutrition/macro-ring";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const HABIT_META: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  workout: { label: "Workouts", icon: Dumbbell },
  cardio: { label: "Cardio", icon: Heart },
  nutrition: { label: "Nutrition", icon: UtensilsCrossed },
  sleep: { label: "Sleep", icon: Moon },
  supplements: { label: "Supplements", icon: Pill },
  water: { label: "Water", icon: Droplet },
};

const SUBSCORE_KEYS = [
  "workout",
  "cardio",
  "nutrition",
  "sleep",
  "supplements",
] as const;

export default function AccountabilityPage() {
  const summary = trpc.accountability.summary.useQuery();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accountability</h1>
        <p className="text-muted-foreground">
          Your weekly consistency score and habit streaks.
        </p>
      </div>

      {summary.isLoading || !summary.data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This week</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
              <MacroRing
                label="Score"
                value={summary.data.total}
                target={100}
                unit=""
                colorClass="stroke-primary"
                size={150}
              />
              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                {SUBSCORE_KEYS.map((k) => {
                  const meta = HABIT_META[k];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={k}
                      className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2"
                    >
                      <Icon className="text-muted-foreground size-4" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {summary.data.subscores[k]}/20 ·{" "}
                          {summary.data.daysMetThisWeek[k]}/7 days
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium tracking-wide uppercase">
              Current streaks
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(HABIT_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const streak = summary.data!.streaks[key as keyof typeof summary.data.streaks] ?? 0;
                return (
                  <Card key={key}>
                    <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
                      <Icon className="text-muted-foreground size-5" />
                      <div className="flex items-center gap-1">
                        <Flame
                          className={`size-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground"}`}
                        />
                        <span className="text-xl font-bold tabular-nums">
                          {streak}
                        </span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {meta.label}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
