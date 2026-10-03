import Link from 'next/link';
import { Trophy } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-base font-bold text-white tracking-tight block">THE CHAMPIONS CLUB</span>
              <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider block -mt-1">PORTAL AUTHENTICATION</span>
            </div>
          </Link>
        </div>

        {children}

        <div className="text-center text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-200">← Back to Champions Club Homepage</Link>
        </div>
      </div>
    </div>
  );
}
