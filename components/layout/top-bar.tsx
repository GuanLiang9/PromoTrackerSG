import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NavLinks } from "@/components/layout/nav-links";
import { APP_NAME } from "@/lib/constants";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-14 max-w-5xl items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🇸🇬</span>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <NavLinks />

        <ThemeToggle />
      </div>
    </header>
  );
}
