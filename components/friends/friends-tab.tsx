"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/profile/avatar";
import { FriendButton } from "@/components/friends/friend-button";
import { findUsers, type UserSearchHit } from "@/lib/friends/actions";
import { displayNameOf } from "@/lib/profiles/types";
import type { FriendWithProfile } from "@/lib/friends/types";

export function FriendsTab({
  friends,
  incoming,
  outgoing,
}: {
  friends: FriendWithProfile[];
  incoming: FriendWithProfile[];
  outgoing: FriendWithProfile[];
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<UserSearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await findUsers(q));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Add friends */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find people by name or @username"
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-ring"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {results.length > 0 && (
          <ul className="space-y-2">
            {results.map((r) => (
              <PersonRow
                key={r.profile.id}
                id={r.profile.id}
                name={displayNameOf(r.profile)}
                username={r.profile.username}
                avatarUrl={r.profile.avatarUrl}
                action={
                  <FriendButton
                    targetUserId={r.profile.id}
                    initialStatus={r.status}
                    edgeId={r.edgeId}
                  />
                }
              />
            ))}
          </ul>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-sm text-muted-foreground">No one found for “{query}”.</p>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <Group title="Friend requests">
          {incoming.map((f) => (
            <PersonRow
              key={f.edge.id}
              id={f.profile.id}
              name={displayNameOf(f.profile)}
              username={f.profile.username}
              avatarUrl={f.profile.avatarUrl}
              action={
                <FriendButton targetUserId={f.profile.id} initialStatus="incoming" edgeId={f.edge.id} />
              }
            />
          ))}
        </Group>
      )}

      {/* Friends */}
      <Group title={`Friends${friends.length ? ` · ${friends.length}` : ""}`}>
        {friends.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <UserPlus className="mx-auto mb-2 h-6 w-6 opacity-60" />
            No friends yet — search above to add some and compare food adventures.
          </div>
        ) : (
          friends.map((f) => (
            <PersonRow
              key={f.edge.id}
              id={f.profile.id}
              name={displayNameOf(f.profile)}
              username={f.profile.username}
              avatarUrl={f.profile.avatarUrl}
              action={
                <FriendButton targetUserId={f.profile.id} initialStatus="friends" edgeId={f.edge.id} />
              }
            />
          ))
        )}
      </Group>

      {/* Outgoing */}
      {outgoing.length > 0 && (
        <Group title="Sent requests">
          {outgoing.map((f) => (
            <PersonRow
              key={f.edge.id}
              id={f.profile.id}
              name={displayNameOf(f.profile)}
              username={f.profile.username}
              avatarUrl={f.profile.avatarUrl}
              action={
                <FriendButton targetUserId={f.profile.id} initialStatus="outgoing" edgeId={f.edge.id} />
              }
            />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function PersonRow({
  id,
  name,
  username,
  avatarUrl,
  action,
}: {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border bg-card p-3">
      <Link href={`/u/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={avatarUrl} name={name} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          {username && <p className="truncate text-xs text-muted-foreground">@{username}</p>}
        </div>
      </Link>
      <div className="shrink-0">{action}</div>
    </li>
  );
}
