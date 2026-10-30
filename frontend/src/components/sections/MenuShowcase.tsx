import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import type { ReactNode } from "react";
import MenuCategoryCard from "./MenuCategoryCard";

export type Category = {
  name: string;
  tagline: string;
  items: string[];
  icon?: ReactNode;
};

type MenuShowcaseProps = {
  categories: Category[];
  header: ReactNode;
};

export default function MenuShowcase({
  categories,
  header,
}: MenuShowcaseProps) {
  const [first, ...rest] = categories;

  if (!first) return null;

  return (
    <section
      id="menu-showcase"
      className="bg-[#f7f8f4] px-4 py-14 text-[#183b2b] sm:px-6 sm:py-20 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)] lg:gap-12">
          {/* Featured category */}
          <div className="flex min-w-0 flex-col gap-6">
            <MenuCategoryCard {...first} />

            <div className="flex items-start gap-3 text-sm leading-6 text-[#617267]">
              <Leaf className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <p>
                Explore meal ideas and discover restaurants offering dishes
                that suit your preferences.
              </p>
            </div>

            <Link
              href="/restaurants"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#173d2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900"
            >
              Browse restaurants
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Other categories */}
          <div className="min-w-0">
            {header}

            {rest.length > 0 ? (
              <div className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
                {rest.map((category, index) => (
                  <div
                    key={category.name}
                    className="min-w-0 shrink-0 basis-[85%] snap-start sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]"
                  >
                    <MenuCategoryCard
                      {...category}
                      highlighted={index === 1}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-[#e2e9df] bg-white p-6 text-sm leading-6 text-[#617267]">
                More categories will appear here as you add them.
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs leading-5 text-[#809087]">
                Meal availability and nutrition details depend on each
                restaurant&apos;s menu.
              </p>

              <div className="flex shrink-0 gap-2">
                <Link
                  href="/restaurants"
                  aria-label="Explore restaurants"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dce5da] bg-white text-[#173d2b] transition hover:bg-[#eef3e9]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>

                <Link
                  href="/restaurants"
                  aria-label="See restaurants"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#173d2b] text-white transition hover:bg-emerald-900"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}