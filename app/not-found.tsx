import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="text-2xl font-bold">Promotion not found</h1>
      <p className="text-sm text-muted-foreground">
        It may have expired or the link is incorrect.
      </p>
      <Button asChild>
        <Link href="/calendar">Browse the calendar</Link>
      </Button>
    </div>
  );
}
