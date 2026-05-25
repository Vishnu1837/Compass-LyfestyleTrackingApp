"use client";

import { useState } from "react";
import { Loader2, Plus, Search, Barcode } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import type { NormalizedFood } from "@/lib/nutrition/off";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
type Meal = (typeof MEALS)[number];

export function AddFoodDialog({ date }: { date: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [selected, setSelected] = useState<NormalizedFood | null>(null);
  const [grams, setGrams] = useState("100");
  const [meal, setMeal] = useState<Meal>("breakfast");

  const search = trpc.nutrition.search.useQuery(
    { query: activeQuery },
    { enabled: activeQuery.length >= 2 },
  );
  const barcodeLookup = trpc.nutrition.barcode.useMutation();
  const log = trpc.nutrition.log.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Food logged.");
        utils.nutrition.day.invalidate();
        reset();
        setOpen(false);
      } else {
        toast.error(res.message);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  function reset() {
    setQuery("");
    setActiveQuery("");
    setBarcode("");
    setSelected(null);
    setGrams("100");
  }

  async function handleBarcode() {
    const food = await barcodeLookup.mutateAsync({ barcode });
    if (food) setSelected(food);
    else toast.error("No product found for that barcode.");
  }

  const factor = (Number(grams) || 0) / 100;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add food
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add food</DialogTitle>
            <DialogDescription>
              Search Open Food Facts or enter a barcode. Macros are per 100 g.
            </DialogDescription>
          </DialogHeader>

          {!selected ? (
            <div className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setActiveQuery(query.trim());
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Search foods (e.g. greek yogurt)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button type="submit" variant="outline" disabled={query.trim().length < 2}>
                  <Search className="size-4" />
                </Button>
              </form>

              <div className="flex gap-2">
                <Input
                  placeholder="or enter a barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBarcode}
                  disabled={barcode.trim().length < 4 || barcodeLookup.isPending}
                >
                  {barcodeLookup.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Barcode className="size-4" />
                  )}
                </Button>
              </div>

              {search.isFetching && (
                <p className="text-muted-foreground text-sm">Searching…</p>
              )}
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {(search.data ?? []).map((f, i) => (
                  <button
                    key={`${f.barcode}-${i}`}
                    type="button"
                    onClick={() => setSelected(f)}
                    className="hover:bg-accent flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {f.name}
                      {f.brand ? (
                        <span className="text-muted-foreground"> · {f.brand}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {f.calories} kcal
                    </span>
                  </button>
                ))}
                {activeQuery.length >= 2 &&
                  !search.isFetching &&
                  (search.data?.length ?? 0) === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No results with nutrition data.
                    </p>
                  )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selected.name}</p>
                {selected.brand && (
                  <p className="text-muted-foreground text-sm">{selected.brand}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grams">Amount (g)</Label>
                  <Input
                    id="grams"
                    type="number"
                    min={1}
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meal">Meal</Label>
                  <select
                    id="meal"
                    value={meal}
                    onChange={(e) => setMeal(e.target.value as Meal)}
                    className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm capitalize"
                  >
                    {MEALS.map((m) => (
                      <option key={m} value={m} className="capitalize">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-muted-foreground grid grid-cols-4 gap-2 text-center text-xs">
                <Macro label="kcal" v={selected.calories} f={factor} />
                <Macro label="P" v={selected.proteinG} f={factor} />
                <Macro label="C" v={selected.carbsG} f={factor} />
                <Macro label="F" v={selected.fatG} f={factor} />
              </div>

              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setSelected(null)}>
                  Back
                </Button>
                <Button
                  onClick={() =>
                    log.mutate({
                      food: selected,
                      date,
                      meal,
                      grams: Number(grams) || 0,
                    })
                  }
                  disabled={log.isPending || !grams}
                >
                  {log.isPending && <Loader2 className="size-4 animate-spin" />}
                  Log it
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Macro({ label, v, f }: { label: string; v: number | null; f: number }) {
  return (
    <div className="bg-muted rounded-md py-2">
      <div className="text-foreground font-semibold tabular-nums">
        {v != null ? Math.round(v * f) : "—"}
      </div>
      <div>{label}</div>
    </div>
  );
}
