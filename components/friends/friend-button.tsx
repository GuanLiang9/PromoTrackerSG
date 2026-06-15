"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Loader2, UserCheck, UserPlus } from "lucide-react";
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriend,
} from "@/lib/friends/actions";
import { useToast } from "@/components/feedback/toast-provider";
import { cn } from "@/lib/utils";
import type { FriendStatus } from "@/lib/friends/types";

export function FriendButton({
  targetUserId,
  initialStatus,
  edgeId,
}: {
  targetUserId: string;
  initialStatus: FriendStatus;
  edgeId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<FriendStatus>(initialStatus);
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, next: FriendStatus, msg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      toast({ title: res.error ?? "Something went wrong", tone: "info" });
      return;
    }
    setStatus(next);
    toast({ title: msg });
    router.refresh();
  }

  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50";

  if (status === "friends") {
    return (
      <button
        disabled={busy}
        onClick={() => edgeId && run(() => removeFriend(edgeId), "none", "Friend removed")}
        className={cn(base, "border bg-background hover:bg-accent")}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
        Friends
      </button>
    );
  }

  if (status === "incoming") {
    return (
      <button
        disabled={busy}
        onClick={() => edgeId && run(() => acceptFriendRequest(edgeId), "friends", "You're now friends 🎉")}
        className={cn(base, "bg-brand text-brand-foreground hover:opacity-90")}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Accept request
      </button>
    );
  }

  if (status === "outgoing") {
    return (
      <button
        disabled={busy}
        onClick={() => edgeId && run(() => removeFriend(edgeId), "none", "Request cancelled")}
        className={cn(base, "border bg-background text-muted-foreground hover:bg-accent")}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
        Requested
      </button>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={() => run(() => sendFriendRequest(targetUserId), "outgoing", "Friend request sent")}
      className={cn(base, "bg-foreground text-background hover:opacity-90")}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      Add friend
    </button>
  );
}
