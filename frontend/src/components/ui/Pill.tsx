import type { ReactNode } from 'react';

type PillProps = {
  children: ReactNode;
  /** Use on dark backgrounds (like the gallery section) so the border stays visible. */
  onDark?: boolean;
};

// The small outlined label used at the top of each section.
export default function Pill({ children, onDark = false }: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${
        onDark ? 'border-background/40' : 'border-foreground/40'
      }`}
    >
      {children}
    </span>
  );
}
