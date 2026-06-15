import { Avatar } from "@/components/profile/avatar";
import { displayNameOf, type PublicProfile } from "@/lib/profiles/types";
import type { RewardStats } from "@/lib/rewards/compute";

export function ProfileHeader({
  profile,
  stats,
  rank,
  action,
  avatar,
}: {
  profile: PublicProfile;
  stats: RewardStats | null;
  rank: number | null;
  action?: React.ReactNode;
  /** Override the avatar (e.g. an editable, tappable avatar on your own profile). */
  avatar?: React.ReactNode;
}) {
  const name = displayNameOf(profile);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-20 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="relative space-y-4">
        <div className="flex items-start gap-4">
          {avatar ?? <Avatar src={profile.avatarUrl} name={name} size="xl" />}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{name}</h1>
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
            {stats && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                  <span>{stats.level.emoji}</span> {stats.level.name}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {stats.points.toLocaleString("en-SG")} pts
                  {rank ? ` · rank #${rank}` : ""}
                </span>
              </div>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

        {stats && (
          <>
            {/* Level progress */}
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400 transition-all"
                  style={{ width: `${stats.progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {stats.next
                  ? `${(stats.next.min - stats.points).toLocaleString("en-SG")} pts to ${stats.next.emoji} ${stats.next.name}`
                  : "Max level reached 👑"}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { v: stats.checkIns, l: "Check-ins" },
                { v: stats.venues, l: "Places" },
                { v: stats.currentStreak, l: "Streak" },
                { v: stats.areas, l: "Areas" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-muted/50 py-2">
                  <div className="text-sm font-bold">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
