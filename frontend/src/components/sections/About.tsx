import Image from 'next/image';
import Link from 'next/link';
import Pill from '../ui/Pill';

type AboutProps = {
  image?: string;
  imageAlt?: string;
};

const AVATARS = [
  {
    src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/OIP_2',
    alt: 'Customer avatar 1',
  },
  {
    src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/short_beard_480x480',
    alt: 'Customer avatar 2',
  },
  {
    src: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/grimmer_orig',
    alt: 'Customer avatar 3',
  },
];

const DEFAULT_IMAGE =
  'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/people-group-eating-fast-food-burgers-sitting-wooden-table-cafe-friends-meeting-communication-77588147';

export default function About({
  image = DEFAULT_IMAGE,
  imageAlt = 'Guests enjoying a meal at the restaurant',
}: AboutProps) {
  return (
    <section className="px-6 py-20 md:px-16">
      <div className="mx-auto max-w-6xl">
        {/* Top row: badge on the left, small tagline on the right */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <Pill>
            Know <b className="ml-1 font-semibold">About Us</b>
          </Pill>
          <p className="text-sm sm:max-w-xs sm:text-right">
            Experience the perfect <b className="font-semibold">harmony</b> of heritage
          </p>
        </div>

        {/* Main row: heading + CTA on the left, image on the right */}
        <div className="mt-10 grid items-end gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Blending tradition &amp; innovation to create unforgettable dining experiences
            </h2>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-6">
              <Link
                href="/about"
                className="inline-flex h-10 items-center rounded-full bg-primary px-6 text-xs font-medium uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
              >
                Read our story
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {AVATARS.map((a) => (
                    <span
                      key={a.src}
                      className="relative size-10 overflow-hidden rounded-full border-2 border-background"
                    >
                      <Image
                        src={a.src}
                        alt={a.alt}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </span>
                  ))}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Satisfied Customers</p>
                  <p className="text-xs text-muted-foreground">
                    Thousands of reviews from customers
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative aspect-[4/3.5] overflow-hidden rounded-2xl bg-muted">
            {image && (
              <Image
                src={image}
                alt={imageAlt}
                fill
                sizes="(min-width: 1024px) 320px, 100vw"
                className="object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}