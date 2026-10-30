
import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

type FooterGroup = {
  title: string;
  links: FooterLink[];
};

const footerGroups: FooterGroup[] = [
  {
    title: "Explore",
    links: [
      { label: "Browse restaurants", href: "/restaurants" },
      { label: "Food gallery", href: "/gallery" },
      { label: "My orders", href: "/orders" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    title: "Restaurant partners",
    links: [
      {
        label: "Become a partner",
        href: "/become-a-partner",
      },
      {
        label: "Restaurant dashboard",
        href: "/dashboard",
      },
      {
        label: "Restaurant settings",
        href: "/settings",
      },
      { label: "Get in touch", href: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-emerald-950/10 bg-[#12372d] text-[#f8f6ef]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-14">
          {/* Brand */}
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-sm text-2xl font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              aria-label="NutriMeals home"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7e7b3] text-sm font-black text-[#12372d]">
                N
              </span>

              <span>NutriMeals</span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
              Discover great local food, order your favourites, and have every
              meal delivered with care.
            </p>

            <Link
              href="/restaurants"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d7e7b3] px-5 py-3 text-sm font-semibold text-[#12372d] transition hover:bg-[#e4efcc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#12372d]"
            >
              Explore restaurants
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Footer link groups */}
          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d7e7b3]">
                {group.title}
              </h2>

              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Copyright */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} NutriMeals. All rights reserved.
          </p>

          <p>Good food. Local favourites. Delivered with care.</p>
        </div>
      </div>
    </footer>
  );
}
