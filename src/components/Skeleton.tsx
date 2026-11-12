/** Shimmering placeholder blocks — perceived-performance polish. */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-ink/5 ${className}`} />;
}

export function SkeletonMatchRow() {
  return (
    <div className="card flex items-center gap-4 p-4">
      <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonMatchList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonMatchRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonDeck() {
  return (
    <div className="relative mt-5 h-[520px]">
      <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-[#101d28] shadow-card">
        <Skeleton className="h-[62%] w-full rounded-b-none rounded-t-[2rem]" />
        <div className="space-y-3 p-5">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3.5 w-2/3" />
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
