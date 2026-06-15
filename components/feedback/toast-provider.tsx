"use client";

import * as React from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RewardDelta } from "@/lib/rewards/delta";
import { CelebrationModal } from "@/components/feedback/celebration-modal";

type ToastTone = "success" | "info";
interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (t: { title: string; description?: string; tone?: ToastTone }) => void;
  celebrate: (delta: RewardDelta) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [celebration, setCelebration] = React.useState<RewardDelta | null>(null);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "success" }) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, title, description, tone }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const celebrate = React.useCallback<ToastContextValue["celebrate"]>((delta) => {
    const worthCelebrating =
      delta.leveledUpTo || delta.newBadges.length > 0 || delta.streakMilestone;
    if (worthCelebrating) setCelebration(delta);
  }, []);

  const value = React.useMemo(() => ({ toast, celebrate }), [toast, celebrate]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast stack */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[200] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm animate-fade-in-up items-start gap-3 rounded-2xl border bg-card/95 p-3.5 shadow-float backdrop-blur"
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                t.tone === "success" ? "text-brand" : "text-foreground/70",
              )}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {celebration && (
        <CelebrationModal delta={celebration} onClose={() => setCelebration(null)} />
      )}
    </ToastContext.Provider>
  );
}
