"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Clock3,
  Mail,
  MessageCircle,
  Salad,
  Send,
  UtensilsCrossed,
} from "lucide-react";

type ContactForm = {
  name: string;
  email: string;
  topic: string;
  message: string;
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    topic: "Order and delivery",
    message: "",
  });

  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setStatus("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!supportEmail) {
      setError(
        "Support email is not configured yet. Add NEXT_PUBLIC_SUPPORT_EMAIL to your frontend environment variables."
      );
      return;
    }

    const subject = encodeURIComponent(
      `[NutriMeals Support] ${form.topic}`
    );

    const body = encodeURIComponent(
      `Name: ${form.name}\n` +
        `Email: ${form.email}\n` +
        `Topic: ${form.topic}\n\n` +
        `Message:\n${form.message}`
    );

    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    setStatus(
      "Your email application should open with your message ready to send."
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#183b2b]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#173d2b] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-emerald-100 transition hover:text-white"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to home
          </Link>

          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100">
              <MessageCircle className="h-4 w-4" />
              We are here to help
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Let&apos;s make your
              <span className="block text-emerald-300">
                healthy food journey easier.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-emerald-50/80 sm:text-lg">
              Questions about your meals, nutrition information, or delivery?
              Send us a message and tell us how we can help.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-medium text-[#173d2b] transition hover:bg-emerald-50"
            >
              Explore restaurants
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#contact-form"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 font-medium text-white transition hover:bg-white/10"
            >
              Contact our team
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Contact options */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            How can we help?
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find the right kind of support.
          </h2>

          <p className="mt-4 leading-7 text-[#617267]">
            Choose the topic that best describes your question, or send us a
            message using the form below.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-[#e2e9df] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <UtensilsCrossed className="h-5 w-5" />
            </div>

            <h3 className="text-lg font-semibold">Orders & delivery</h3>

            <p className="mt-3 text-sm leading-6 text-[#617267]">
              Have a question about an order, a delivery address, or your meal
              selection?
            </p>

            <Link
              href="/orders"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
            >
              View your orders
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-2xl border border-[#e2e9df] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Salad className="h-5 w-5" />
            </div>

            <h3 className="text-lg font-semibold">Meals & nutrition</h3>

            <p className="mt-3 text-sm leading-6 text-[#617267]">
              Looking for meals that fit your calorie goals or want to learn
              more about nutritional information?
            </p>

            <Link
              href="/restaurants"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
            >
              Browse meals
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-2xl border border-[#e2e9df] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
              <Mail className="h-5 w-5" />
            </div>

            <h3 className="text-lg font-semibold">Restaurant partners</h3>

            <p className="mt-3 text-sm leading-6 text-[#617267]">
              Interested in listing your restaurant, managing your menu, or
              joining the NutriMeals marketplace?
            </p>

            <a
              href="#contact-form"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600"
            >
              Contact our team
              <ArrowRight className="h-4 w-4" />
            </a>
          </article>
        </div>
      </section>

      {/* Contact form */}
      <section
        id="contact-form"
        className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:pb-24"
      >
        <div className="flex flex-col justify-between rounded-3xl bg-[#e8efe5] p-7 sm:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
              Get in touch
            </p>

            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              We&apos;d love to hear from you.
            </h2>

            <p className="mt-5 leading-7 text-[#617267]">
              Give us a little detail about your question so you can get help
              with the right topic.
            </p>
          </div>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800">
                <Mail className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold">Email support</h3>
                <p className="mt-1 text-sm leading-6 text-[#617267]">
                  {supportEmail || "Configure your support email to get started."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800">
                <Clock3 className="h-5 w-5" />
              </div>

              <div>
                <h3 className="font-semibold">Helpful details</h3>
                <p className="mt-1 text-sm leading-6 text-[#617267]">
                  Include your order number when contacting us about an existing
                  order. Please do not include passwords or payment details.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e2e9df] bg-white p-6 shadow-sm shadow-emerald-950/5 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Send us a message
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#617267]">
            Fill in the details below and your default email application will
            prepare a message for you.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
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
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
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
                  required
                  maxLength={254}
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="topic"
                className="mb-2 block text-sm font-medium"
              >
                What do you need help with?
              </label>

              <select
                id="topic"
                name="topic"
                value={form.topic}
                onChange={handleChange}
                className="w-full rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              >
                <option>Order and delivery</option>
                <option>Meals and nutrition</option>
                <option>Payment question</option>
                <option>Restaurant partnership</option>
                <option>Account and technical support</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-medium"
              >
                Your message
              </label>

              <textarea
                id="message"
                name="message"
                required
                minLength={10}
                maxLength={3000}
                rows={6}
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us how we can help..."
                className="w-full resize-y rounded-xl border border-[#dce5da] bg-[#fbfcfa] px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
              />

              <p className="mt-2 text-right text-xs text-[#809087]">
                {form.message.length}/3000 characters
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {error}
              </p>
            )}

            {status && (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
              >
                {status}
              </p>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 sm:w-auto"
            >
              Prepare email
              <Send className="h-4 w-4" />
            </button>

            <p className="text-xs leading-5 text-[#809087]">
              This form prepares an email; it does not send messages to a
              backend or store them in a database.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}