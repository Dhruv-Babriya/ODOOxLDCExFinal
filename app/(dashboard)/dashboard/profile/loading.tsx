import { Card } from '@/components/ui/card';

export default function ProfileLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
      <div className="space-y-2">
        <div className="h-7 bg-zinc-800 rounded w-64" />
        <div className="h-4 bg-zinc-800/60 rounded w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/40 p-6 text-center space-y-4">
          <div className="mx-auto h-20 w-20 rounded-full bg-zinc-800" />
          <div className="h-5 bg-zinc-800 rounded w-36 mx-auto" />
          <div className="h-3 bg-zinc-800/60 rounded w-48 mx-auto" />
          <div className="pt-4 border-t border-zinc-800/80 space-y-2">
            <div className="h-4 bg-zinc-800/40 rounded w-full" />
            <div className="h-4 bg-zinc-800/40 rounded w-full" />
          </div>
        </Card>

        <Card className="md:col-span-2 border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="h-5 bg-zinc-800 rounded w-48" />
          <div className="h-3 bg-zinc-800/60 rounded w-72" />
          <div className="space-y-3 pt-2">
            <div className="h-10 bg-zinc-950/60 rounded-lg" />
            <div className="h-10 bg-zinc-950/60 rounded-lg" />
            <div className="h-10 bg-zinc-950/60 rounded-lg" />
          </div>
        </Card>
      </div>
    </div>
  );
}
