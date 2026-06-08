"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PromoCard } from "@/components/promotions/promo-card";
import { promotionActiveOn } from "@/lib/calendar/date";
import type { Promotion } from "@/lib/types";

export function DayPromotionsDialog({
  date,
  promotions,
  open,
  onOpenChange,
}: {
  date: Date | null;
  promotions: Promotion[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dayPromos = date
    ? promotions.filter((p) => promotionActiveOn(p, date))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {date ? format(date, "EEEE, d MMMM yyyy") : ""}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dayPromos.length} active promotion
            {dayPromos.length === 1 ? "" : "s"}
          </p>
        </DialogHeader>
        <div className="grid gap-3">
          {dayPromos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active promotions on this day.
            </p>
          ) : (
            dayPromos.map((p) => (
              <PromoCard key={p.id} promotion={p} compact />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
