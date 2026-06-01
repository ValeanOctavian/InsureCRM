"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResponse } from "@/types";

export async function signIn(
  email: string,
  password: string,
  redirectTo?: string
): Promise<ActionResponse | never> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  // On success, redirect server-side so the auth cookies are properly
  // carried in the redirect response (avoids cookie loss on client nav).
  redirect(redirectTo || "/broker/dashboard");
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<ActionResponse> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "broker",
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: undefined,
    message: "Account created! Please check your email to confirm your account.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
