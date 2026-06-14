import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";
import { AccountMenu } from "@/components/layout/account-menu";
import { RewardsButton } from "@/components/rewards/rewards-button";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="container flex h-14 max-w-5xl items-center justify-between gap-4">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm text-brand-foreground shadow-sm">
            🇸🇬
          </span>
          <span className="text-lg font-bold tracking-tight">
            Promo<span className="text-brand">SG</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NavLinks />
          <RewardsButton />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
