"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  UserRound,
  X,
} from "lucide-react";

import {
  getAuthState,
  logoutUser,
  type Role,
  type User,
} from "../../api/api";

type NavItem = {
  label: string;
  href: string;
  icon?: typeof Store;
};

const publicLinks: NavItem[] = [
  { label: "Restaurants", href: "/restaurants", icon: Store },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
];

function getAccountLinks(role: Role | null): NavItem[] {
  // Make My account available for every role.
  const myAccountLink: NavItem = {
    label: "My account",
    href: "/me",
    icon: UserRound,
  };

  switch (role) {
    case "customer":
      return [
        myAccountLink,
        { label: "My orders", href: "/orders", icon: Package },
        { label: "My cart", href: "/cart", icon: ShoppingCart },
      ];

    case "restaurant_owner":
      return [
        myAccountLink,
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Settings", href: "/settings", icon: Settings },
      ];

    case "admin":
      return [
        myAccountLink,
        {
          label: "Admin dashboard",
          href: "/admin/dashboard",
          icon: LayoutDashboard,
        },
      ];

    default:
      // Includes restaurant applicants and users without a recognized role.
      return [
        myAccountLink,
        { label: "My cart", href: "/cart", icon: ShoppingCart },
      ];
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const auth = await getAuthState();

        if (!cancelled) {
          setUser(auth.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Close dropdowns when the user clicks a navigation link.
  function closeMenus() {
    setMobileOpen(false);
    setAccountOpen(false);
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function linkClass(href: string) {
    return [
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
      isActive(href)
        ? "bg-emerald-50 text-emerald-900"
        : "text-[#52665a] hover:bg-[#f2f6ef] hover:text-[#173d2b]",
    ].join(" ");
  }

  async function handleLogout() {
    setLoggingOut(true);
    setAuthError("");

    try {
      await logoutUser();

      setUser(null);
      closeMenus();

      router.push("/");
      router.refresh();
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not log out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const accountLinks = getAccountLinks(user?.role ?? null);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e2e9df] bg-[#fffefa]/95 text-[#183b2b] shadow-sm shadow-emerald-950/[0.03] backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10"
      >
        {/* Brand */}
        <Link
          href="/"
          onClick={closeMenus}
          aria-label="NutriMeals home"
          className="group flex shrink-0 items-center gap-2.5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173d2b] text-emerald-200 transition group-hover:bg-emerald-900">
            <Leaf className="h-6 w-6" />
          </span>

          <span>
            <span className="block text-xl font-bold tracking-tight text-[#173d2b]">
              NutriMeals
            </span>

            <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-[#809087] sm:block">
              Eat well. Live well.
            </span>
          </span>
        </Link>

        {/* Desktop public navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          {publicLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenus}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={linkClass(item.href)}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop account actions */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {!authLoading &&
            accountLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={linkClass(item.href)}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              );
            })}

          {authLoading ? (
            <div
              className="h-10 w-24 animate-pulse rounded-xl bg-[#eef3e9]"
              aria-label="Loading account"
            />
          ) : user ? (
            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-label="Open account menu"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dce5da] bg-white px-3 py-2.5 text-sm font-semibold transition hover:bg-[#f7f8f4]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
                  <UserRound className="h-4 w-4" />
                </span>

                <span className="max-w-28 truncate">{user.name}</span>

                <ChevronDown
                  className={`h-4 w-4 transition ${
                    accountOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-full mt-3 w-64 rounded-2xl border border-[#e2e9df] bg-white p-2 shadow-xl shadow-emerald-950/10">
                  <div className="border-b border-[#e9eee7] px-3 py-3">
                    <p className="truncate text-sm font-semibold">
                      {user.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-[#809087]">
                      {user.email}
                    </p>

                    <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs capitalize text-emerald-800">
                      {user.role.replaceAll("_", " ")}
                    </p>
                  </div>

                  {accountLinks.map((item) => {
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMenus}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#52665a] transition hover:bg-[#f2f6ef] hover:text-[#173d2b]"
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {item.label}
                      </Link>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                onClick={closeMenus}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#52665a] transition hover:bg-[#f2f6ef] hover:text-[#173d2b]"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>

              <Link
                href="/signup"
                onClick={closeMenus}
                className="inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#dce5da] bg-white text-[#173d2b] transition hover:bg-[#f2f6ef] lg:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </nav>

      {/* Mobile navigation */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-[#e9eee7] bg-[#fffefa] px-4 pb-5 pt-3 sm:px-6 lg:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1">
            {publicLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 ${linkClass(item.href)}`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              );
            })}

            <div className="my-3 border-t border-[#e9eee7]" />

            {!authLoading &&
              accountLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`flex items-center gap-3 ${linkClass(item.href)}`}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </Link>
                );
              })}

            {!authLoading &&
              (user ? (
                <div className="mt-4 rounded-2xl border border-[#e2e9df] bg-white p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
                      <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {user.name}
                      </p>

                      <p className="truncate text-xs text-[#809087]">
                        {user.email}
                      </p>

                      <p className="mt-1 text-xs capitalize text-emerald-800">
                        {user.role.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <Link
                    href="/login"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-3 py-3 text-sm font-semibold text-[#173d2b] transition hover:bg-[#f2f6ef]"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Link>

                  <Link
                    href="/signup"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-3 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}

            {authError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {authError}
              </p>
            )}
          </div>
        </div>
      )}

      {authError && !mobileOpen && (
        <p
          role="alert"
          className="border-t border-red-100 bg-red-50 px-4 py-2 text-center text-sm text-red-700"
        >
          {authError}
        </p>
      )}
    </header>
  );
}