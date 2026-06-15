"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Plus, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RewardStats } from "@/lib/rewards/compute";
import { evaluateBadges } from "@/lib/rewards/badges";
import { levelFor } from "@/lib/rewards/levels";
import type { Quest } from "@/lib/rewards/quests";
import type { LeaderboardRow } from "@/lib/rewards/queries";
import { Avatar } from "@/components/profile/avatar";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type LbScope = "global" | "friends";

export function RewardsClient({
  personal,
  rank,
  leaderboard,
  friendsLeaderboard = [],
  quests = [],
  currentUserId,
}: {
  personal: RewardStats | null;
  rank: number | null;
  leaderboard: LeaderboardRow[];
  friendsLeaderboard?: LeaderboardRow[];
  quests?: Quest[];
  currentUserId: string | null;
}) {
  const [scope, setScope] = React.useState<LbScope>("global");
  const activeBoard = scope === "friends" ? friendsLeaderboard : leaderboard;
  const inTop = activeBoard.some((r) => r.user_id === currentUserId);

  return (
    <div className="space-y-6 pb-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-20 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative space-y-1">
          <div className="flex items-center gap-2 text-3xl">🏆</div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rewards</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Check in daily to build your streak, earn points, unlock badges and climb the leaderboard.
          </p>
        </div>
      </div>

      {personal ? (
        <PersonalPanel personal={personal} rank={rank} />
      ) : (
        <SignedOutPanel />
      )}

      {/* Weekly quests */}
      {personal && quests.length > 0 && <QuestsCard quests={quests} />}

      {/* Leaderboard */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-brand" />
            <h2 className="text-base font-semibold tracking-tight">Leaderboard</h2>
          </div>
          {currentUserId && (
            <div className="flex gap-1 rounded-full border bg-muted/40 p-0.5">
              {(["global", "friends"] as LbScope[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                    scope === s ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "global" ? "Global" : "Friends"}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeBoard.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {scope === "friends"
              ? "Add friends to see how you stack up against them."
              : "No check-ins yet — be the first to top the board."}
          </div>
        ) : (
          <ol className="overflow-hidden rounded-2xl border bg-card">
            {activeBoard.map((row, i) => (
              <LeaderRow
                key={row.user_id}
                row={row}
                position={i + 1}
                isMe={row.user_id === currentUserId}
              />
            ))}
          </ol>
        )}

        {/* Pinned "you" row when outside the visible global list */}
        {scope === "global" && personal && rank && !inTop && (
          <ol className="overflow-hidden rounded-2xl border border-brand/40 bg-card">
            <LeaderRow
              row={{
                user_id: currentUserId!,
                author_name: "You",
                avatar_url: null,
                check_ins: personal.checkIns,
                venues: personal.venues,
                days: personal.days,
                areas: personal.areas,
                points: personal.points,
              }}
              position={rank}
              isMe
            />
          </ol>
        )}
      </section>
    </div>
  );
}

function QuestsCard({ quests }: { quests: Quest[] }) {
  const done = quests.filter((q) => q.completed).length;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Weekly quests</h2>
        <span className="text-xs text-muted-foreground">{done}/{quests.length} done</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {quests.map((q) => {
          const pct = Math.round((q.current / q.target) * 100);
          return (
            <div
              key={q.id}
              className={cn(
                "rounded-2xl border p-4 transition-all",
                q.completed ? "border-brand/40 bg-brand/5" : "bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{q.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{q.title}</p>
                    <p className="text-[11px] text-muted-foreground">{q.description}</p>
                  </div>
                </div>
                {q.completed && <span className="text-sm">✅</span>}
              </div>
              <div className="mt-3 space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{q.current}/{q.target}</span>
                  <span>{q.reward}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PersonalPanel({ personal, rank }: { personal: RewardStats; rank: number | null }) {
  const badges = evaluateBadges(personal);
  const { level, next, progressPct } = personal;

  return (
    <>
      {/* Streak + level */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Streak card */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">{personal.currentStreak}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  day{personal.currentStreak === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                Current streak
              </p>
            </div>
            <Flame
              className={cn(
                "h-10 w-10",
                personal.currentStreak > 0 ? "text-orange-500" : "text-muted-foreground/40",
              )}
            />
          </div>

          {/* Last 7 days */}
          <div className="mt-4 flex items-center justify-between">
            {personal.last7.map((on, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                    on ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground/60",
                  )}
                >
                  {on ? "🔥" : ""}
                </span>
                <span className="text-[10px] text-muted-foreground">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {personal.checkedInToday ? (
              <>You&apos;ve checked in today — streak safe 🔥</>
            ) : personal.currentStreak > 0 ? (
              <>
                <Link href="/check-in" className="font-semibold text-orange-600 underline-offset-2 hover:underline">
                  Check in today
                </Link>{" "}
                to keep your {personal.currentStreak}-day streak.
              </>
            ) : (
              <>
                <Link href="/check-in" className="font-semibold text-orange-600 underline-offset-2 hover:underline">
                  Check in
                </Link>{" "}
                to start a new streak.
              </>
            )}
          </p>
        </div>

        {/* Level + points card */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{level.emoji}</span>
                <span className="text-lg font-bold tracking-tight">{level.name}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {personal.points.toLocaleString("en-SG")} points
                {rank ? ` · rank #${rank}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {next
                ? `${next.min - personal.points} pts to ${next.emoji} ${next.name}`
                : "Max level reached 👑"}
            </p>
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              { v: personal.checkIns, l: "Check-ins" },
              { v: personal.venues, l: "Places" },
              { v: personal.days, l: "Days" },
              { v: personal.areas, l: "Areas" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-muted/50 py-2">
                <div className="text-sm font-bold">{s.v}</div>
                <div className="text-[10px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Badges</h2>
          <span className="text-xs text-muted-foreground">
            {badges.filter((b) => b.unlocked).length}/{badges.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {badges.map((b) => (
            <div
              key={b.id}
              title={b.description}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all",
                b.unlocked ? "bg-card" : "bg-muted/30 opacity-50 grayscale",
              )}
            >
              <span className="text-2xl">{b.emoji}</span>
              <span className="text-[11px] font-semibold leading-tight">{b.label}</span>
              <span className="text-[9px] leading-tight text-muted-foreground">{b.description}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function SignedOutPanel() {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <div className="text-3xl">🔥</div>
      <p className="mt-2 text-sm font-semibold">Sign in to start your streak</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        Earn points, unlock badges and climb the leaderboard by checking in to the spots you love.
      </p>
      <Link
        href="/auth/login?next=/rewards"
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" /> Get started
      </Link>
    </div>
  );
}

function LeaderRow({
  row,
  position,
  isMe,
}: {
  row: LeaderboardRow;
  position: number;
  isMe: boolean;
}) {
  const level = levelFor(row.points);
  const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : null;
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors hover:bg-accent/50",
        isMe && "bg-brand/5",
      )}
    >
      <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
        {medal ?? position}
      </span>
      <Link href={`/u/${row.user_id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative shrink-0">
          <Avatar src={row.avatar_url} name={row.author_name} size="sm" />
          <span className="absolute -bottom-1 -right-1 text-xs">{level.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold">
            {row.author_name || "Foodie"}
            {isMe && <span className="ml-1.5 text-[10px] font-bold text-brand">YOU</span>}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {row.check_ins} check-in{row.check_ins === 1 ? "" : "s"} · {row.venues} places
          </p>
        </div>
      </Link>
      <span className="shrink-0 text-sm font-bold tabular-nums">
        {row.points.toLocaleString("en-SG")}
      </span>
    </li>
  );
}
