import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CalendarDays, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const COURTS = [
  {
    name: 'Tennis Court 1 (Clay)',
    sport: 'TENNIS',
    surface: 'French Red Clay',
    rate: 600,
    indoor: false,
    lighting: 'LED Tournament Floodlights',
  },
  {
    name: 'Tennis Court 2 (Hard Court)',
    sport: 'TENNIS',
    surface: 'Plexipave Acrylic Cushion',
    rate: 600,
    indoor: false,
    lighting: 'LED Tournament Floodlights',
  },
  {
    name: 'Center Indoor Tennis Arena',
    sport: 'TENNIS',
    surface: 'Climate-controlled Indoor Turf',
    rate: 1000,
    indoor: true,
    lighting: 'Diffused Anti-Glare Arena Lights',
  },
  {
    name: 'Cricket Pitch A (Main Oval)',
    sport: 'CRICKET',
    surface: 'Curated Natural Turf Pitch',
    rate: 1400,
    indoor: false,
    lighting: 'Boundary Floodlights',
  },
  {
    name: 'Cricket Net 1 (Bowling Machine)',
    sport: 'CRICKET',
    surface: 'Synthetic AstroTurf with Netting',
    rate: 500,
    indoor: true,
    lighting: 'Full Enclosure Lighting',
  },
];

export default function CourtsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
          Court Facilities & Schedule Rules
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Courts & Session Availability</h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          One-hour sessions available daily with staggered start times every 30 minutes.
        </p>
      </div>

      {/* Booking Rules Reminder Banner */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          <span>Club Court Booking Rules</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-400">
          <div className="flex items-start gap-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-200 font-medium block">60-Minute Sessions:</span>
              Slots start every 30 minutes (e.g. 06:00, 06:30, 07:00).
            </div>
          </div>
          <div className="flex items-start gap-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-200 font-medium block">Daily Limit:</span>
              Members can book a maximum of 2 court sessions per day.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-200 font-medium block">Friday Social Play:</span>
              Shared court mixers every Friday 6 PM - 9 PM.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COURTS.map((court) => (
          <Card key={court.name} className="border-zinc-800 bg-zinc-900/40 flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant={court.sport === 'TENNIS' ? 'default' : 'warning'}>
                  {court.sport}
                </Badge>
                {court.indoor && <Badge variant="outline">Indoor Arena</Badge>}
              </div>
              <CardTitle className="text-lg text-white mt-2">{court.name}</CardTitle>
              <CardDescription className="text-xs text-zinc-400">{court.surface}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 text-xs text-zinc-400">
              <div className="flex justify-between py-1 border-b border-zinc-800">
                <span>Standard Rate:</span>
                <span className="font-semibold text-white">{formatCurrency(court.rate)} / hr</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800">
                <span>Gold Member Rate:</span>
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(court.rate * 0.5)} / hr (or Free)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800">
                <span>Lighting:</span>
                <span className="text-zinc-300">{court.lighting}</span>
              </div>
            </CardContent>

            <div className="p-6 pt-0">
              <Link href="/dashboard/bookings" className="w-full">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Reserve on Portal</span>
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
