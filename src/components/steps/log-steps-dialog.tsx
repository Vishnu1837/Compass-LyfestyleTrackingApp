"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LogStepsDialog({
  defaultDate,
  defaultSteps,
}: {
  defaultDate?: string;
  defaultSteps?: number;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(
    defaultDate ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [steps, setSteps] = useState(String(defaultSteps ?? ""));

  const upsert = trpc.steps.upsertDay.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Steps logged.");
        utils.steps.range.invalidate();
        setOpen(false);
      } else {
        toast.error(res.message);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Log steps
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log steps</DialogTitle>
            <DialogDescription>
              Enter your step count for a day. Logging the same day again
              updates it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="step-date">Date</Label>
              <Input
                id="step-date"
                type="date"
                max={format(new Date(), "yyyy-MM-dd")}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-count">Steps</Label>
              <Input
                id="step-count"
                type="number"
                min={0}
                placeholder="e.g. 8500"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                upsert.mutate({ date, stepCount: Number(steps) || 0 })
              }
              disabled={upsert.isPending || steps === ""}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
