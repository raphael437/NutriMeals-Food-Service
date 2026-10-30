import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Leaf,
  Salad,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

const galleryItems = [
  {
    title: "Fresh & Green",
    category: "Fresh choices",
    description: "Colorful greens and fresh ingredients.",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=85",
    size: "large",
  },
  {
    title: "Balanced Bowls",
    category: "Everyday nutrition",
    description: "A colorful balance of protein, grains, and vegetables.",
    image:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=85",
    size: "normal",
  },
  {
    title: "Mediterranean Table",
    category: "Mediterranean",
    description: "Simple ingredients inspired by Mediterranean cooking.",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85",
    size: "normal",
  },
  {
    title: "Made With Freshness",
    category: "Fresh ingredients",
    description: "Start with good ingredients and build from there.",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=85",
    size: "normal",
  },
  {
    title: "Color on Your Plate",
    category: "Meal inspiration",
    description: "Bring variety and color into your daily meals.",
    image:
      "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1000&q=85",
    size: "large",
  },
  {
    title: "The Art of Eating Well",
    category: "Mindful eating",
    description: "Make room for food that looks as good as it tastes.",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=85",
    size: "normal",
  },
  {
    title: "Everyday Nourishment",
    category: "Daily meals",
    description: "Inspiration for a more varied everyday menu.",
    image:
      "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=900&q=85",
    size: "normal",
  },
];

export default function GalleryPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#183b2b]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#173d2b] text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-12 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100">
              <Sparkles className="h-4 w-4" />
              The NutriMeals Gallery
            </div>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Good food.
              <span className="block text-emerald-300">
                Beautifully balanced.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-emerald-50/80 sm:text-lg">
              Discover colorful plates, fresh ingredients, and meal ideas that
              inspire you to make thoughtful choices about what you eat.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-[#173d2b] transition hover:bg-emerald-50"
              >
                Explore our restaurants
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#food-gallery"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 font-medium text-white transition hover:bg-white/10"
              >
                Explore gallery
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 flex items-center gap-3 text-sm text-emerald-100/80">
              <Leaf className="h-5 w-5 text-emerald-300" />
              <span>
                Fresh inspiration for your everyday food choices
              </span>
            </div>
          </div>

          {/* Featured image */}
          <div className="relative">
            <div
              role="img"
              aria-label="A colorful, fresh meal"
              className="h-[360px] overflow-hidden rounded-[2rem] bg-cover bg-center shadow-2xl shadow-black/20 sm:h-[440px]"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1400&q=90')",
              }}
            >
              <div className="flex h-full items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6 sm:p-8">
                <div>
                  <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                    FOOD INSPIRATION
                  </span>

                  <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                    A little more color.
                    <br />
                    A little more balance.
                  </h2>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-2 flex items-center gap-3 rounded-2xl border border-[#e2e9df] bg-white p-4 shadow-lg sm:-left-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <Salad className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-semibold">Explore your choices</p>
                <p className="mt-1 text-xs text-[#617267]">
                  Find meals that fit your goals
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section
        id="food-gallery"
        className="mx-auto max-w-7xl scroll-mt-8 px-5 py-16 sm:px-8 lg:px-12 lg:py-24"
      >
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              A feast for the eyes
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Explore the food gallery.
            </h2>

            <p className="mt-4 max-w-xl leading-7 text-[#617267]">
              From fresh salads to colorful bowls, explore a collection of
              images for your next meal idea.
            </p>
          </div>

          <Link
            href="/restaurants"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-[#dce5da] bg-white px-4 py-3 text-sm font-semibold transition hover:border-emerald-700 hover:text-emerald-800 sm:self-auto"
          >
            Find meals
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map((item, index) => (
            <article
              key={item.title}
              className={`group relative isolate overflow-hidden rounded-3xl bg-[#e5ebe1] ${
                item.size === "large"
                  ? "min-h-[380px] sm:col-span-2 lg:col-span-2 lg:min-h-[460px]"
                  : "min-h-[380px] lg:min-h-[460px]"
              }`}
            >
              <div
                role="img"
                aria-label={item.title}
                className="absolute inset-0 -z-20 bg-cover bg-center transition duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${item.image}')` }}
              />

              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/10 to-black/5 transition group-hover:from-black/85" />

              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-5 sm:p-6">
                <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  {item.category}
                </span>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-sm transition group-hover:bg-white group-hover:text-[#183b2b]">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(galleryItems.length).padStart(2, "0")}
                </p>

                <h3 className="text-2xl font-semibold text-white sm:text-3xl">
                  {item.title}
                </h3>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
                  {item.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-xs leading-5 text-[#809087]">
          These images are for inspiration and may not represent meals currently
          offered by a restaurant on NutriMeals. Check individual restaurant
          menus for available dishes and their nutrition details.
        </p>
      </section>

      {/* Call to action */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-[#e8efe5] p-7 sm:p-10 lg:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-200/50 blur-2xl"
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <UtensilsCrossed className="h-4 w-4" />
                Your next meal starts here
              </div>

              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Inspired by the gallery?
                <span className="block">Find something delicious.</span>
              </h2>

              <p className="mt-4 max-w-xl leading-7 text-[#617267]">
                Explore participating restaurants, discover their menus, and
                review available meal nutrition information before ordering.
              </p>
            </div>

            <Link
              href="/restaurants"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173d2b] px-6 py-4 font-semibold text-white transition hover:bg-emerald-900"
            >
              Browse restaurants
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}