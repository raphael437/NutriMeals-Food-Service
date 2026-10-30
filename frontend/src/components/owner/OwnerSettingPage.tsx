"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  ShieldAlert,
  Store,
  Utensils,
} from "lucide-react";

import {
  getAuthState,
  getMyRestaurantInfo,
  updateMyRestaurant,
  type Restaurant,
  type RestaurantSummary,
} from "../../api/api";

type RestaurantForm = {
  name: string;
  description: string;
  address: string;
  phone: string;
  cover_image: string;
  is_open: boolean;
};

const EMPTY_FORM: RestaurantForm = {
  name: "",
  description: "",
  address: "",
  phone: "",
  cover_image: "",
  is_open: false,
};

function toForm(restaurant: Restaurant): RestaurantForm {
  return {
    name: restaurant.name ?? "",
    description: restaurant.description ?? "",
    address: restaurant.address ?? "",
    phone: restaurant.phone ?? "",
    cover_image: restaurant.cover_image ?? "",
    is_open: restaurant.is_open,
  };
}

function statusLabel(status?: string) {
  if (!status) return "Status unavailable";
  return status.replaceAll("_", " ").toLowerCase();
}

export default function OwnerSettingsPage() {
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");

  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState("");

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantForm>(EMPTY_FORM);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantError, setRestaurantError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Load the authenticated restaurant owner's account.
  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const auth = await getAuthState();

        if (cancelled) return;

        if (auth.user.role !== "restaurant_owner") {
          setAccountError(
            "These settings are only available to restaurant-owner accounts."
          );
          setAccountLoading(false);
          setRestaurantLoading(false);
          return;
        }

        const ownedRestaurants = auth.user.restaurants ?? [];

        setRestaurants(ownedRestaurants);

        const initialRestaurant =
          ownedRestaurants.find(
            (item) => item.status === "APPROVED"
          ) ?? ownedRestaurants[0];

        if (initialRestaurant) {
          setSelectedRestaurantId(initialRestaurant.id);
        } else {
          setRestaurantLoading(false);
        }

        setAccountLoading(false);
      } catch (error) {
        if (cancelled) return;

        setAccountError(
          error instanceof Error
            ? error.message
            : "Could not load your account. Please sign in again."
        );

        setAccountLoading(false);
        setRestaurantLoading(false);
      }
    }

    void loadAccount();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the selected restaurant's saved settings.
  useEffect(() => {
    let cancelled = false;

    if (!selectedRestaurantId) return;

    async function loadRestaurant() {
      try {
        const result = await getMyRestaurantInfo(selectedRestaurantId);

        if (cancelled) return;

        setRestaurant(result);
        setForm(toForm(result));
        setRestaurantError("");
        setSaveError("");
        setSaveMessage("");
      } catch (error) {
        if (cancelled) return;

        setRestaurant(null);
        setRestaurantError(
          error instanceof Error
            ? error.message
            : "Could not load your restaurant settings."
        );
      } finally {
        if (!cancelled) {
          setRestaurantLoading(false);
        }
      }
    }

    void loadRestaurant();

    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId]);

  function handleTextChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setSaveError("");
    setSaveMessage("");
  }

  function handleRestaurantChange(restaurantId: string) {
    setSelectedRestaurantId(restaurantId);
    setRestaurant(null);
    setRestaurantError("");
    setSaveError("");
    setSaveMessage("");
    setRestaurantLoading(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRestaurantId || !restaurant) {
      setSaveError("Select a restaurant before saving your settings.");
      return;
    }

    const name = form.name.trim();
    const address = form.address.trim();
    const description = form.description.trim();
    const phone = form.phone.trim();
    const coverImage = form.cover_image.trim();

    if (!name || !address) {
      setSaveError("Restaurant name and address are required.");
      return;
    }

    if (coverImage) {
      try {
        const url = new URL(coverImage);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
          setSaveError("The cover image must use an HTTP or HTTPS URL.");
          return;
        }
      } catch {
        setSaveError("Enter a valid cover image URL.");
        return;
      }
    }

    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const updatedRestaurant = await updateMyRestaurant(
        selectedRestaurantId,
        {
          name,
          address,
          description: description || null,
          phone: phone || null,
          cover_image: coverImage || null,
          is_open: form.is_open,
        }
      );

      setRestaurant(updatedRestaurant);
      setForm(toForm(updatedRestaurant));

      setRestaurants((current) =>
        current.map((item) =>
          item.id === updatedRestaurant.id
            ? {
                ...item,
                name: updatedRestaurant.name,
                status: updatedRestaurant.status,
                is_open: updatedRestaurant.is_open,
              }
            : item
        )
      );

      setSaveMessage("Your restaurant settings have been saved.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save your settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (accountLoading) {
    return <LoadingState message="Loading your account..." />;
  }

  if (accountError) {
    return (
      <MessagePage
        title="Settings unavailable"
        description={accountError}
        linkHref="/"
        linkLabel="Back to home"
      />
    );
  }

  if (restaurants.length === 0) {
    return (
      <MessagePage
        title="No restaurant found"
        description="This account does not have a restaurant associated with it yet. Submit a restaurant application or contact the NutriMeals team if you believe this is a mistake."
        linkHref="/contact"
        linkLabel="Contact support"
      />
    );
  }

  const isApproved = restaurant?.status === "APPROVED";

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#183b2b]">
      {/* Page header */}
      <section className="border-b border-[#e2e9df] bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#617267] transition hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <Store className="h-4 w-4" />
                Restaurant management
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Restaurant settings
              </h1>

              <p className="mt-3 max-w-2xl leading-7 text-[#617267]">
                Manage your public restaurant information and choose whether
                your restaurant is currently accepting orders.
              </p>
            </div>

            {restaurant && (
              <Link
                href="/restaurants"
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm font-semibold transition hover:bg-[#f7f8f4] sm:self-auto"
              >
                View marketplace
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {restaurants.length > 1 && (
          <div className="mb-7 max-w-xl">
            <label
              htmlFor="restaurant-select"
              className="mb-2 block text-sm font-medium"
            >
              Choose a restaurant
            </label>

            <select
              id="restaurant-select"
              value={selectedRestaurantId}
              onChange={(event) =>
                handleRestaurantChange(event.target.value)
              }
              className="w-full rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            >
              {restaurants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.status ? ` — ${statusLabel(item.status)}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {restaurantLoading ? (
          <LoadingState message="Loading restaurant settings..." />
        ) : restaurantError ? (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-6"
            role="alert"
          >
            <h2 className="font-semibold text-red-900">
              Unable to load settings
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-800">
              {restaurantError}
            </p>

            <button
              type="button"
              onClick={() => {
                handleRestaurantChange(selectedRestaurantId);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-900"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : restaurant ? (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Settings form */}
            <section className="min-w-0 rounded-3xl border border-[#e2e9df] bg-white p-6 shadow-sm shadow-emerald-950/5 sm:p-8">
              <div className="border-b border-[#e9eee7] pb-6">
                <h2 className="text-xl font-semibold">
                  Public restaurant information
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#617267]">
                  These details describe your restaurant to customers on the
                  NutriMeals marketplace.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-7 space-y-6">
                {/* Restaurant name */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium"
                  >
                    Restaurant name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.name}
                    onChange={handleTextChange}
                    placeholder="Enter restaurant name"
                    className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium"
                    >
                      Description
                    </label>

                    <span className="text-xs text-[#809087]">
                      {form.description.length}/1000
                    </span>
                  </div>

                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    maxLength={1000}
                    value={form.description}
                    onChange={handleTextChange}
                    placeholder="Tell customers about your food and restaurant..."
                    className="w-full resize-y rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  />

                  <p className="mt-2 text-xs leading-5 text-[#809087]">
                    Keep the description accurate. Mention your cooking style,
                    specialties, and what makes your restaurant distinctive.
                  </p>
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor="address"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <MapPin className="h-4 w-4 text-emerald-800" />
                    Restaurant address
                  </label>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    maxLength={500}
                    value={form.address}
                    onChange={handleTextChange}
                    placeholder="Street, neighborhood, city"
                    className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <Phone className="h-4 w-4 text-emerald-800" />
                    Contact phone
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={handleTextChange}
                    placeholder="Restaurant contact number"
                    className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  />
                </div>

                {/* Cover image */}
                <div>
                  <label
                    htmlFor="cover_image"
                    className="mb-2 flex items-center gap-2 text-sm font-medium"
                  >
                    <ImageIcon className="h-4 w-4 text-emerald-800" />
                    Cover image URL
                  </label>

                  <input
                    id="cover_image"
                    name="cover_image"
                    type="url"
                    maxLength={2048}
                    value={form.cover_image}
                    onChange={handleTextChange}
                    placeholder="https://example.com/restaurant.jpg"
                    className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                  />

                  <p className="mt-2 text-xs leading-5 text-[#809087]">
                    Use a publicly accessible HTTPS image URL for the best
                    results.
                  </p>
                </div>

                {/* Accepting orders */}
                <div className="rounded-2xl border border-[#e2e9df] bg-[#f7f8f4] p-5">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h3 className="font-semibold">
                        Accepting new orders
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-[#617267]">
                        Turn this off temporarily when your restaurant cannot
                        accept orders.
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.is_open}
                      aria-label="Accepting new orders"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          is_open: !current.is_open,
                        }))
                      }
                      className={`relative mt-1 inline-flex h-7 w-12 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 ${
                        form.is_open ? "bg-emerald-700" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`mt-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          form.is_open
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        form.is_open ? "bg-emerald-600" : "bg-slate-400"
                      }`}
                    />

                    <span className="font-medium">
                      {form.is_open
                        ? "Restaurant marked as open"
                        : "Restaurant marked as closed"}
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                {saveError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
                  >
                    {saveError}
                  </div>
                )}

                {saveMessage && (
                  <div
                    role="status"
                    className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    {saveMessage}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-[#e9eee7] pt-6">
                  <button
                    type="submit"
                    disabled={saving || restaurantLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}

                    {saving ? "Saving settings..." : "Save changes"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setForm(toForm(restaurant));
                      setSaveError("");
                      setSaveMessage("");
                    }}
                    className="rounded-xl border border-[#dce5da] px-5 py-3 text-sm font-semibold transition hover:bg-[#f7f8f4] disabled:opacity-60"
                  >
                    Discard changes
                  </button>
                </div>
              </form>
            </section>

            {/* Right side: preview and status */}
            <aside className="space-y-5">
              <section className="overflow-hidden rounded-3xl border border-[#e2e9df] bg-white">
                <div className="border-b border-[#e9eee7] p-5">
                  <h2 className="font-semibold">Restaurant preview</h2>

                  <p className="mt-1 text-sm leading-6 text-[#617267]">
                    A preview of the information you&apos;re editing.
                  </p>
                </div>

                {form.cover_image ? (
                  <div
                    role="img"
                    aria-label="Restaurant cover preview"
                    className="h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${form.cover_image.replace(/["\\]/g, "")}")`,
                    }}
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-emerald-100 via-[#f4f5e8] to-lime-100">
                    <Utensils className="h-12 w-12 text-emerald-800/50" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold">
                      {form.name || "Your restaurant"}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        form.is_open
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {form.is_open ? "Open" : "Closed"}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#617267]">
                    {form.description ||
                      "Your restaurant description will appear here."}
                  </p>

                  {form.address && (
                    <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#617267]">
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-emerald-800" />
                      {form.address}
                    </p>
                  )}

                  {form.phone && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-[#617267]">
                      <Phone className="h-4 w-4 shrink-0 text-emerald-800" />
                      {form.phone}
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e2e9df] bg-white p-5">
                <h2 className="font-semibold">Application status</h2>

                <div className="mt-4 flex items-start gap-3">
                  {restaurant.status === "APPROVED" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  ) : (
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  )}

                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {statusLabel(restaurant.status)}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#617267]">
                      {restaurant.status === "APPROVED"
                        ? "Your restaurant has been approved for the marketplace."
                        : restaurant.status === "PENDING"
                          ? "Your application is awaiting review by the NutriMeals team."
                          : restaurant.status === "REJECTED"
                            ? restaurant.rejection_reason ||
                              "Your application was rejected. Contact support for more information."
                            : restaurant.status === "SUSPENDED"
                              ? "Your restaurant is currently suspended from the marketplace."
                              : "Your current application status is unavailable."}
                    </p>
                  </div>
                </div>

                {restaurant.status !== "APPROVED" && (
                  <Link
                    href="/contact"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
                  >
                    Contact support
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </section>

              <div className="rounded-2xl bg-[#e8efe5] p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />

                  <div>
                    <h3 className="font-semibold">Keep information accurate</h3>

                    <p className="mt-2 text-sm leading-6 text-[#617267]">
                      Use the correct address and contact number so customers
                      can identify your restaurant and delivery location.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-6 text-sm text-[#617267]"
      aria-live="polite"
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
      {message}
    </div>
  );
}

function MessagePage({
  title,
  description,
  linkHref,
  linkLabel,
}: {
  title: string;
  description: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-5 py-12 text-[#183b2b]">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#e2e9df] bg-white p-8 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
          <Store className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>

        <p className="mt-3 leading-7 text-[#617267]">{description}</p>

        <Link
          href={linkHref}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}