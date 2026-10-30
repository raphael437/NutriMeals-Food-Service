"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Leaf,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);

    try {
      await signup({ name, email, password });
      router.replace("/me");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create your account. Please try again."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#f7f8f4] px-4 py-12 text-[#183b2b] sm:px-6 sm:py-16">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e2e9df] bg-white shadow-xl shadow-emerald-950/[0.06] lg:grid-cols-2">
        {/* Intro */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#173d2b] p-7 text-white sm:p-10 lg:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />

          <Link href="/" className="relative inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
              <Leaf className="h-6 w-6" />
            </span>

            <span className="text-xl font-bold tracking-tight">
              NutriMeals
            </span>
          </Link>

          <div className="relative mt-12 lg:mt-24">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              A better way to choose
            </p>

            <h1 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Good food can fit your everyday life.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-7 text-emerald-50/80 sm:text-base">
              Join NutriMeals to discover restaurants, explore meals, and
              order food with useful nutrition information at your fingertips.
            </p>
          </div>

          <div className="relative mt-12 space-y-4 border-t border-white/15 pt-6">
            <div className="flex items-center gap-3 text-sm text-emerald-50/80">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
              Discover participating restaurants
            </div>

            <div className="flex items-center gap-3 text-sm text-emerald-50/80">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
              Review available meal nutrition information
            </div>

            <div className="flex items-center gap-3 text-sm text-emerald-50/80">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
              Keep track of your orders
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-7 sm:p-10 lg:p-12">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Create your account
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#617267]">
            Enter your details to get started with NutriMeals.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Full name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9aa59c] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9aa59c] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#9aa59c] focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              />

              <p className="mt-2 text-xs leading-5 text-[#809087]">
                Use at least 8 characters, following your account password
                requirements.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-6 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-[#f7f8f4] p-3.5 text-xs leading-5 text-[#617267]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
            Your account gives you access to your own NutriMeals account and
            order history.
          </div>

          <p className="mt-7 text-center text-sm text-[#617267]">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}