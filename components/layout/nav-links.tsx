"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, CalendarDays, LayoutGrid, MapPin, Search, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/search", label: "Search", icon: Search },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/spots", label: "Spots", icon: Utensils },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active && "text-brand")} />
            {label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-px rounded-full bg-brand" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
