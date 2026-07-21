"use client";

import { useEffect, useState } from "react";

import { COUNTUP_SESSION_KEYS } from "@/components/analytics/metric-tone";
import { cn } from "@/lib/utils";

type ParsedValue = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  useGrouping: boolean;
};

/** Parse display strings like "$1,140", "94%", "↑ 8%", "+4". */
function parseDisplayValue(raw: string): ParsedValue | null {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(.*?)(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)(.*)$/,
  );
  if (!match) return null;

  const [, prefix, numRaw, suffix] = match;
  const cleaned = numRaw.replace(/,/g, "");
  const target = Number(cleaned);
  if (!Number.isFinite(target)) return null;

  const decimals = cleaned.includes(".")
    ? (cleaned.split(".")[1]?.length ?? 0)
    : 0;

  return {
    prefix,
    suffix,
    target,
    decimals,
    useGrouping: numRaw.includes(","),
  };
}

function formatPart(
  value: number,
  decimals: number,
  useGrouping: boolean,
): string {
  return new Intl.NumberFormat("en-US", {
    useGrouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function hasPlayedThisSession(sessionKey: string): boolean {
  try {
    return sessionStorage.getItem(sessionKey) === "1";
  } catch {
    return false;
  }
}

function markPlayedThisSession(sessionKey: string): void {
  try {
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    /* ignore */
  }
}

export function CountUpValue({
  value,
  className,
  delayMs = 0,
  durationMs = 900,
  /** When true (default), only spin once per browser session — feels like login. */
  oncePerSession = true,
  sessionKey = COUNTUP_SESSION_KEYS.dailyOps,
}: {
  value: string;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  oncePerSession?: boolean;
  sessionKey?: string;
}) {
  const [display, setDisplay] = useState(value);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const parsed = parseDisplayValue(value);

    if (!parsed) {
      setDisplay(value);
      setReady(true);
      return;
    }

    const skip =
      prefersReducedMotion() ||
      (oncePerSession && hasPlayedThisSession(sessionKey));

    if (skip) {
      setDisplay(value);
      setReady(true);
      return;
    }

    setDisplay(
      `${parsed.prefix}${formatPart(0, parsed.decimals, parsed.useGrouping)}${parsed.suffix}`,
    );
    setReady(true);

    let frame = 0;
    let startAt = 0;
    const delayTimer = window.setTimeout(() => {
      startAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startAt) / durationMs);
        const current = parsed.target * easeOutCubic(t);
        setDisplay(
          `${parsed.prefix}${formatPart(current, parsed.decimals, parsed.useGrouping)}${parsed.suffix}`,
        );
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          setDisplay(value);
          markPlayedThisSession(sessionKey);
        }
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(delayTimer);
      cancelAnimationFrame(frame);
    };
  }, [value, delayMs, durationMs, oncePerSession, sessionKey]);

  return (
    <span
      className={cn(
        "tabular-nums transition-opacity duration-300",
        ready ? "opacity-100" : "opacity-0",
        className,
      )}
      aria-label={value}
    >
      {display}
    </span>
  );
}
