"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, CalendarDays, LayoutGrid, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/search", label: "Search", icon: Search },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-lg md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                    active
                      ? "bg-brand/10 text-brand scale-110"
                      : "hover:bg-accent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
