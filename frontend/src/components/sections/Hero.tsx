import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="overflow-hidden bg-[#f7f8f4] px-4 pb-14 pt-12 text-[#183b2b] sm:px-6 sm:pb-20 sm:pt-16 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dce5da] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
            <Sparkles className="h-4 w-4" />
            Food that fits your day
          </div>

          <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Real food.
            <span className="block text-emerald-700">
              Smarter choices.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-[#617267] sm:text-lg">
            Discover restaurants, explore delicious meals, and make more
            informed food choices with nutrition information to help guide
            your day.
          </p>

          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/restaurants"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              Explore restaurants
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/gallery"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce5da] bg-white px-6 py-3.5 text-sm font-semibold text-[#183b2b] transition hover:bg-[#eef3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              Get inspired
            </Link>
          </div>
        </div>

        {/* Featured image */}
        <div className="relative mt-12 h-[320px] overflow-hidden rounded-3xl bg-[#e5ebe1] shadow-xl shadow-emerald-950/10 sm:mt-16 sm:h-[440px] lg:h-[560px]">
          <Image
            src="https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/pexels-yasser-mohamed-2830427-4378160"
            alt="A welcoming dining experience from a restaurant"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#10291d]/75 via-[#10291d]/10 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8 lg:p-10">
            <div className="max-w-xl text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                <Leaf className="h-4 w-4 text-emerald-300" />
                Your food journey starts here
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-4xl">
                Find meals worth looking forward to.
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/80 sm:text-base">
                Browse available menus and check meal details before you order.
              </p>
            </div>

            <Link
              href="/restaurants"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#173d2b] transition hover:bg-emerald-50 sm:self-auto"
            >
              Find your next meal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Value propositions */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              number: "01",
              title: "Discover",
              description: "Explore participating restaurants and menus.",
            },
            {
              number: "02",
              title: "Choose",
              description: "Review available nutrition information.",
            },
            {
              number: "03",
              title: "Enjoy",
              description: "Order your meals for delivery.",
            },
          ].map((item) => (
            <div
              key={item.number}
              className="rounded-2xl border border-[#e2e9df] bg-white p-5 sm:p-6"
            >
              <p className="text-xs font-bold tracking-[0.16em] text-emerald-700">
                {item.number}
              </p>

              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>

              <p className="mt-2 text-sm leading-6 text-[#617267]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}