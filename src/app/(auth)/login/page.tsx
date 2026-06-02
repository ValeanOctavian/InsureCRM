"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/broker/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Use the browser client directly so session cookies are handled
    // properly by the browser (avoids silent cookie loss in server actions).
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Get the session to determine the role, then redirect appropriately.
      const { data: userData } = await supabase.auth.getUser();
      const role = userData?.user?.user_metadata?.role as string | undefined;
      if (role === "client") {
        router.push("/portal");
      } else {
        router.push(redirectTo);
      }
      router.refresh();
    }
  }

  const fillDemo = (type: "broker" | "client") => {
    if (type === "broker") {
      setEmail("broker@insurecrm.com");
      setPassword("Demo123!");
    } else {
      setEmail("client@insurecrm.com");
      setPassword("Demo123!");
    }
  };

  // Note: client demo kept for completeness, but the canonical client login is /portal/login.

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950">
          <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to your InsureCRM account
        </p>
      </div>

      {/* Demo quick login button */}
      <div className="mb-6 space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
          Quick demo access
        </p>
        <button
          onClick={() => fillDemo("broker")}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
        >
          <Shield className="h-3.5 w-3.5" />
          Broker Demo
        </button>
        <p className="text-center text-[11px] text-zinc-400">
          Clients sign in via{" "}
          <Link href="/portal/login" className="underline">
            /portal/login
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
