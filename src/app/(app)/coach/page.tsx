"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  Loader2,
  Send,
  Sparkles,
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/react";
import type { CoachReview } from "@/lib/ai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoachPage() {
  const status = trpc.coach.status.useQuery();
  const utils = trpc.useUtils();
  const reviews = trpc.coach.listReviews.useQuery({ limit: 5 });

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const review = trpc.coach.reviewWeek.useMutation({
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Review ready.");
        utils.coach.listReviews.invalidate();
      } else {
        toast.error(res.message);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const ask = trpc.coach.ask.useMutation({
    onSuccess: (res) => {
      if (res.ok) setAnswer(res.answer);
      else toast.error(res.message);
    },
    onError: (e) => toast.error(e.message),
  });

  const latest = review.data?.ok ? review.data.review : null;

  if (status.isLoading) {
    return <Skeleton className="mx-auto h-40 w-full max-w-3xl" />;
  }

  if (!status.data?.configured) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>AI Coach not configured</CardTitle>
            <CardDescription>
              Add a free Gemini API key to enable the coach.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              Get a key at{" "}
              <a
                className="underline"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                aistudio.google.com/apikey
              </a>{" "}
              (free, no card), then set <code>GEMINI_API_KEY</code> in your
              environment and redeploy.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p className="text-muted-foreground">
            Reviews your last 14 days across every module.
          </p>
        </div>
        <Button onClick={() => review.mutate()} disabled={review.isPending}>
          {review.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Review my week
        </Button>
      </div>

      {/* Ask box */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAnswer(null);
              ask.mutate({ question: question.trim() });
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Ask the coach… e.g. How's my training looking?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <Button type="submit" disabled={question.trim().length < 3 || ask.isPending}>
              {ask.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
          {answer && (
            <p className="text-sm whitespace-pre-wrap">{answer}</p>
          )}
        </CardContent>
      </Card>

      {latest && <ReviewCard review={latest} />}

      {/* Past reviews */}
      <div className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Past reviews
        </h2>
        {reviews.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (reviews.data?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground text-sm">
            No reviews yet. Hit “Review my week”.
          </p>
        ) : (
          reviews.data!.map((r) => (
            <div key={r.id}>
              <p className="text-muted-foreground mb-1 text-xs">
                {format(new Date(r.created_at), "MMM d, yyyy h:mm a")} ·{" "}
                {r.model_used}
              </p>
              <ReviewCard review={r.response as CoachReview} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: CoachReview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Summary</CardTitle>
        <CardDescription className="text-foreground">
          {review.summary}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {review.wins?.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <ThumbsUp className="size-4 text-green-600" /> Wins
            </p>
            <ul className="text-muted-foreground list-disc space-y-1 pl-6">
              {review.wins.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {review.concerns?.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-4 text-amber-500" /> Watch
            </p>
            <ul className="text-muted-foreground list-disc space-y-1 pl-6">
              {review.concerns.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {review.recommendations?.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <Lightbulb className="size-4 text-sky-500" /> Recommendations
            </p>
            <ul className="space-y-2">
              {review.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {r.area}
                  </Badge>
                  <span className="text-muted-foreground">{r.suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
