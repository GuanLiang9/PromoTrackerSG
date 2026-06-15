import { sgDateKey, sgToday, addDays } from "@/lib/rewards/sg-date";
import type { CheckIn } from "@/lib/checkins/types";

export interface CheckInBucket {
  label: string;
  checkIns: CheckIn[];
}

/**
 * Group a user's check-ins (already newest-first) into Today / Yesterday /
 * This week / Earlier this month / month-name buckets, by Singapore day.
 * Empty buckets are omitted; order is preserved by first appearance.
 */
export function bucketCheckIns(checkIns: CheckIn[]): CheckInBucket[] {
  const today = sgToday();
  const yesterday = addDays(today, -1);
  const weekAgo = addDays(today, -6);
  const monthPrefix = today.slice(0, 7); // YYYY-MM

  const order: string[] = [];
  const map = new Map<string, CheckIn[]>();
  const push = (label: string, c: CheckIn) => {
    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(c);
  };

  for (const c of checkIns) {
    const day = sgDateKey(c.createdAt);
    let label: string;
    if (day === today) label = "Today";
    else if (day === yesterday) label = "Yesterday";
    else if (day >= weekAgo) label = "This week";
    else if (day.slice(0, 7) === monthPrefix) label = "Earlier this month";
    else {
      label = new Date(c.createdAt).toLocaleDateString("en-SG", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Singapore",
      });
    }
    push(label, c);
  }

  return order.map((label) => ({ label, checkIns: map.get(label)! }));
}
