"use client";

// Circular progress ring for today's steps vs. goal.
export function StepRing({
  steps,
  goal,
  size = 180,
}: {
  steps: number;
  goal: number;
  size?: number;
}) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(steps / goal, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">
          {steps.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-xs">
          of {goal.toLocaleString()} steps
        </span>
      </div>
    </div>
  );
}
