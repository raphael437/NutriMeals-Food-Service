import Image from 'next/image';
import Link from 'next/link';
import Pill from '../ui/Pill';

const RESERVATION_IMAGES = {
  topLeft: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/OIP_3',
  topRight: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/ai-generated-many-people-are-sitting-in-a-restaurant-free-photo',
  bottom: 'https://res.cloudinary.com/uqxq3jbz/image/upload/f_auto,q_auto/alex-haney-CAhjZmVk5H4-unsplash-scaled',
};

export default function Reservation() {
  return (
    <section className="bg-[#3A0F0F] px-6 py-20 md:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          
          {/* Left Column: Text Content */}
          <div className="flex flex-col items-start">
            <Pill>
              Reserve your <b className="ml-1 font-semibold">Table</b>
            </Pill>
            
            <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
              Reserve your spot! ultimate joy of dining done right
            </h2>

            <Link
              href="/reservations"
              className="mt-10 inline-flex h-12 items-center rounded-full bg-[#4A1A1A] px-8 text-xs font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            >
              Reserve your Table
            </Link>
          </div>

          {/* Right Column: Image Collage */}
          <div className="grid grid-cols-2 gap-4">
            {/* Top Left Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              <Image
                src={RESERVATION_IMAGES.topLeft}
                alt="Restaurant interior"
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* Top Right Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              <Image
                src={RESERVATION_IMAGES.topRight}
                alt="Guests enjoying a meal"
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover"
              />
            </div>

            {/* Bottom Image (spans both columns) */}
            <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
              <Image
                src={RESERVATION_IMAGES.bottom}
                alt="Dining experience"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}