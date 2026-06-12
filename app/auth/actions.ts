"use server";

import { redirect } from "next/navigation";
import { createClient as createAdminAuthClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL, getServiceRoleKey } from "@/lib/supabase/env";

export interface AuthResult {
  error?: string;
}

/** Keep redirects on-site only. */
function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

function readCredentials(formData: FormData): {
  email: string;
  password: string;
  error?: string;
} {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !email.includes("@")) {
    return { email, password, error: "Enter a valid email address." };
  }
  if (password.length < 6) {
    return { email, password, error: "Password must be at least 6 characters." };
  }
  return { email, password };
}

/** Email + password sign in. */
export async function signIn(formData: FormData): Promise<AuthResult> {
  const { email, password, error } = readCredentials(formData);
  if (error) return { error };

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    const msg = /invalid login credentials/i.test(signInError.message)
      ? "Wrong email or password."
      : signInError.message;
    return { error: msg };
  }
  redirect(safeNext(formData.get("next")));
}

/**
 * Create an account and sign in immediately — no confirmation email, no app
 * switching. Uses the service-role admin API to create an already-confirmed
 * user (sends no email) regardless of the project's "Confirm email" setting,
 * then establishes a session with the password.
 */
export async function signUp(formData: FormData): Promise<AuthResult> {
  const { email, password, error } = readCredentials(formData);
  if (error) return { error };

  const admin = createAdminAuthClient(SUPABASE_URL, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    const msg = /already.*registered|already been registered|exists/i.test(
      createError.message,
    )
      ? "An account with this email already exists — sign in instead."
      : createError.message;
    return { error: msg };
  }

  // Establish the session on this device.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { error: signInError.message };

  redirect(safeNext(formData.get("next")));
}

/** Sign out and return to the dashboard. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/dashboard");
}
