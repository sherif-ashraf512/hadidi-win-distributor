"use client";

import { formatAmount, formatCompact } from "@/lib/format";

/**
 * Tiny dependency-free chart primitives for the portal home page (plain
 * flex/CSS bars + one SVG donut). Built as HTML rather than a chart library
 * so they inherit the page direction (RTL: time flows right → left, which
 * reads naturally in Arabic), stay crisp when printed, and add nothing to
 * install on the VPS.
 */

export const CHART_COLORS = {
  sales: "#0b1354",
  returns: "#f43f5e",
  collections: "#10b981",
};

const DONUT_PALETTE = ["#0b1354", "#3b59b3", "#ff9f1c", "#14b8a6", "#f43f5e", "#94a3b8"];

function monthLabel(key, locale) {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    numberingSystem: "latn",
  }).format(new Date(y, m - 1, 1));
}

/** Grouped bars per month: sales / returns / collections. */
export function TrendBars({ data, locale, labels }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.sales, d.returns, d.collections]));
  const series = [
    { key: "sales", label: labels.sales, color: CHART_COLORS.sales },
    { key: "returns", label: labels.returns, color: CHART_COLORS.returns },
    { key: "collections", label: labels.collections, color: CHART_COLORS.collections },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-hadidi-subtle">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="flex h-56 items-end gap-2 sm:gap-4">
        {data.map((d) => (
          <div key={d.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1 border-b border-black/[0.08]">
              {series.map((s) => {
                const value = d[s.key];
                const pct = Math.max(0, (value / max) * 100);
                return (
                  <div
                    key={s.key}
                    title={`${s.label}: ${formatAmount(value, locale)}`}
                    className="w-full max-w-[1.5rem] rounded-t-md transition-[height] duration-500"
                    style={{ height: `${pct}%`, minHeight: value > 0 ? 3 : 0, backgroundColor: s.color }}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11px] font-semibold text-hadidi-subtle">{monthLabel(d.month, locale)}</p>
            <p className="text-center font-mono text-[10px] text-hadidi-subtle/80">{formatCompact(d.sales)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Donut with legend — segments are { key, label, value }. */
export function Donut({ segments, locale, centerLabel }) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center lg:flex-col xl:flex-row">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#eef0f4" strokeWidth="14" />
          {total > 0
            ? segments.map((s, i) => {
                const len = (s.value / total) * circumference;
                const el = (
                  <circle
                    key={s.key}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]}
                    strokeWidth="14"
                    strokeDasharray={`${len} ${circumference - len}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })
            : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-base font-extrabold text-hadidi-primary">{formatCompact(total)}</span>
          {centerLabel ? <span className="text-[11px] text-hadidi-subtle">{centerLabel}</span> : null}
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2 text-sm">
        {segments.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between gap-3">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
              <span className="truncate text-hadidi-primary">{s.label}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-hadidi-subtle" title={formatAmount(s.value, locale)}>
              {total > 0 ? `${Math.round((s.value / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars — rows are { key, label, sublabel?, value, valueLabel, href? }. */
export function HBars({ rows, color = CHART_COLORS.sales }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-hadidi-primary">{r.label}</span>
            <span className="shrink-0 font-mono text-xs font-bold text-hadidi-primary">{r.valueLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-hadidi-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(3, (r.value / max) * 100)}%`, backgroundColor: color }}
            />
          </div>
          {r.sublabel ? <p className="mt-1 text-[11px] text-hadidi-subtle">{r.sublabel}</p> : null}
        </li>
      ))}
    </ul>
  );
}
