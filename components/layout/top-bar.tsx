import Link from "next/link";
import { Bookmark, CalendarDays, LayoutGrid, Search } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { APP_NAME } from "@/lib/constants";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/search", label: "Search", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🇸🇬</span>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
