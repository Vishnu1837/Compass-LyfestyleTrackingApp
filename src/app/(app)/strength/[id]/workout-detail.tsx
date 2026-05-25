"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, ChevronDown, LineChart } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { ExerciseProgressChart } from "@/components/strength/exercise-progress-chart";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function WorkoutDetail({ id }: { id: string }) {
  const detail = trpc.workouts.detail.useQuery({ id });
  const [openChart, setOpenChart] = useState<string | null>(null);

  if (detail.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!detail.data) {
    return <p className="text-muted-foreground">Workout not found.</p>;
  }

  const { workout, exercises } = detail.data;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link
          href="/strength"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 mb-2",
          })}
        >
          <ArrowLeft className="size-4" />
          Back to strength
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {workout.title || "Workout"}
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(workout.performed_at), "EEEE, MMM d yyyy • h:mm a")}
          {workout.total_volume != null &&
            ` • ${Math.round(Number(workout.total_volume)).toLocaleString()} kg volume`}
          {workout.body_weight != null && ` • BW ${workout.body_weight} kg`}
        </p>
      </div>

      {exercises.map((ex) => (
        <Card key={ex.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{ex.exercise_name}</CardTitle>
            {ex.exercise_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setOpenChart(openChart === ex.id ? null : ex.id)
                }
              >
                <LineChart className="size-4" />
                Progress
                <ChevronDown
                  className={`size-4 transition-transform ${openChart === ex.id ? "rotate-180" : ""}`}
                />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Set</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Reps</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ex.sets.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.set_number}</TableCell>
                    <TableCell>
                      {s.weight != null ? `${s.weight} kg` : "—"}
                    </TableCell>
                    <TableCell>{s.reps ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.weight != null && s.reps != null
                        ? `${Math.round(Number(s.weight) * s.reps).toLocaleString()} kg`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {openChart === ex.id && ex.exercise_id && (
              <div className="mt-4 border-t pt-4">
                <ExerciseProgressChart exerciseId={ex.exercise_id} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
