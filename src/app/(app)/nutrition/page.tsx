"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import { MacroRing } from "@/components/nutrition/macro-ring";
import { AddFoodDialog } from "@/components/nutrition/add-food-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Placeholder targets until the AI coach (Phase 7) sets them from your goals.
const TARGETS = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 };
const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];

export default function NutritionPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const utils = trpc.useUtils();
  const day = trpc.nutrition.day.useQuery({ date: today });
  const del = trpc.nutrition.deleteLog.useMutation({
    onSuccess: () => utils.nutrition.day.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const totals = day.data?.totals ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const rows = day.data?.rows ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
          <p className="text-muted-foreground">
            Today, {format(new Date(), "EEE, MMM d")}. Powered by Open Food Facts.
          </p>
        </div>
        <AddFoodDialog date={today} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s macros</CardTitle>
        </CardHeader>
        <CardContent>
          {day.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap justify-around gap-4">
                <MacroRing
                  label="Calories"
                  value={totals.calories}
                  target={TARGETS.calories}
                  unit=""
                  colorClass="stroke-primary"
                />
                <MacroRing
                  label="Protein"
                  value={totals.proteinG}
                  target={TARGETS.proteinG}
                  unit="g"
                  colorClass="stroke-red-500"
                />
                <MacroRing
                  label="Carbs"
                  value={totals.carbsG}
                  target={TARGETS.carbsG}
                  unit="g"
                  colorClass="stroke-amber-500"
                />
                <MacroRing
                  label="Fat"
                  value={totals.fatG}
                  target={TARGETS.fatG}
                  unit="g"
                  colorClass="stroke-sky-500"
                />
              </div>
              <p className="text-muted-foreground mt-4 text-center text-xs">
                Targets are placeholders — the AI coach will set them from your
                goals later.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Logged today
        </h2>
        {day.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Nothing logged yet. Use “Add food” to search and log a meal.
            </CardContent>
          </Card>
        ) : (
          MEAL_ORDER.filter((m) => rows.some((r) => r.meal === m)).map((m) => (
            <Card key={m}>
              <CardHeader>
                <CardTitle className="text-sm capitalize">{m}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows
                  .filter((r) => r.meal === m)
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {r.name}
                          {r.brand ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {r.brand}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {r.grams} g · {r.calories} kcal · P{r.proteinG} C
                          {r.carbsG} F{r.fatG}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => del.mutate({ id: r.id })}
                        disabled={del.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
