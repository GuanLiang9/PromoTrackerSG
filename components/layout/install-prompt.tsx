"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Shows a lightweight "Add to Home Screen" banner when installable. */
export function InstallPrompt() {
  const [deferred, setDeferred] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || hidden) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg md:bottom-4">
      <div className="flex-1">
        <p className="text-sm font-semibold">Install PromoSG</p>
        <p className="text-xs text-muted-foreground">
          Add to your home screen for quick access.
        </p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        <Download className="h-4 w-4" /> Install
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss"
        onClick={() => setHidden(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
