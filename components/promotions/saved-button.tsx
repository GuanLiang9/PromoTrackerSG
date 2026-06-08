"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleSaved } from "@/lib/promotions/actions";
import { cn } from "@/lib/utils";

export function SavedButton({
  promotionId,
  initialSaved = false,
  variant = "icon",
}: {
  promotionId: string;
  initialSaved?: boolean;
  variant?: "icon" | "full";
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(initialSaved);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => setSaved(initialSaved), [initialSaved]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const optimistic = !saved;
    setSaved(optimistic); // optimistic update
    setError(null);
    startTransition(async () => {
      const res = await toggleSaved(promotionId);
      if (!res.ok) {
        setSaved(!optimistic); // revert
        setError(res.error ?? "Something went wrong");
        if (res.error?.includes("signed in")) router.push("/auth/login");
        return;
      }
      setSaved(res.saved ?? optimistic);
      router.refresh();
    });
  }

  if (variant === "full") {
    return (
      <Button
        variant={saved ? "default" : "outline"}
        onClick={onClick}
        disabled={pending}
        className="w-full"
      >
        <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
        {saved ? "Saved" : "Save promotion"}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={saved ? "Remove bookmark" : "Save promotion"}
      aria-pressed={saved}
      title={error ?? undefined}
      onClick={onClick}
      disabled={pending}
    >
      <Bookmark
        className={cn(
          "h-5 w-5",
          saved ? "fill-primary text-primary" : "text-muted-foreground",
        )}
      />
    </Button>
  );
}
