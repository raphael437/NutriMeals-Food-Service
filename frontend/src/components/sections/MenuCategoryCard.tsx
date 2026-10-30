import type { ReactNode } from "react";
import { Leaf } from "lucide-react";

type MenuCategoryCardProps = {
  name: string;
  tagline: string;
  items: string[];
  icon?: ReactNode;
  highlighted?: boolean;
};

export default function MenuCategoryCard({
  name,
  tagline,
  items,
  icon,
  highlighted = false,
}: MenuCategoryCardProps) {
  const dividerClass = highlighted
    ? "border-white/15"
    : "border-[#e2e9df]";

  return (
    <article
      className={`flex h-full min-h-[300px] flex-col justify-between rounded-2xl border p-5 sm:p-6 ${
        highlighted
          ? "border-[#173d2b] bg-[#173d2b] text-white"
          : "border-[#e2e9df] bg-white text-[#183b2b]"
      }`}
    >
      <div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            highlighted
              ? "bg-white/10 text-emerald-200"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {icon ?? <Leaf className="h-6 w-6" />}
        </div>

        <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight">
          {name}
        </h3>

        <p
          className={`mt-2 text-sm leading-6 ${
            highlighted ? "text-white/70" : "text-[#617267]"
          }`}
        >
          {tagline}
        </p>
      </div>

      {items.length > 0 && (
        <ol className="mt-8 text-sm">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className={`border-t py-3 ${dividerClass}`}
            >
              <span
                className={`mr-2 text-xs ${
                  highlighted ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              {item}
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}