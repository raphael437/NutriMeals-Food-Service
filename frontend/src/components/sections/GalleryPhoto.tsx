import Image from 'next/image';

type GalleryPhotoProps = {
  src?: string;
  caption: string;
  rotate?: number;
  offsetY?: number;
};

export default function GalleryPhoto({ src, caption, rotate = 0, offsetY = 0 }: GalleryPhotoProps) {
  return (
    <figure
      className="w-48 shrink-0 rounded-2xl bg-[#F9F6F0] p-2 text-[#3A0F0F] shadow-xl shadow-black/50 md:w-56"
      style={{ transform: `translateY(${offsetY}px) rotate(${rotate}deg)` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#E5DDD0]">
        {src && (
          <Image
            src={src}
            alt={caption}
            fill
            sizes="(min-width: 768px) 224px, 192px"
            className="object-cover"
          />
        )}
      </div>
      <figcaption className="py-3 text-center font-display text-xl">
        {caption}
      </figcaption>
    </figure>
  );
}