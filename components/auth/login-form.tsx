"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your inbox for a sign-in link.");
    }
  }

  if (status === "sent") {
    return (
      <p className="rounded-xl border bg-muted/40 p-4 text-center text-sm">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send magic link"}
      </Button>
      {status === "error" && (
        <p className="text-sm text-destructive">{message}</p>
      )}
    </form>
  );
}
