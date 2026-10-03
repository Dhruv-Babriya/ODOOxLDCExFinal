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

      {/* Membership & Club Privileges */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-8 md:p-12 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Exclusive Privileges</Badge>
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Champions Club Membership Experience
                </h3>
              </div>
              <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                Unlock daily free court hours, preferential tournament bookings, and exclusive discounts across the Pro Shop and Nutrition Cafe.
              </p>
            </div>
            <Link
              href="/memberships"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 transition-all self-start md:self-auto"
            >
              <span>View All Tiers & Pricing</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Court Privileges</span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold uppercase">Daily Booking</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Complimentary court hours, advance reservation window, and floodlit evening session priority.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 hover:border-sky-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Pro Shop Savings</span>
                <span className="text-[10px] text-sky-400 font-mono font-semibold uppercase">Discounts</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Direct member discounts on performance gear, racket stringing, and club merchandise.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 hover:border-amber-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Cafe & Member Tab</span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold uppercase">Hospitality</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Seamless digital member tabs, table service, and nutrition dining discounts post-training.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 hover:border-purple-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Digital Portal</span>
                <span className="text-[10px] text-purple-400 font-mono font-semibold uppercase">Account</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Real-time booking management, consolidated monthly invoicing, and match history tracking.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
