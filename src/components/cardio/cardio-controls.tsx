"use client";

import { RefreshCw, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import { Button, buttonVariants } from "@/components/ui/button";

export function ConnectStravaButton() {
  return (
    <a href="/api/strava/connect" className={buttonVariants({ variant: "default" })}>
      <Link2 className="size-4" />
      Connect Strava
    </a>
  );
}

export function CardioControls() {
  const utils = trpc.useUtils();
  const sync = trpc.cardio.sync.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        toast.success(`Synced ${res.activitiesSynced} activity(ies).`);
        utils.cardio.invalidate();
      } else {
        toast.error(res.message ?? "Sync failed.");
      }
    },
    onError: (err) => toast.error(err.message),
  });
  const disconnect = trpc.cardio.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Disconnected from Strava.");
      utils.cardio.invalidate();
    },
  });

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => sync.mutate()}
        disabled={sync.isPending}
      >
        <RefreshCw className={`size-4 ${sync.isPending ? "animate-spin" : ""}`} />
        {sync.isPending ? "Syncing…" : "Sync now"}
      </Button>
      <Button
        variant="ghost"
        onClick={() => disconnect.mutate()}
        disabled={disconnect.isPending}
      >
        <Unlink className="size-4" />
        Disconnect
      </Button>
    </div>
  );
}
