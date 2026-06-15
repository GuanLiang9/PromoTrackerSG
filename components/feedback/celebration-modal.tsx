"use client";

import * as React from "react";
import type { RewardDelta } from "@/lib/rewards/delta";

const CONFETTI_COLORS = ["#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#8b5cf6", "#ef4444"];

function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.6 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        rounded: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            borderRadius: p.rounded ? "9999px" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function CelebrationModal({
  delta,
  onClose,
}: {
  delta: RewardDelta;
  onClose: () => void;
}) {
  const { leveledUpTo, newBadges, streakMilestone } = delta;

  // Headline reflects the biggest achievement.
  const headline = leveledUpTo
    ? { emoji: leveledUpTo.emoji, title: `Level up — ${leveledUpTo.name}!`, sub: "You reached a new level." }
    : streakMilestone
      ? { emoji: "🔥", title: `${streakMilestone}-day streak!`, sub: "You're on fire — keep it going." }
      : newBadges.length > 0
        ? { emoji: newBadges[0].emoji, title: "Badge unlocked!", sub: newBadges[0].label }
        : { emoji: "🎉", title: "Nice check-in!", sub: "" };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-6 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Confetti />
      <div
        className="animate-celebrate-pop relative w-full max-w-xs overflow-hidden rounded-3xl border bg-card p-6 text-center shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative space-y-3">
          <div className="text-6xl">{headline.emoji}</div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{headline.title}</h2>
            {headline.sub && (
              <p className="mt-1 text-sm text-muted-foreground">{headline.sub}</p>
            )}
          </div>

          {newBadges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {newBadges.map((b) => (
                <span
                  key={b.id}
                  title={b.description}
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold"
                >
                  <span>{b.emoji}</span> {b.label}
                </span>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}
