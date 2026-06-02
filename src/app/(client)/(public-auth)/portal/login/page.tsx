"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, LogIn, Loader2, Info } from "lucide-react";
import { loginWithCnpOrEmail } from "@/lib/auth/portal-actions";
import { ROUTES } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || ROUTES.CLIENT.PORTAL;
  const registered = searchParams.get("registered") === "1";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isCnpShape = /^\d{13}$/.test(identifier.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await loginWithCnpOrEmail(identifier, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      // If the identifier is unknown, suggest registering
      if (result.code === "not_found") {
        router.push(`${ROUTES.PORTAL_REGISTER}?identifier=${encodeURIComponent(identifier.trim())}`);
      }
      return;
    }

    // Server action redirects on success; this is a fallback.
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950">
          <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Sign in to your portal
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Use your email or 13-digit CNP
        </p>
      </div>

      {registered && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          Account created! You can now sign in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="identifier"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email or CNP
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@example.com or 13-digit CNP"
            required
            autoComplete="username"
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          {isCnpShape && (
            <p className="mt-1 text-[11px] text-zinc-500">
              Detected CNP — we&apos;ll look up your account by it.
            </p>
          )}
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
            autoComplete="current-password"
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign in
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href={ROUTES.PORTAL_REGISTER}
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
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
