"use client";

import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";

export function SyncButton() {
  const utils = trpc.useUtils();
  const sync = trpc.lyfta.sync.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(
          `Synced ${res.workoutsSynced} workout(s), ${res.exercisesSynced} exercises.`,
        );
        utils.workouts.invalidate();
        utils.lyfta.status.invalidate();
      } else {
        toast.error(res.message ?? "Sync failed.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button
      variant="outline"
      onClick={() => sync.mutate()}
      disabled={sync.isPending}
    >
      <RefreshCw className={`size-4 ${sync.isPending ? "animate-spin" : ""}`} />
      {sync.isPending ? "Syncing…" : "Sync now"}
    </Button>
  );
}
