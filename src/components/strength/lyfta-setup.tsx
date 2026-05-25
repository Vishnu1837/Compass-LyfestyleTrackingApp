"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function LyftaSetup({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testResult, setTestResult] = useState<
    { ok: true; username?: string } | { ok: false; message: string } | null
  >(null);

  const testConnection = trpc.lyfta.testConnection.useMutation();
  const connect = trpc.lyfta.connect.useMutation();

  async function handleTest() {
    setTestResult(null);
    const res = await testConnection.mutateAsync({ apiKey });
    setTestResult(res);
  }

  async function handleConnect() {
    const res = await connect.mutateAsync({ apiKey });
    if (res.ok) {
      toast.success(
        `Connected to Lyfta${res.username ? ` as ${res.username}` : ""}.`,
      );
      setOpen(false);
      setApiKey("");
      setTestResult(null);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant={connected ? "outline" : "default"}>
        <KeyRound className="size-4" />
        {connected ? "Update Lyfta key" : "Connect Lyfta"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Lyfta</DialogTitle>
            <DialogDescription>
              Paste your Lyfta API key to sync your workouts.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <TriangleAlert className="size-4" />
            <AlertTitle>Lyfta shows your key only once</AlertTitle>
            <AlertDescription>
              Find it in the Lyfta app under settings. If you lose it, regenerate
              a new one and update it here.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="lyfta-key">API key</Label>
            <Input
              id="lyfta-key"
              type="password"
              autoComplete="off"
              placeholder="Paste your Lyfta API key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
            />
          </div>

          {testResult?.ok && (
            <Alert className="border-green-600/40 text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4" />
              <AlertTitle>Connection works</AlertTitle>
              <AlertDescription>
                {testResult.username
                  ? `Authenticated as ${testResult.username}.`
                  : "Your key is valid."}
              </AlertDescription>
            </Alert>
          )}
          {testResult && !testResult.ok && (
            <Alert variant="destructive">
              <TriangleAlert className="size-4" />
              <AlertTitle>Couldn&apos;t connect</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!apiKey || testConnection.isPending}
            >
              {testConnection.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Test connection
            </Button>
            <Button
              onClick={handleConnect}
              disabled={!apiKey || connect.isPending}
            >
              {connect.isPending && <Loader2 className="size-4 animate-spin" />}
              Save &amp; connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
