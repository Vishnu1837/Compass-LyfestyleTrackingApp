"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatActivityType,
  formatDistance,
  formatDuration,
  formatPace,
} from "@/lib/cardio/format";

// Leaflet touches `window`, so the map must be client-only.
const RouteMap = dynamic(
  () => import("@/components/cardio/route-map").then((m) => m.RouteMap),
  { ssr: false, loading: () => <Skeleton className="h-72 w-full" /> },
);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ActivityDetail({ id }: { id: string }) {
  const activity = trpc.cardio.detail.useQuery({ id });

  if (activity.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!activity.data) {
    return <p className="text-muted-foreground">Activity not found.</p>;
  }

  const a = activity.data;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/cardio"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-2",
          })}
        >
          <ArrowLeft className="size-4" />
          Back to cardio
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {formatActivityType(a.type)}
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(a.start_time), "EEEE, MMM d yyyy • h:mm a")}
        </p>
      </div>

      <RouteMap encoded={a.polyline} />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-3">
          <Stat label="Distance" value={formatDistance(a.distance_m)} />
          <Stat label="Time" value={formatDuration(a.duration_seconds)} />
          <Stat label="Pace" value={formatPace(a.avg_pace)} />
          {a.avg_hr != null && <Stat label="Avg HR" value={`${a.avg_hr} bpm`} />}
          {a.max_hr != null && <Stat label="Max HR" value={`${a.max_hr} bpm`} />}
          {a.elevation_gain_m != null && (
            <Stat
              label="Elevation"
              value={`${Math.round(Number(a.elevation_gain_m))} m`}
            />
          )}
          {a.avg_power != null && (
            <Stat label="Avg power" value={`${a.avg_power} W`} />
          )}
          {a.calories != null && (
            <Stat label="Calories" value={`${a.calories}`} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
