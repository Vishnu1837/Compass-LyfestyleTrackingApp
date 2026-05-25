"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Dumbbell, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { LyftaSetup } from "@/components/strength/lyfta-setup";
import { SyncButton } from "@/components/strength/sync-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PR_LABELS: Record<string, string> = {
  "1rm": "Est. 1RM",
  volume: "Best volume",
  reps: "Most reps",
};

export default function StrengthPage() {
  const status = trpc.lyfta.status.useQuery();
  const connected = status.data?.connected ?? false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Strength</h1>
          <p className="text-muted-foreground">
            Workouts synced from Lyfta.
            {status.data?.lastSyncAt
              ? ` Last sync ${format(new Date(status.data.lastSyncAt), "MMM d, h:mm a")}.`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {connected && <SyncButton />}
          <LyftaSetup connected={connected} />
        </div>
      </div>

      {status.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : connected ? (
        <ConnectedView />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connect Lyfta to get started</CardTitle>
            <CardDescription>
              Paste your Lyfta API key and we&apos;ll pull in your workout
              history, exercises, and personal records.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function ConnectedView() {
  const workouts = trpc.workouts.list.useQuery({ limit: 30 });
  const prs = trpc.workouts.recentPRs.useQuery({ limit: 8 });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Recent workouts
        </h2>
        {workouts.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (workouts.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              No workouts yet. Hit “Sync now” to pull them from Lyfta.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {workouts.data!.map((w) => (
              <Link key={w.id} href={`/strength/${w.id}`} className="block">
                <Card className="hover:bg-accent/40 transition-colors">
                  <CardContent className="flex items-center gap-4 py-4">
                    <Dumbbell className="text-muted-foreground size-5" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {w.title || "Workout"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {format(new Date(w.performed_at), "EEE, MMM d yyyy")}
                      </p>
                    </div>
                    {w.total_volume != null && (
                      <Badge variant="secondary">
                        {Math.round(Number(w.total_volume)).toLocaleString()} kg
                      </Badge>
                    )}
                    <ChevronRight className="text-muted-foreground size-4" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Personal records
        </h2>
        <Card>
          <CardContent className="py-4">
            {prs.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (prs.data?.length ?? 0) === 0 ? (
              <p className="text-muted-foreground text-sm">
                Records appear after your first sync.
              </p>
            ) : (
              <ul className="space-y-3">
                {prs.data!.map((pr) => {
                  const exercise = pr.exercises as { name?: string } | null;
                  return (
                    <li key={pr.id} className="flex items-center gap-3">
                      <Trophy className="size-4 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {exercise?.name ?? "Exercise"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {PR_LABELS[pr.record_type] ?? pr.record_type}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {Number(pr.value).toLocaleString()}
                        {pr.record_type === "reps" ? "" : " kg"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
