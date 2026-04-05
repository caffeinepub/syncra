import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: Props) {
  const widths = Array.from({ length: lines }, (_, i) =>
    i === lines - 1 ? "w-1/2" : "w-full",
  );
  return (
    <div className={cn("glass-card rounded-xl p-4 space-y-3", className)}>
      <div className="skeleton h-4 w-2/3 rounded" />
      {widths.map((w, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, no reordering
        <div key={i} className={`skeleton h-3 rounded ${w}`} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((i) => (
        <div key={i} className="glass-card rounded-2xl overflow-hidden">
          <div className="skeleton aspect-[4/3] w-full" />
          <div className="p-3 space-y-2">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 glass-card rounded-xl">
      <div className="skeleton h-9 w-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
  );
}
