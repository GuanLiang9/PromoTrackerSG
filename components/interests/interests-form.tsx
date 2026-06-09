"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INTERESTS } from "@/lib/constants";
import { saveInterests } from "@/lib/promotions/preferences";
import { cn } from "@/lib/utils";

export function InterestsForm({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(initial));
  const [pending, startTransition] = React.useTransition();
  const [saved, setSaved] = React.useState(false);

  function toggle(key: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveInterests([...selected]);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {INTERESTS.map((i) => {
          const on = selected.has(i.key);
          return (
            <button
              key={i.key}
              type="button"
              onClick={() => toggle(i.key)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-sm font-medium transition-all",
                on
                  ? "border-brand bg-brand/10 text-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {on && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="text-2xl">{i.emoji}</span>
              {i.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save interests"}
        </Button>
        {saved && <span className="text-sm text-brand">Saved ✓</span>}
      </div>
    </div>
  );
}
