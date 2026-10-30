"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Utensils,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  approveRestaurant,
  getAdminDashboard,
  getAuthState,
  getRestaurantApplications,
  rejectRestaurant,
  type AdminDashboard,
  type Restaurant,
} from "../../api/api";

type DashboardData = {
  dashboard: AdminDashboard;
  applications: Restaurant[];
};

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
};

const numberFormat = new Intl.NumberFormat("en-EG", {
  maximumFractionDigits: 0,
});

const currencyFormat = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 2,
});

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-[#e5e9df] bg-white p-5 shadow-sm shadow-emerald-950/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718078]">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[#173d2b] sm:text-3xl">
            {value}
          </p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#809087]">{description}</p>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [metrics, setMetrics] = useState<AdminDashboard["metrics"] | null>(null);
  const [dashboardNote, setDashboardNote] = useState("");
  const [applications, setApplications] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestDashboardData = useCallback(async (): Promise<DashboardData> => {
    const [dashboard, applicationResult] = await Promise.all([
      getAdminDashboard(),
      getRestaurantApplications({ status: "PENDING", page: 1, limit: 5 }),
    ]);

    return {
      dashboard,
      applications: applicationResult.restaurants,
    };
  }, []);

  const applyDashboardData = useCallback((data: DashboardData) => {
    setMetrics(data.dashboard.metrics);
    setDashboardNote(data.dashboard.note);
    setApplications(data.applications);
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeDashboard() {
      setLoading(true);
      setError("");

      let authState: Awaited<ReturnType<typeof getAuthState>>;
      try {
        authState = await getAuthState();
      } catch {
        if (active) {
          router.replace("/signin?next=%2Fadmin%2Fdashboard");
        }
        if (active) setLoading(false);
        return;
      }

      if (!active) return;

      if (authState.user.role !== "admin") {
        router.replace(authState.next || "/restaurants");
        setLoading(false);
        return;
      }

      setAdminName(authState.user.name);

      try {
        const data = await requestDashboardData();
        if (active) applyDashboardData(data);
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "We couldn't load the admin dashboard. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initializeDashboard();
    return () => {
      active = false;
    };
  }, [applyDashboardData, requestDashboardData, router]);

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    setNotice("");

    try {
      const data = await requestDashboardData();
      applyDashboardData(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Refresh failed. Please try again."
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function handleApplicationAction(
    restaurant: Restaurant,
    action: "approve" | "reject"
  ) {
    let rejectionReason = "";

    if (action === "approve") {
      const confirmed = window.confirm(
        `Approve ${restaurant.name} as a NutriMeals restaurant?`
      );
      if (!confirmed) return;
    } else {
      const enteredReason = window.prompt(
        `Why are you rejecting ${restaurant.name}? Enter a reason for the applicant.`
      );
      if (enteredReason === null) return;
      rejectionReason = enteredReason.trim();

      if (!rejectionReason) {
        setError("Enter a rejection reason before rejecting this application.");
        return;
      }
    }

    setActionId(`${restaurant.id}:${action}`);
    setError("");
    setNotice("");

    try {
      if (action === "approve") {
        await approveRestaurant(restaurant.id);
        setNotice(`${restaurant.name} has been approved.`);
      } else {
        await rejectRestaurant(restaurant.id, rejectionReason);
        setNotice(`${restaurant.name} has been rejected.`);
      }

      const data = await requestDashboardData();
      applyDashboardData(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not ${action} this application. Please try again.`
      );
    } finally {
      setActionId(null);
    }
  }

  const metricCards: MetricCardProps[] = metrics
    ? [
        {
          title: "Total users",
          value: numberFormat.format(metrics.users),
          description: "All registered platform accounts",
          icon: Users,
          iconClass: "bg-emerald-50 text-emerald-800",
        },
        {
          title: "Customers",
          value: numberFormat.format(metrics.customers),
          description: "Customer accounts on the platform",
          icon: ShoppingBag,
          iconClass: "bg-sky-50 text-sky-800",
        },
        {
          title: "Restaurant owners",
          value: numberFormat.format(metrics.restaurantOwners),
          description: "Accounts approved as restaurant owners",
          icon: Store,
          iconClass: "bg-violet-50 text-violet-800",
        },
        {
          title: "Pending applications",
          value: numberFormat.format(metrics.pendingRestaurants),
          description: "Restaurants awaiting your review",
          icon: Clock3,
          iconClass: "bg-amber-50 text-amber-800",
        },
        {
          title: "Approved restaurants",
          value: numberFormat.format(metrics.approvedRestaurants),
          description: "Restaurants approved to operate",
          icon: CheckCircle2,
          iconClass: "bg-emerald-50 text-emerald-800",
        },
        {
          title: "Rejected applications",
          value: numberFormat.format(metrics.rejectedRestaurants),
          description: "Restaurant applications rejected",
          icon: XCircle,
          iconClass: "bg-rose-50 text-rose-800",
        },
        {
          title: "Suspended restaurants",
          value: numberFormat.format(metrics.suspendedRestaurants),
          description: "Restaurants currently suspended",
          icon: ShieldCheck,
          iconClass: "bg-orange-50 text-orange-800",
        },
        {
          title: "Orders",
          value: numberFormat.format(metrics.orders),
          description: "Orders recorded across the platform",
          icon: Utensils,
          iconClass: "bg-teal-50 text-teal-800",
        },
        {
          title: "Active subscriptions",
          value: numberFormat.format(metrics.activeSubscriptions),
          description: "Restaurant subscriptions currently active",
          icon: Activity,
          iconClass: "bg-indigo-50 text-indigo-800",
        },
        {
          title: "Paid order volume",
          value: currencyFormat.format(metrics.paidOrderVolume),
          description: "Total value of orders marked as paid",
          icon: ShoppingBag,
          iconClass: "bg-lime-50 text-lime-900",
        },
      ]
    : [];

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#faf8f2] px-4">
        <div className="flex items-center gap-3 text-sm text-[#52665a]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading admin dashboard…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[80vh] bg-[#faf8f2] px-4 py-8 text-[#183b2b] sm:px-6 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900">
              <ShieldCheck className="h-3.5 w-3.5" />
              Platform administration
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#173d2b] sm:text-4xl">
              Admin dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#718078] sm:text-base">
              {adminName ? `Welcome back, ${adminName}. ` : "Welcome back. "}
              Monitor NutriMeals and review restaurant applications from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing || actionId !== null}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#dce5da] bg-white px-4 py-2.5 text-sm font-semibold text-[#173d2b] shadow-sm transition hover:bg-[#f2f6ef] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </div>

        {error ? (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {notice ? (
          <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}

        <section aria-labelledby="platform-overview-heading" className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="platform-overview-heading" className="text-lg font-semibold text-[#173d2b]">
                Platform overview
              </h2>
              <p className="mt-1 text-sm text-[#809087]">Live totals from your backend</p>
            </div>
            <span className="hidden items-center gap-2 text-xs text-[#809087] sm:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Connected to NutriMeals API
            </span>
          </div>

          {metrics ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {metricCards.map((metric) => (
                <MetricCard key={metric.title} {...metric} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e5e9df] bg-white p-6 text-sm text-[#718078]">
              Dashboard metrics are not available. Use Refresh data to try again.
            </div>
          )}

          {dashboardNote ? (
            <p className="mt-4 rounded-xl border border-[#e5e9df] bg-white/70 px-4 py-3 text-xs leading-5 text-[#718078]">
              <strong className="font-semibold text-[#52665a]">Financial note: </strong>
              {dashboardNote}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="pending-applications-heading" className="mt-9 overflow-hidden rounded-3xl border border-[#e2e9df] bg-white shadow-sm shadow-emerald-950/[0.03]">
          <div className="flex flex-col justify-between gap-3 border-b border-[#e9eee7] px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <div className="flex items-center gap-2">
                <h2 id="pending-applications-heading" className="text-lg font-semibold text-[#173d2b]">
                  Restaurant applications
                </h2>
                {metrics && metrics.pendingRestaurants > 0 ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {numberFormat.format(metrics.pendingRestaurants)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[#809087]">
                Review pending applications before enabling restaurant-owner access.
              </p>
            </div>
            <Link
              href="/restaurants"
              className="inline-flex items-center justify-center rounded-xl border border-[#dce5da] px-3 py-2 text-sm font-semibold text-[#173d2b] transition hover:bg-[#f2f6ef]"
            >
              View marketplace
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="px-5 py-12 text-center sm:px-7">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-[#173d2b]">You’re all caught up</h3>
              <p className="mt-1 text-sm text-[#809087]">There are no restaurant applications waiting for review.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#edf0e9]">
              {applications.map((restaurant) => {
                const approving = actionId === `${restaurant.id}:approve`;
                const rejecting = actionId === `${restaurant.id}:reject`;
                const busy = actionId !== null;

                return (
                  <article key={restaurant.id} className="flex flex-col gap-4 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f2f6ef] text-[#173d2b]">
                        <Store className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[#173d2b]">{restaurant.name}</h3>
                        <p className="mt-1 text-sm text-[#52665a]">
                          {restaurant.owner?.name || "Applicant name unavailable"}
                          {restaurant.owner?.email ? ` · ${restaurant.owner.email}` : ""}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#809087]">
                          {restaurant.address}
                        </p>
                        <p className="mt-2 text-xs text-[#809087]">
                          Submitted {formatDate(restaurant.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
                        <Clock3 className="h-3.5 w-3.5" />
                        Pending review
                      </span>
                      <Link
                        href="/admin/restaurant-applications"
                        aria-label={`See full application for ${restaurant.name}`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-4 py-2 text-sm font-semibold text-[#173d2b] transition hover:bg-[#f2f6ef]"
                      >
                        <Eye className="h-4 w-4" />
                        See full application
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleApplicationAction(restaurant, "approve")}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {approving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {approving ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApplicationAction(restaurant, "reject")}
                        disabled={busy}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rejecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        {rejecting ? "Rejecting…" : "Reject"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {metrics && metrics.pendingRestaurants > applications.length ? (
            <p className="border-t border-[#e9eee7] bg-[#fffefa] px-5 py-3 text-xs text-[#809087] sm:px-7">
              Showing the first {applications.length} pending applications. Refresh the dashboard after reviewing them to load the next pending items.
            </p>
          ) : null}
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-[#e2e9df] pt-5 text-xs leading-5 text-[#809087] sm:flex-row sm:items-center sm:justify-between">
          <span>NutriMeals · Platform administration</span>
          <span>For security, admin data is loaded from authenticated API endpoints.</span>
        </footer>
      </div>
    </main>
  );
}
