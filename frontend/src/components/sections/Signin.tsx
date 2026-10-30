
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signinUser } from "../../api/api";

function getSafeNextPath(): string | null {
  const requestedPath = new URLSearchParams(
    window.location.search,
  ).get("next");

  if (!requestedPath) return null;
  if (!requestedPath.startsWith("/")) return null;
  if (requestedPath.startsWith("//")) return null;
  if (requestedPath.includes("\\")) return null;

  return requestedPath;
}

export default function SigninPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSending(true);

    try {
      // Call the backend and receive the user's role and redirect path.
      const result = await signinUser({
        email: email.trim(),
        password,
      });

      // Customers can return to the page they originally requested,
      // such as /cart. Partner and admin routes come from the backend.
      const requestedPath = getSafeNextPath();

      const destination =
        result.user.role === "customer" && requestedPath
          ? requestedPath
          : result.next || "/restaurants";

      router.replace(destination);
      router.refresh();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Please check your email and password.",
      );

      setSending(false);
    }
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-[#faf8f2] px-4 py-12 text-stone-900 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-sm sm:p-9">
        {/* Brand */}
        <div className="mb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-bold tracking-tight text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-900 text-sm font-black text-white">
              N
            </span>

            NutriMeals
          </Link>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
            Welcome back
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Sign in to your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            Sign in to manage your orders or continue managing your restaurant
            application.
          </p>
        </div>

        {/* Sign-in form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-stone-800"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={sending}
              className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-stone-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-stone-800"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              disabled={sending}
              className="h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 disabled:cursor-not-allowed disabled:bg-stone-50"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="mt-1 inline-flex h-12 items-center justify-center rounded-full bg-emerald-900 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Customer registration */}
        <p className="mt-6 text-center text-sm text-stone-600">
          Don&apos;t have a customer account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-900 underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>

        {/* Restaurant partner registration */}
        <div className="mt-5 border-t border-stone-200 pt-5 text-center">
          <p className="text-sm text-stone-600">
            Want to sell on NutriMeals?
          </p>

          <Link
            href="/become-a-partner"
            className="mt-2 inline-block text-sm font-semibold text-emerald-900 underline-offset-4 hover:underline"
          >
            Apply as a restaurant partner
          </Link>
        </div>
      </section>
    </main>
  );
}
