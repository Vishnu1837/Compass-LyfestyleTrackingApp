"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function localInput(d: Date) {
  // YYYY-MM-DDTHH:MM in local time for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SleepPage() {
  const utils = trpc.useUtils();
  const list = trpc.sleep.list.useQuery({ days: 30 });

  const now = new Date();
  const defaultBed = new Date(now);
  defaultBed.setDate(now.getDate() - 1);
  defaultBed.setHours(23, 0, 0, 0);
  const defaultWake = new Date(now);
  defaultWake.setHours(7, 0, 0, 0);

  const [bedtime, setBedtime] = useState(localInput(defaultBed));
  const [wakeTime, setWakeTime] = useState(localInput(defaultWake));
  const [quality, setQuality] = useState(3);

  const upsert = trpc.sleep.upsert.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        const h = Math.floor(res.durationMinutes / 60);
        const m = res.durationMinutes % 60;
        toast.success(`Logged ${h}h ${m}m of sleep.`);
        utils.sleep.list.invalidate();
      } else {
        toast.error(res.message);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const chart = (list.data ?? []).map((r) => ({
    day: format(new Date(r.date), "MMM d"),
    hours: r.duration_minutes ? Math.round((r.duration_minutes / 60) * 10) / 10 : 0,
  }));

  const last7 = (list.data ?? []).slice(-7);
  const avgHours =
    last7.length > 0
      ? Math.round(
          (last7.reduce((s, r) => s + (r.duration_minutes ?? 0), 0) /
            last7.length /
            60) *
            10,
        ) / 10
      : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sleep</h1>
        <p className="text-muted-foreground">
          Log your nights. 7-night average:{" "}
          <span className="text-foreground font-semibold">{avgHours}h</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log a night</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bedtime">Bedtime</Label>
              <Input
                id="bedtime"
                type="datetime-local"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wake">Wake time</Label>
              <Input
                id="wake"
                type="datetime-local"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quality">Quality: {quality}/5</Label>
            <input
              id="quality"
              type="range"
              min={1}
              max={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <Button
            onClick={() =>
              upsert.mutate({
                bedtime: new Date(bedtime).toISOString(),
                wakeTime: new Date(wakeTime).toISOString(),
                quality,
              })
            }
            disabled={upsert.isPending}
          >
            {upsert.isPending && <Loader2 className="size-4 animate-spin" />}
            Save night
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duration trend</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : chart.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No nights logged yet.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ left: -16, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={32} unit="h" />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(v) => [`${Number(v)} h`, "Sleep"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    className="stroke-primary"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
