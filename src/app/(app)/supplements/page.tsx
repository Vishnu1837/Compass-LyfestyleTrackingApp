"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SupplementsPage() {
  const utils = trpc.useUtils();
  const list = trpc.supplements.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("mg");
  const [freq, setFreq] = useState("1");

  const invalidate = () => utils.supplements.list.invalidate();
  const add = trpc.supplements.add.useMutation({
    onSuccess: (r) => {
      if (r.ok) {
        toast.success("Supplement added.");
        invalidate();
        setOpen(false);
        setName("");
        setDose("");
      } else toast.error(r.message);
    },
  });
  const logTaken = trpc.supplements.logTaken.useMutation({ onSuccess: invalidate });
  const undoLast = trpc.supplements.undoLast.useMutation({ onSuccess: invalidate });
  const deactivate = trpc.supplements.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Removed.");
      invalidate();
    },
  });

  const supps = list.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Supplements</h1>
          <p className="text-muted-foreground">
            Tap “Taken” each time you take one. Compliance resets daily.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : supps.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            No supplements yet. Add one to start tracking.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {supps.map((s) => {
            const done = s.takenToday >= s.frequency_per_day;
            return (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.name}
                      {s.dose != null && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {s.dose}
                          {s.unit}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {s.takenToday}/{s.frequency_per_day} today
                      {done ? " · done ✓" : ""}
                    </p>
                  </div>
                  {s.takenToday > 0 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => undoLast.mutate({ supplementId: s.id })}
                      title="Undo last"
                    >
                      <Undo2 className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant={done ? "secondary" : "default"}
                    size="sm"
                    onClick={() => logTaken.mutate({ supplementId: s.id })}
                  >
                    <Check className="size-4" />
                    Taken
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deactivate.mutate({ id: s.id })}
                    title="Remove"
                  >
                    <X className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add supplement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Name</Label>
              <Input
                id="s-name"
                placeholder="e.g. Creatine"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="s-dose">Dose</Label>
                <Input
                  id="s-dose"
                  type="number"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-unit">Unit</Label>
                <Input
                  id="s-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-freq">Per day</Label>
                <Input
                  id="s-freq"
                  type="number"
                  min={1}
                  value={freq}
                  onChange={(e) => setFreq(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                add.mutate({
                  name: name.trim(),
                  dose: dose ? Number(dose) : undefined,
                  unit: unit || undefined,
                  frequencyPerDay: Number(freq) || 1,
                })
              }
              disabled={!name.trim() || add.isPending}
            >
              {add.isPending && <Loader2 className="size-4 animate-spin" />}
              Add supplement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
