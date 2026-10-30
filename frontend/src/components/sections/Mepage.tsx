"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";

import {
  getAuthState,
  getMyOrders,
  type Order,
  type Role,
  type User,
} from "../../api/api";

function formatMoney(value: number | string) {
  const amount = Number(value);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "delivered":
    case "paid":
      return "bg-emerald-50 text-emerald-800";

    case "cancelled":
    case "rejected":
    case "suspended":
    case "failed":
      return "bg-red-50 text-red-800";

    case "placed":
    case "pending":
    case "preparing":
    case "out_for_delivery":
      return "bg-amber-50 text-amber-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default function MePage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [role, setRole] = useState<Role | null>(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const auth = await getAuthState();

        if (cancelled) return;

        setUser(auth.user);
        setRole(auth.user.role);

        if (auth.user.role === "customer") {
          try {
            const result = await getMyOrders({
              page: 1,
              limit: 3,
            });

            if (!cancelled) {
              setOrders(result.orders);
            }
          } catch (error) {
            if (!cancelled) {
              setOrdersError(
                error instanceof Error
                  ? error.message
                  : "Could not load your recent orders."
              );
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Your session could not be verified. Please sign in again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#f7f8f4] px-5 text-[#183b2b]">
        <div className="flex items-center gap-3 text-sm text-[#617267]">
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
          Loading your account...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#f7f8f4] px-5 py-12 text-[#183b2b]">
        <section className="w-full max-w-xl rounded-3xl border border-[#e2e9df] bg-white p-8 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <UserRound className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Your account
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#617267]">
            {pageError || "Sign in to access your NutriMeals account."}
          </p>

          <Link
            href="/signin"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    );
  }

  const roleDescription: Record<Role, string> = {
    customer:
      "Manage your orders and discover more meals from NutriMeals restaurants.",
    restaurant_owner:
      "Manage your restaurant, keep your menu updated, and follow incoming orders.",
    admin:
      "Access marketplace administration and monitor the NutriMeals platform.",
  };

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-4 py-10 text-[#183b2b] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Account heading */}
        <header className="relative overflow-hidden rounded-3xl bg-[#173d2b] p-6 text-white sm:p-9 lg:p-12">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                NutriMeals account
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome, {user.name}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/80 sm:text-base">
                {roleDescription[user.role]}
              </p>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-emerald-200">
              <UserRound className="h-8 w-8" />
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap items-center gap-3 border-t border-white/15 pt-5 text-sm">
            <span className="text-emerald-50/70">{user.email}</span>

            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium capitalize text-white">
              {user.role.replaceAll("_", " ")}
            </span>
          </div>
        </header>

        {/* Role-specific navigation */}
        <section>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Your workspace
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Quick access
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {role === "customer" && (
              <>
                <AccountLinkCard
                  href="/orders"
                  title="My orders"
                  description="Review order status, payment details, and delivery progress."
                  icon={<Package className="h-6 w-6" />}
                />

                <AccountLinkCard
                  href="/cart"
                  title="My cart"
                  description="Review your selected meals and continue to checkout."
                  icon={<ShoppingBag className="h-6 w-6" />}
                />

                <AccountLinkCard
                  href="/restaurants"
                  title="Explore restaurants"
                  description="Discover menus and choose meals for delivery."
                  icon={<Store className="h-6 w-6" />}
                />
              </>
            )}

            {role === "restaurant_owner" && (
              <>
                <AccountLinkCard
                  href="/dashboard"
                  title="Restaurant dashboard"
                  description="Review restaurant metrics and recent order activity."
                  icon={<LayoutDashboard className="h-6 w-6" />}
                />

                <AccountLinkCard
                  href="/settings"
                  title="Restaurant settings"
                  description="Update your restaurant information and opening status."
                  icon={<Settings className="h-6 w-6" />}
                />

                <AccountLinkCard
                  href="/restaurants"
                  title="Public marketplace"
                  description="See the customer-facing restaurant marketplace."
                  icon={<Store className="h-6 w-6" />}
                />
              </>
            )}

            {role === "admin" && (
              <>
                <AccountLinkCard
                  href="/admin/dashboard"
                  title="Admin dashboard"
                  description="Review platform-wide activity and account metrics."
                  icon={<ShieldCheck className="h-6 w-6" />}
                />

                <AccountLinkCard
                  href="/admin/restaurant-applications"
                  title="Restaurant applications"
                  description="Review restaurant applications if this route is enabled."
                  icon={<Store className="h-6 w-6" />}
                />

                <AccountLinkCard
                  href="/restaurants"
                  title="Public marketplace"
                  description="View the customer-facing restaurant listing."
                  icon={<ShoppingBag className="h-6 w-6" />}
                />
              </>
            )}
          </div>
        </section>

        {/* Customer order preview */}
        {role === "customer" && (
          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  Recent activity
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Your latest orders
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#617267]">
                  Check the status of your most recent orders.
                </p>
              </div>

              <Link
                href="/orders"
                className="inline-flex items-center gap-2 self-start text-sm font-semibold text-emerald-800 hover:text-emerald-600 sm:self-auto"
              >
                View all orders
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {ordersError && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
              >
                {ordersError}
              </div>
            )}

            {!ordersError && orders.length === 0 ? (
              <div className="rounded-2xl border border-[#e2e9df] bg-white p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <ShoppingBag className="h-6 w-6" />
                </div>

                <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>

                <p className="mt-2 text-sm leading-6 text-[#617267]">
                  Explore available restaurants and place your first order.
                </p>

                <Link
                  href="/restaurants"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  Browse restaurants
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-col gap-4 rounded-2xl border border-[#e2e9df] bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h3 className="font-semibold">
                        {order.restaurant?.name ?? "NutriMeals order"}
                      </h3>

                      <p className="mt-1 text-xs text-[#809087]">
                        Order #{order.id.slice(0, 8)}
                      </p>

                      <p className="mt-2 text-sm text-[#617267]">
                        {formatDate(order.created_at)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(order.status)}`}
                        >
                          {formatStatus(order.status)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(order.payment_status)}`}
                        >
                          {formatStatus(order.payment_status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                      <p className="font-semibold">
                        {formatMoney(order.total)}
                      </p>

                      <Link
                        href={`/orders/${encodeURIComponent(order.id)}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-[#dce5da] px-4 py-2.5 text-sm font-semibold transition hover:bg-[#eef3e9]"
                      >
                        View order
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Support */}
        <section className="flex flex-col gap-4 rounded-2xl border border-[#e2e9df] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">Need help?</h2>
              <p className="mt-1 text-sm leading-6 text-[#617267]">
                Contact the NutriMeals team with a question about your account
                or an order.
              </p>
            </div>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-[#dce5da] px-4 py-3 text-sm font-semibold transition hover:bg-[#eef3e9] sm:self-auto"
          >
            Contact support
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function AccountLinkCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#e2e9df] bg-white p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800 transition group-hover:bg-[#173d2b] group-hover:text-white">
          {icon}
        </div>

        <ArrowRight className="h-5 w-5 text-[#809087] transition group-hover:translate-x-1 group-hover:text-emerald-800" />
      </div>

      <h3 className="mt-5 text-lg font-semibold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-[#617267]">
        {description}
      </p>
    </Link>
  );
}