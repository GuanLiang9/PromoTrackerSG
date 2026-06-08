/**
 * Notification scaffolding.
 *
 * The MVP defines the payload contract and the trigger rules; actual delivery
 * (web-push / email) is wired later. The service worker (app/sw.ts) already
 * handles incoming `push` events using `PushPayload`.
 */
import type { PromoCategory } from "@/lib/types";

export type NotificationKind =
  | "ending_tomorrow"
  | "new_in_category"
  | "saved_expiring";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  kind: NotificationKind;
}

export interface NotificationPreferences {
  endingReminders: boolean;
  favouriteCategories: PromoCategory[];
  pushEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  endingReminders: true,
  favouriteCategories: [],
  pushEnabled: false,
};
