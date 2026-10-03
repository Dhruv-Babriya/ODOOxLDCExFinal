export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="space-y-2 pb-4 border-b border-zinc-800">
        <div className="h-8 bg-zinc-800 rounded w-64" />
        <div className="h-4 bg-zinc-800/60 rounded w-96" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-3">
            <div className="h-3 bg-zinc-800 rounded w-20" />
            <div className="h-7 bg-zinc-800 rounded w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="h-72 rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-6 space-y-4">
          <div className="h-5 bg-zinc-800 rounded w-44" />
          <div className="h-44 bg-zinc-950/60 rounded-lg" />
        </div>
        <div className="h-72 rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-6 space-y-4">
          <div className="h-5 bg-zinc-800 rounded w-44" />
          <div className="h-44 bg-zinc-950/60 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
