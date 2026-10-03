import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, CalendarDays, ShoppingBag, ArrowRight, Activity, Coffee } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-zinc-800/80 bg-gradient-to-b from-zinc-950 via-zinc-900/60 to-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-300 mb-6">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            The Premier Sports Club & Athletic Community
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Elevate Your Game at <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              The Champions Club
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Championship-grade clay and hard tennis courts, professional cricket oval & practice nets, premier gear shop, and an athletic nutrition cafe.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/memberships"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-all hover:scale-[1.02]"
            >
              <span>Explore Memberships</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/courts"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/80 px-6 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              <span>Court Availability</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-6 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-950/40 transition-all"
            >
              <Trophy className="h-4 w-4 text-emerald-400" />
              <span>Staff & Member Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Club Pillars */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">World-Class Athletic Facilities</h2>
          <p className="text-sm text-zinc-400 mt-2">Engineered for competitive players and club enthusiasts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Tennis & Cricket Courts</h3>
              <p className="text-sm text-zinc-400">
                Tournament clay courts, cushioned hard courts, and full-length cricket practice nets with bowling machine support.
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Champions Pro Shop</h3>
              <p className="text-sm text-zinc-400">
                Performance rackets, match balls, court shoes, apparel, and club accessories available for both in-person and online ordering.
              </p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Coffee className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Lounge & Nutrition Cafe</h3>
              <p className="text-sm text-zinc-400">
                Protein smoothies, post-workout meals, artisan coffee, and evening drinks with dedicated table ordering and member tabs.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Phase 0 Architecture Status */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Phase 0 Complete</Badge>
                <h3 className="text-lg font-bold text-white">Four-Developer Team Architecture Established</h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Database schema, PostgreSQL exclusion constraints, RBAC, Supabase RLS, and shared contracts ready for parallel Phase 1 development.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              <span>Explore Dashboard Scaffolds</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Developer 1</span>
                <span className="text-[10px] text-emerald-400 font-mono">CORE & MEMBER</span>
              </div>
              <p className="text-xs text-zinc-400">Auth, RBAC, Profiles, Memberships, Expiry & History</p>
              <div className="text-[11px] text-zinc-500 font-mono">public.members, plans</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Developer 2</span>
                <span className="text-[10px] text-sky-400 font-mono">COURTS & BOOKING</span>
              </div>
              <p className="text-xs text-zinc-400">Courts, GIST Exclusion, Concurrency, Pricing & Social Play</p>
              <div className="text-[11px] text-zinc-500 font-mono">public.court_bookings</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Developer 3</span>
                <span className="text-[10px] text-amber-400 font-mono">SHOP & BAR</span>
              </div>
              <p className="text-xs text-zinc-400">Unified Inventory, Counter/Online Sales, Tables & Kitchen</p>
              <div className="text-[11px] text-zinc-500 font-mono">public.inventory, orders</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Developer 4</span>
                <span className="text-[10px] text-purple-400 font-mono">FINANCE & STAFF</span>
              </div>
              <p className="text-xs text-zinc-400">Payments, Invoices, Staff Shifts, Quotes & Owner Reports</p>
              <div className="text-[11px] text-zinc-500 font-mono">public.payments, invoices</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
