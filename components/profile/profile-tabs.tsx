"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabKey = "timeline" | "badges" | "friends";

export function ProfileTabs({
  timeline,
  badges,
  friends,
}: {
  timeline: React.ReactNode;
  badges: React.ReactNode;
  friends?: React.ReactNode;
}) {
  const [tab, setTab] = React.useState<TabKey>("timeline");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "timeline", label: "Timeline" },
    { key: "badges", label: "Badges" },
    ...(friends ? [{ key: "friends" as const, label: "Friends" }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border bg-muted/40 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === "timeline" && timeline}
        {tab === "badges" && badges}
        {tab === "friends" && friends}
      </div>
    </div>
  );
}
