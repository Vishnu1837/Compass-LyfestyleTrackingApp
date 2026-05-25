"use client";

import { Minus, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const GOAL_ML = 2500;

export default function WaterPage() {
  const utils = trpc.useUtils();
  const summary = trpc.water.summary.useQuery();
  const add = trpc.water.add.useMutation({
    onSuccess: () => utils.water.summary.invalidate(),
  });

  const today = summary.data?.todayMl ?? 0;

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Water</h1>
        <p className="text-muted-foreground">
          Daily goal {GOAL_ML / 1000} L.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {summary.isLoading ? (
            <Skeleton className="h-32 w-32 rounded-full" />
          ) : (
            <MacroRing
              label="Today"
              value={today}
              target={GOAL_ML}
              unit="ml"
              colorClass="stroke-sky-500"
              size={160}
            />
          )}

          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => add.mutate({ amountMl: 250 })} disabled={add.isPending}>
              <Plus className="size-4" />
              250 ml
            </Button>
            <Button onClick={() => add.mutate({ amountMl: 500 })} disabled={add.isPending}>
              <Plus className="size-4" />
              500 ml
            </Button>
            <Button
              variant="outline"
              onClick={() => add.mutate({ amountMl: -250 })}
              disabled={add.isPending || today <= 0}
            >
              <Minus className="size-4" />
              250 ml
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
