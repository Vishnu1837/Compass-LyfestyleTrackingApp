"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Heart, Mountain, Route } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import {
  CardioControls,
  ConnectStravaButton,
} from "@/components/cardio/cardio-controls";
import { WeeklyMileage } from "@/components/cardio/weekly-mileage";
import {
  formatActivityType,
  formatDistance,
  formatDuration,
  formatPace,
} from "@/lib/cardio/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CardioPage() {
  const status = trpc.cardio.status.useQuery();
  const connected = status.data?.connected ?? false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cardio</h1>
          <p className="text-muted-foreground">
            Runs, rides, swims and hikes synced from Strava.
            {status.data?.lastSyncAt
              ? ` Last sync ${format(new Date(status.data.lastSyncAt), "MMM d, h:mm a")}.`
              : ""}
          </p>
        </div>
        {connected ? <CardioControls /> : null}
      </div>

      {status.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : connected ? (
        <ConnectedView />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connect Strava</CardTitle>
            <CardDescription>
              Authorize Strava to pull in your activities with GPS routes, pace,
              heart rate and elevation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectStravaButton />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConnectedView() {
  const activities = trpc.cardio.list.useQuery({ limit: 100 });

  if (activities.isLoading) return <Skeleton className="h-96 w-full" />;
  const items = activities.data ?? [];

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No activities yet. Hit “Sync now” to pull them from Strava.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly mileage</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyMileage activities={items} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Recent activities
        </h2>
        {items.map((a) => (
          <Link key={a.id} href={`/cardio/${a.id}`} className="block">
            <Card className="hover:bg-accent/40 transition-colors">
              <CardContent className="flex items-center gap-4 py-4">
                <Route className="text-muted-foreground size-5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{formatActivityType(a.type)}</p>
                  <p className="text-muted-foreground text-sm">
                    {format(new Date(a.start_time), "EEE, MMM d yyyy")}
                  </p>
                </div>
                <div className="hidden gap-2 sm:flex">
                  <Badge variant="secondary">{formatDistance(a.distance_m)}</Badge>
                  <Badge variant="outline">{formatPace(a.avg_pace)}</Badge>
                  {a.avg_hr != null && (
                    <Badge variant="outline" className="gap-1">
                      <Heart className="size-3" />
                      {a.avg_hr}
                    </Badge>
                  )}
                  {a.elevation_gain_m != null && (
                    <Badge variant="outline" className="gap-1">
                      <Mountain className="size-3" />
                      {Math.round(Number(a.elevation_gain_m))} m
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground text-sm tabular-nums sm:hidden">
                  {formatDuration(a.duration_seconds)}
                </span>
                <ChevronRight className="text-muted-foreground size-4" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
