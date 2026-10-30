
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Store,
  Utensils,
  Wallet,
} from 'lucide-react';

import {
  getAuthState,
  getDashboard,
  getIncomingOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
  type Pagination,
  type RestaurantDashboard,
  type RestaurantSummary,
} from '../../api/api';

const orderStatusStyles: Record<OrderStatus, string> = {
  placed: 'bg-amber-50 text-amber-800 ring-amber-200',
  confirmed: 'bg-blue-50 text-blue-800 ring-blue-200',
  preparing: 'bg-violet-50 text-violet-800 ring-violet-200',
  out_for_delivery: 'bg-orange-50 text-orange-800 ring-orange-200',
  delivered: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-800 ring-red-200',
};

type OrderStatusFilter = 'all' | OrderStatus;

function formatMoney(value: number | string) {
  const amount = Number(value);

  return `EGP ${
    Number.isFinite(amount)
      ? amount.toLocaleString('en-EG', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '0.00'
  }`;
}

function formatStatus(status: string) {
  return status.replaceAll('_', ' ');
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getNextOrderAction(
  order: Order,
): { status: OrderStatus; label: string } | null {
  // Do not process failed payments or unsettled Paymob checkouts.
  // Pending cash-on-delivery orders without a Paymob order ID can proceed.
  if (
    order.payment_status === 'failed' ||
    (order.payment_status === 'pending' &&
      Boolean(order.paymob_order_id))
  ) {
    return null;
  }

  switch (order.status) {
    case 'placed':
      return {
        status: 'confirmed',
        label: 'Accept order',
      };

    case 'confirmed':
      return {
        status: 'preparing',
        label: 'Start packing',
      };

    case 'preparing':
      return {
        status: 'out_for_delivery',
        label: 'Mark out for delivery',
      };

    case 'out_for_delivery':
      return {
        status: 'delivered',
        label: 'Mark delivered',
      };

    default:
      return null;
  }
}

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b]">
      <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-6">
        <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />

        <p className="text-sm text-[#617267]">
          Loading your restaurant dashboard...
        </p>
      </div>
    </main>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d5e0d2] bg-white px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
        <ShoppingBag className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#183b2b]">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#617267]">
        {description}
      </p>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const [ownerName, setOwnerName] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');

  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const [dashboard, setDashboard] =
    useState<RestaurantDashboard | null>(null);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Paginated order history.
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);

  const [orderStatusFilter, setOrderStatusFilter] =
    useState<OrderStatusFilter>('all');

  const [ordersPagination, setOrdersPagination] =
    useState<Pagination | null>(null);

  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  // Expand one order at a time.
  const [expandedOrderId, setExpandedOrderId] =
    useState<string | null>(null);

  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  const [orderActionError, setOrderActionError] = useState('');
  const [orderActionMessage, setOrderActionMessage] = useState('');

  // Load the authenticated owner and their restaurants.
  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const auth = await getAuthState();

        if (cancelled) return;

        if (auth.user.role !== 'restaurant_owner') {
          setAuthError(
            'This dashboard is available to restaurant-owner accounts only.',
          );
          setAuthLoading(false);
          return;
        }

        const ownedRestaurants = auth.user.restaurants ?? [];

        setOwnerName(auth.user.name);
        setRestaurants(ownedRestaurants);

        const initialRestaurant =
          ownedRestaurants.find(
            restaurant => restaurant.status === 'APPROVED',
          ) ?? ownedRestaurants[0];

        if (initialRestaurant) {
          setSelectedRestaurantId(initialRestaurant.id);
        }

        setAuthLoading(false);
      } catch (error) {
        if (cancelled) return;

        setAuthError(
          error instanceof Error
            ? error.message
            : 'Could not load your account. Please sign in again.',
        );

        setAuthLoading(false);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRestaurant = restaurants.find(
    restaurant => restaurant.id === selectedRestaurantId,
  );

  const selectedStatus = selectedRestaurant?.status;

  const isNotApproved =
    Boolean(selectedStatus) && selectedStatus !== 'APPROVED';

  // Fetch dashboard data. State changes happen in asynchronous callbacks,
  // not synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;

    if (
      !selectedRestaurantId ||
      (selectedRestaurant?.status &&
        selectedRestaurant.status !== 'APPROVED')
    ) {
      return () => {
        cancelled = true;
      };
    }

    getDashboard(selectedRestaurantId)
      .then(result => {
        if (cancelled) return;

        setDashboard(result);
        setDashboardError('');
      })
      .catch(error => {
        if (cancelled) return;

        setDashboard(null);

        setDashboardError(
          error instanceof Error
            ? error.message
            : 'Could not load restaurant information.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId, selectedRestaurant?.status, refreshKey]);

  // Fetch the selected page of orders from the backend.
  useEffect(() => {
    let cancelled = false;
    let adjustingPage = false;

    if (
      !selectedRestaurantId ||
      (selectedRestaurant?.status &&
        selectedRestaurant.status !== 'APPROVED')
    ) {
      return () => {
        cancelled = true;
      };
    }

    getIncomingOrders(selectedRestaurantId, {
      page: ordersPage,
      limit: 10,
      ...(orderStatusFilter !== 'all'
        ? { status: orderStatusFilter }
        : {}),
    })
      .then(result => {
        if (cancelled) return;

        const lastPage = Math.max(1, result.pagination.pages);

        if (ordersPage > lastPage) {
          // Keep the loading state until the corrected page is fetched.
          adjustingPage = true;
          setOrdersPage(lastPage);
          return;
        }

        setOrders(result.orders);
        setOrdersPagination(result.pagination);
        setOrdersError('');
      })
      .catch(error => {
        if (cancelled) return;

        setOrders([]);
        setOrdersPagination(null);

        setOrdersError(
          error instanceof Error
            ? error.message
            : 'Could not load restaurant orders.',
        );
      })
      .finally(() => {
        if (!cancelled && !adjustingPage) {
          setOrdersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedRestaurantId,
    selectedRestaurant?.status,
    ordersPage,
    orderStatusFilter,
    refreshKey,
  ]);

  function handleRestaurantChange(restaurantId: string) {
    const nextRestaurant = restaurants.find(
      restaurant => restaurant.id === restaurantId,
    );

    const canLoad =
      Boolean(restaurantId) &&
      (!nextRestaurant?.status ||
        nextRestaurant.status === 'APPROVED');

    setSelectedRestaurantId(restaurantId);

    setDashboard(null);
    setDashboardError('');
    setDashboardLoading(canLoad);

    setOrders([]);
    setOrdersPage(1);
    setOrderStatusFilter('all');
    setOrdersError('');
    setOrdersPagination(null);
    setOrdersLoading(canLoad);

    setExpandedOrderId(null);
    setOrderActionError('');
    setOrderActionMessage('');
  }

  function handleRefresh() {
    if (
      !selectedRestaurantId ||
      (selectedRestaurant?.status &&
        selectedRestaurant.status !== 'APPROVED')
    ) {
      return;
    }

    setDashboardError('');
    setOrdersError('');
    setOrderActionError('');

    setDashboardLoading(true);
    setOrdersLoading(true);

    setRefreshKey(current => current + 1);
  }

  async function handleAdvanceOrder(order: Order) {
    const nextAction = getNextOrderAction(order);

    if (!nextAction || !selectedRestaurantId) return;

    setUpdatingOrderId(order.id);
    setOrderActionError('');
    setOrderActionMessage('');

    try {
      const updatedOrder = await updateOrderStatus(
        selectedRestaurantId,
        order.id,
        nextAction.status,
      );

      setOrders(current =>
        current.map(item =>
          item.id === updatedOrder.id ? updatedOrder : item,
        ),
      );

      setExpandedOrderId(updatedOrder.id);

      setOrderActionMessage(
        `Order #${updatedOrder.id.slice(0, 8)} updated to ${formatStatus(
          updatedOrder.status,
        )}.`,
      );

      // Refresh balance, metrics, and the order page.
      setDashboardLoading(true);
      setOrdersLoading(true);
      setRefreshKey(current => current + 1);
    } catch (error) {
      setOrderActionError(
        error instanceof Error
          ? error.message
          : 'Could not update this order.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (authError) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b]">
        <div className="mx-auto max-w-2xl rounded-3xl border border-[#e2e9df] bg-white p-8 sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Dashboard unavailable
          </h1>

          <p className="mt-3 leading-7 text-[#617267]">
            {authError}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Back to home
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-[#dce5da] px-5 py-3 text-sm font-semibold hover:bg-[#f7f8f4]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (restaurants.length === 0) {
    return (
      <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b]">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#e2e9df] bg-white p-8 sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Store className="h-7 w-7" />
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Restaurant setup
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Welcome to NutriMeals{ownerName ? `, ${ownerName}` : ''}.
          </h1>

          <p className="mt-4 max-w-xl leading-7 text-[#617267]">
            We couldn&apos;t find a restaurant associated with this account.
            If you recently submitted an application, check your account
            status or contact the NutriMeals team.
          </p>

          <Link
            href="/contact"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 font-semibold text-white transition hover:bg-emerald-900"
          >
            Contact support
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#183b2b]">
      {/* Dashboard header */}
      <section className="border-b border-[#e2e9df] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <LayoutDashboard className="h-4 w-4" />
                Restaurant workspace
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Welcome back{ownerName ? `, ${ownerName}` : ''}.
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-[#617267]">
                Manage your restaurant, process orders, monitor paid sales,
                and keep customers updated about their deliveries.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={dashboardLoading || ordersLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-[#f7f8f4] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    dashboardLoading || ordersLoading ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </button>

              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                <Settings className="h-4 w-4" />
                Restaurant settings
              </Link>
            </div>
          </div>

          {restaurants.length > 1 && (
            <div className="mt-7 max-w-md">
              <label
                htmlFor="restaurant-select"
                className="mb-2 block text-sm font-medium"
              >
                Select restaurant
              </label>

              <select
                id="restaurant-select"
                value={selectedRestaurantId}
                onChange={event =>
                  handleRestaurantChange(event.target.value)
                }
                className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              >
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.status
                      ? ` — ${formatStatus(restaurant.status)}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {/* Restaurant status */}
        {selectedRestaurant && (
          <section className="rounded-2xl border border-[#e2e9df] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                  <Store className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedRestaurant.name}
                  </h2>

                  <p className="mt-1 text-sm text-[#617267]">
                    Your restaurant workspace and operational overview.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedStatus && (
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      selectedStatus === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-800'
                        : selectedStatus === 'PENDING'
                          ? 'bg-amber-50 text-amber-800'
                          : selectedStatus === 'REJECTED'
                            ? 'bg-red-50 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedStatus === 'APPROVED' ? (
                      <BadgeCheck className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4" />
                    )}

                    {formatStatus(selectedStatus)}
                  </span>
                )}

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    selectedRestaurant.is_open
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {selectedRestaurant.is_open
                    ? 'Accepting orders'
                    : 'Currently closed'}
                </span>
              </div>
            </div>

            {isNotApproved && (
              <div
                className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                role="status"
              >
                {selectedStatus === 'PENDING'
                  ? 'Your restaurant application is awaiting review. Dashboard metrics will be available after approval.'
                  : selectedStatus === 'REJECTED'
                    ? 'Your restaurant application was rejected. Please contact support for assistance.'
                    : 'This restaurant is not currently approved to operate on the marketplace. Contact support for help.'}

                {selectedStatus !== 'PENDING' && (
                  <Link
                    href="/contact"
                    className="ml-1 font-semibold underline underline-offset-2"
                  >
                    Contact support
                  </Link>
                )}
              </div>
            )}
          </section>
        )}

        {!isNotApproved && (
          <>
            {/* Dashboard request error */}
            {dashboardError && (
              <section
                className="rounded-2xl border border-red-200 bg-red-50 p-5"
                role="alert"
              >
                <h2 className="font-semibold text-red-900">
                  Could not load dashboard data
                </h2>

                <p className="mt-2 text-sm leading-6 text-red-800">
                  {dashboardError}
                </p>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900"
                >
                  Try again
                </button>
              </section>
            )}

            {/* Dashboard metrics */}
            {dashboardLoading && !dashboard && (
              <div className="flex items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-6 text-sm text-[#617267]">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
                Loading your restaurant metrics...
              </div>
            )}

            {dashboard && (
              <>
                <section>
                  <div className="mb-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
                      At a glance
                    </p>

                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      Your restaurant overview
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#617267]">
                      Monitor order activity and your paid order balance.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      title="Total orders"
                      value={dashboard.metrics.totalOrders.toLocaleString()}
                      description="All orders placed with your restaurant."
                      icon={<ShoppingBag className="h-5 w-5" />}
                      iconBackground="bg-blue-50 text-blue-800"
                    />

                    <MetricCard
                      title="Pending orders"
                      value={dashboard.metrics.pendingOrders.toLocaleString()}
                      description="Orders awaiting acceptance or further processing."
                      icon={<Clock3 className="h-5 w-5" />}
                      iconBackground="bg-amber-50 text-amber-800"
                    />

                    <MetricCard
                      title="Delivered orders"
                      value={dashboard.metrics.deliveredOrders.toLocaleString()}
                      description="Orders whose delivery has been completed."
                      icon={<Activity className="h-5 w-5" />}
                      iconBackground="bg-emerald-50 text-emerald-800"
                    />

                    <MetricCard
                      title="Menu items"
                      value={dashboard.metrics.menuItems.toLocaleString()}
                      description="Items listed in your restaurant menu."
                      icon={<Utensils className="h-5 w-5" />}
                      iconBackground="bg-violet-50 text-violet-800"
                    />
                  </div>
                </section>

                {/* Paid order balance and subscription */}
                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl bg-[#173d2b] p-6 text-white sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-emerald-100">
                          Total paid orders balance
                        </p>

                        <p className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                          {formatMoney(
                            dashboard.metrics.paidOrderBalance,
                          )}
                        </p>

                        <p className="mt-3 text-sm font-medium text-emerald-100">
                          {dashboard.metrics.paidOrderCount.toLocaleString()}{' '}
                          paid order(s)
                        </p>

                        <p className="mt-3 max-w-md text-sm leading-6 text-emerald-100/80">
                          Gross value of all orders confirmed as paid,
                          including orders being prepared and delivered.
                          This is not a net payout balance.
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-200">
                        <Wallet className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e2e9df] bg-white p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-[#617267]">
                          Restaurant subscription
                        </p>

                        <h3 className="mt-3 text-2xl font-semibold">
                          {dashboard.activeSubscription
                            ? formatStatus(
                                dashboard.activeSubscription.status,
                              )
                            : 'No active subscription'}
                        </h3>

                        <p className="mt-3 text-sm leading-6 text-[#617267]">
                          {dashboard.activeSubscription
                            ? 'Your current subscription status is shown here.'
                            : 'Review your restaurant settings for available account options.'}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                        <BadgeCheck className="h-6 w-6" />
                      </div>
                    </div>

                    <Link
                      href="/settings"
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
                    >
                      Open restaurant settings
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>
              </>
            )}

            {/* Full paginated order management */}
            <section>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Order management
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                    All orders
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#617267]">
                    Open an order to review its details and advance it
                    through packing and delivery.
                  </p>
                </div>

                <div className="w-full sm:max-w-xs">
                  <label
                    htmlFor="orders-status-filter"
                    className="mb-2 block text-sm font-medium"
                  >
                    Filter by status
                  </label>

                  <select
                    id="orders-status-filter"
                    value={orderStatusFilter}
                    onChange={event => {
                      setOrdersLoading(true);
                      setOrderStatusFilter(
                        event.target.value as OrderStatusFilter,
                      );
                      setOrdersPage(1);
                      setExpandedOrderId(null);
                      setOrderActionError('');
                      setOrderActionMessage('');
                    }}
                    className="w-full rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700"
                  >
                    <option value="all">All statuses</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing / packing</option>
                    <option value="out_for_delivery">
                      Out for delivery
                    </option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {orderActionError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  {orderActionError}
                </div>
              )}

              {orderActionMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                >
                  {orderActionMessage}
                </div>
              )}

              {ordersError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  {ordersError}

                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="ml-2 font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {ordersLoading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-6 text-sm text-[#617267]">
                  <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  title="No orders found"
                  description={
                    orderStatusFilter === 'all'
                      ? 'New customer orders will appear here.'
                      : 'There are no orders matching this status.'
                  }
                />
              ) : (
                <div className="space-y-3">
                  {orders.map(order => {
                    const expanded = expandedOrderId === order.id;
                    const nextAction = getNextOrderAction(order);
                    const updating = updatingOrderId === order.id;

                    return (
                      <article
                        key={order.id}
                        className="overflow-hidden rounded-2xl border border-[#e2e9df] bg-white"
                      >
                        {/* Clickable order summary */}
                        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-controls={`order-details-${order.id}`}
                            onClick={() => {
                              setExpandedOrderId(
                                expanded ? null : order.id,
                              );
                              setOrderActionError('');
                            }}
                            className="min-w-0 flex-1 cursor-pointer text-left"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-semibold">
                                Order #{order.id.slice(0, 8)}
                              </h3>

                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${
                                  orderStatusStyles[order.status]
                                }`}
                              >
                                {formatStatus(order.status)}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-[#617267]">
                              {order.customer?.name ?? 'Customer'}
                              {' · '}
                              {formatDate(order.created_at)}
                            </p>

                            <p className="mt-1 text-xs text-[#809087]">
                              {order.items?.reduce(
                                (total, item) => total + item.quantity,
                                0,
                              ) ?? 0}{' '}
                              item(s)
                              {' · Payment '}
                              {formatStatus(order.payment_status)}
                            </p>

                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                              {expanded
                                ? 'Hide order details'
                                : 'View full order details'}

                              {expanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          </button>

                          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                            <p className="font-semibold text-[#183b2b]">
                              {formatMoney(order.total)}
                            </p>

                            {nextAction && (
                              <button
                                type="button"
                                disabled={
                                  updating ||
                                  updatingOrderId !== null
                                }
                                onClick={() =>
                                  void handleAdvanceOrder(order)
                                }
                                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#173d2b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {updating ? (
                                  <span className="inline-flex items-center gap-2">
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    Updating...
                                  </span>
                                ) : (
                                  nextAction.label
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded order details */}
                        {expanded && (
                          <div
                            id={`order-details-${order.id}`}
                            className="border-t border-[#e9eee7] bg-[#fbfcfa] p-4 sm:p-6"
                          >
                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#809087]">
                                  Customer
                                </p>

                                <p className="mt-2 font-medium">
                                  {order.customer?.name ?? 'Customer'}
                                </p>

                                <p className="mt-1 text-sm text-[#617267]">
                                  {order.customer?.phone ??
                                    'No phone provided'}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#809087]">
                                  Delivery address
                                </p>

                                <div className="mt-2 flex items-start gap-2">
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />

                                  <p className="text-sm leading-6 text-[#183b2b]">
                                    {order.address
                                      ? [
                                          order.address.line1,
                                          order.address.city,
                                        ]
                                          .filter(Boolean)
                                          .join(', ')
                                      : 'Address unavailable'}
                                  </p>
                                </div>

                                {order.address?.label && (
                                  <p className="mt-1 text-xs text-[#809087]">
                                    {order.address.label}
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#809087]">
                                  Payment
                                </p>

                                <p className="mt-2 font-medium capitalize">
                                  {formatStatus(order.payment_status)}
                                </p>

                                <p className="mt-1 text-sm text-[#617267]">
                                  Order total: {formatMoney(order.total)}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#809087]">
                                  Delivery status
                                </p>

                                <p className="mt-2 font-medium capitalize">
                                  {formatStatus(order.status)}
                                </p>

                                {order.out_for_delivery_at && (
                                  <p className="mt-1 text-sm text-[#617267]">
                                    Dispatched:{' '}
                                    {formatDate(
                                      order.out_for_delivery_at,
                                    )}
                                  </p>
                                )}

                                {order.delivered_at && (
                                  <p className="mt-1 text-sm text-[#617267]">
                                    Delivered:{' '}
                                    {formatDate(order.delivered_at)}
                                  </p>
                                )}

                                {order.estimated_delivery_at && (
                                  <p className="mt-1 text-sm text-[#617267]">
                                    Estimated delivery:{' '}
                                    {formatDate(
                                      order.estimated_delivery_at,
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>

                            {order.notes && (
                              <div className="mt-5 rounded-xl border border-[#e2e9df] bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#809087]">
                                  Customer notes
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52665a]">
                                  {order.notes}
                                </p>
                              </div>
                            )}

                            <div className="mt-6">
                              <h4 className="font-semibold">
                                Ordered items
                              </h4>

                              <div className="mt-3 divide-y divide-[#e9eee7] rounded-xl border border-[#e2e9df] bg-white px-4">
                                {order.items?.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-4 py-4"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-medium">
                                        {item.menu_item?.name ??
                                          'Menu item'}
                                      </p>

                                      <p className="mt-1 text-sm text-[#617267]">
                                        {item.quantity}
                                        {' × '}
                                        {formatMoney(item.price_at_order)}
                                        {' each'}
                                      </p>

                                      {item.menu_item?.serving_size && (
                                        <p className="mt-1 text-xs text-[#809087]">
                                          Serving:{' '}
                                          {item.menu_item.serving_size}
                                        </p>
                                      )}
                                    </div>

                                    <p className="shrink-0 font-semibold">
                                      {formatMoney(
                                        Number(item.price_at_order) *
                                          item.quantity,
                                      )}
                                    </p>
                                  </div>
                                ))}

                                {!order.items?.length && (
                                  <p className="py-4 text-sm text-[#809087]">
                                    No item details are available.
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between gap-4">
                                <p className="font-semibold">
                                  Order total
                                </p>

                                <p className="text-lg font-semibold">
                                  {formatMoney(order.total)}
                                </p>
                              </div>
                            </div>

                            {nextAction && (
                              <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[#e2e9df] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold">
                                    Next step
                                  </p>

                                  <p className="mt-1 text-sm text-[#617267]">
                                    Update this order to{' '}
                                    <span className="font-medium capitalize">
                                      {formatStatus(nextAction.status)}
                                    </span>
                                    . The customer&apos;s tracking page
                                    will reflect the new status when it
                                    refreshes.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    updating ||
                                    updatingOrderId !== null
                                  }
                                  onClick={() =>
                                    void handleAdvanceOrder(order)
                                  }
                                  className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {updating ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ArrowRight className="h-4 w-4" />
                                  )}

                                  {updating
                                    ? 'Updating...'
                                    : nextAction.label}
                                </button>
                              </div>
                            )}

                            {!nextAction &&
                              order.status !== 'delivered' &&
                              order.status !== 'cancelled' &&
                              (order.payment_status === 'failed' ||
                                (order.payment_status === 'pending' &&
                                  Boolean(order.paymob_order_id))) && (
                                <div
                                  role="status"
                                  className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
                                >
                                  Order processing is unavailable until
                                  its payment status is resolved.
                                </div>
                              )}

                            <Link
                              href={`/restaurants/${order.restaurant_id}`}
                              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
                            >
                              View public restaurant page
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {!ordersLoading && ordersPagination && (
                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#e2e9df] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#617267]">
                    {ordersPagination.total === 0
                      ? 'No orders'
                      : `${orders.length} order(s) on this page · ${ordersPagination.total} total`}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={ordersPage <= 1}
                      onClick={() => {
                        setOrdersLoading(true);
                        setOrdersPage(page =>
                          Math.max(1, page - 1),
                        );
                      }}
                      className="cursor-pointer rounded-lg border border-[#dce5da] px-4 py-2 text-sm font-semibold hover:bg-[#f7f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-[#617267]">
                      Page {ordersPage} of{' '}
                      {Math.max(ordersPagination.pages, 1)}
                    </span>

                    <button
                      type="button"
                      disabled={
                        ordersPage >=
                        Math.max(ordersPagination.pages, 1)
                      }
                      onClick={() => {
                        setOrdersLoading(true);
                        setOrdersPage(page =>
                          Math.min(
                            Math.max(ordersPagination.pages, 1),
                            page + 1,
                          ),
                        );
                      }}
                      className="cursor-pointer rounded-lg border border-[#dce5da] px-4 py-2 text-sm font-semibold hover:bg-[#f7f8f4] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* Footer actions */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/settings"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[#e2e9df] bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <Settings className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold">Restaurant settings</h3>

                <p className="mt-1 text-sm text-[#617267]">
                  Review your restaurant information.
                </p>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 shrink-0 text-[#617267] transition group-hover:translate-x-1 group-hover:text-emerald-800" />
          </Link>

          <Link
            href="/restaurants"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[#e2e9df] bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm sm:p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <ExternalLink className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold">Public marketplace</h3>

                <p className="mt-1 text-sm text-[#617267]">
                  Browse customer-facing restaurant listings.
                </p>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 shrink-0 text-[#617267] transition group-hover:translate-x-1 group-hover:text-emerald-800" />
          </Link>
        </section>

        {dashboard?.note && (
          <p className="text-xs leading-5 text-[#809087]">
            {dashboard.note}
          </p>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  iconBackground,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconBackground: string;
}) {
  return (
    <article className="rounded-2xl border border-[#e2e9df] bg-white p-5 transition hover:shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#617267]">
            {title}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#183b2b]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBackground}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-[#809087]">
        {description}
      </p>
    </article>
  );
}
