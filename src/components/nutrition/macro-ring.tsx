"use client";

// Compact radial progress for a single macro (consumed vs. target).
export function MacroRing({
  label,
  value,
  target,
  unit,
  colorClass,
  size = 110,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  colorClass: string;
  size?: number;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = circ * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-1">
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
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className={`${colorClass} transition-all duration-500`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{value}</span>
          <span className="text-muted-foreground text-[10px]">
            / {target}
            {unit}
          </span>
        </div>
      </div>
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
    </div>
  );
}
