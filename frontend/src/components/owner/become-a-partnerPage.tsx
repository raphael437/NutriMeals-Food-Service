"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signupRestaurantOwner } from "../../api/api";

type PartnerForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
  description: string;
};

const initialForm: PartnerForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  restaurantName: "",
  restaurantAddress: "",
  restaurantPhone: "",
  description: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15";
const labelClass = "block text-sm font-medium text-stone-700";

export default function BecomeAPartnerPage() {
  const router = useRouter();
  const [form, setForm] = useState<PartnerForm>(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof PartnerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signupRestaurantOwner({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        restaurantName: form.restaurantName.trim(),
        restaurantAddress: form.restaurantAddress.trim(),
        restaurantPhone: form.restaurantPhone.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      router.replace(result.next || "/restaurants/pending");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f2] px-4 py-12 text-stone-900 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="pt-2 lg:sticky lg:top-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-800">NutriMeals partners</p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Bring your kitchen to more tables.</h1>
          <p className="mt-5 max-w-xl leading-7 text-stone-600">
            Tell us about your restaurant. Our team will review your application, and you will be able to manage your menu and incoming orders after approval.
          </p>
          <div className="mt-8 space-y-4 text-sm text-stone-700">
            <p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-900">1</span><span><strong>Apply online</strong><br />Create your account and share your restaurant details.</span></p>
            <p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-900">2</span><span><strong>Wait for review</strong><br />Your dashboard stays locked while the application is pending.</span></p>
            <p className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-900">3</span><span><strong>Start serving</strong><br />Once approved, finish setup and publish your menu.</span></p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-xl font-semibold">Application details</h2>
            <p className="mt-1 text-sm text-stone-500">Fields marked with * are required.</p>
          </div>

          <div className="mt-7">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Your account</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>Full name *<input className={inputClass} autoComplete="name" required value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Your full name" /></label>
              <label className={labelClass}>Email address *<input className={inputClass} type="email" autoComplete="email" required value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" /></label>
              <label className={labelClass}>Your phone<input className={inputClass} type="tel" autoComplete="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Optional" /></label>
              <span className="hidden sm:block" aria-hidden="true" />
              <label className={labelClass}>Password *<input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="At least 8 characters" /></label>
              <label className={labelClass}>Confirm password *<input className={inputClass} type="password" autoComplete="new-password" minLength={8} required value={form.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="Enter it again" /></label>
            </div>
          </div>

          <div className="mt-8 border-t border-stone-100 pt-7">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Restaurant details</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>Restaurant name *<input className={inputClass} required value={form.restaurantName} onChange={(e) => updateField("restaurantName", e.target.value)} placeholder="Your restaurant name" /></label>
              <label className={labelClass}>Restaurant phone<input className={inputClass} type="tel" value={form.restaurantPhone} onChange={(e) => updateField("restaurantPhone", e.target.value)} placeholder="Optional" /></label>
              <label className={`${labelClass} sm:col-span-2`}>Restaurant address *<input className={inputClass} required value={form.restaurantAddress} onChange={(e) => updateField("restaurantAddress", e.target.value)} placeholder="Street, area, city" /></label>
              <label className={`${labelClass} sm:col-span-2`}>Short description<textarea className={inputClass} rows={4} maxLength={1000} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="What kind of food do you serve?" /></label>
            </div>
          </div>

          {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={submitting} className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Submitting application…" : "Submit restaurant application"}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-stone-500">Submitting this form creates a pending application. Restaurant-owner access is granted only after admin approval.</p>
        </form>
      </div>
    </main>
  );
}
