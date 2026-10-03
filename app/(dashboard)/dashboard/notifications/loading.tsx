import { Card } from '@/components/ui/card';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      <div className="pb-4 border-b border-zinc-800 space-y-2">
        <div className="h-7 bg-zinc-800 rounded w-48" />
        <div className="h-4 bg-zinc-800/60 rounded w-80" />
      </div>

      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 bg-zinc-800/50 rounded-lg w-20" />
        ))}
      </div>

      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-1/3" />
                <div className="h-3 bg-zinc-800/60 rounded w-3/4" />
                <div className="h-2.5 bg-zinc-800/40 rounded w-28" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
