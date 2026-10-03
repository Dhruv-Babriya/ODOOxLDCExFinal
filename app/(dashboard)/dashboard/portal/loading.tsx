import { Card } from '@/components/ui/card';

export default function MemberPortalLoading() {
  return (
    <div className="space-y-6 max-w-6xl animate-pulse">
      {/* Banner Skeleton */}
      <Card className="border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800 shrink-0" />
            <div className="space-y-2.5">
              <div className="h-7 bg-zinc-800 rounded w-56" />
              <div className="h-4 bg-zinc-800/60 rounded w-72" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-zinc-800 rounded-lg" />
            <div className="h-9 w-28 bg-zinc-800 rounded-lg" />
          </div>
        </div>
      </Card>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-zinc-800 bg-zinc-900/40 p-4">
            <div className="space-y-2">
              <div className="h-3 bg-zinc-800/70 rounded w-20" />
              <div className="h-6 bg-zinc-800 rounded w-28" />
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-3 border-b border-zinc-800 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 bg-zinc-800/40 rounded-lg w-28" />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/40 p-6 h-64">
          <div className="space-y-3">
            <div className="h-5 bg-zinc-800 rounded w-40" />
            <div className="h-4 bg-zinc-800/50 rounded w-60" />
            <div className="h-28 bg-zinc-950/60 rounded-xl mt-4" />
          </div>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/40 p-6 h-64">
          <div className="space-y-3">
            <div className="h-5 bg-zinc-800 rounded w-40" />
            <div className="h-4 bg-zinc-800/50 rounded w-60" />
            <div className="h-28 bg-zinc-950/60 rounded-xl mt-4" />
          </div>
        </Card>
      </div>
    </div>
  );
}
