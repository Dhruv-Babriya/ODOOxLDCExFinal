import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Star, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const TIERS = [
  {
    name: 'Gold Membership',
    tier: 'GOLD',
    price: 25000,
    period: 'year',
    badge: 'Popular & Best Value',
    description: 'All-inclusive premium athletic access for passionate sports enthusiasts.',
    features: [
      '1 Free Court Hour every day',
      '50% Discount on additional court bookings',
      '15% Discount on all Pro Shop equipment & apparel',
      '15% Discount at Bar & Nutrition Cafeteria',
      'Maximum 2 bookings per day',
      'Priority booking access 14 days in advance',
      'Friday Social Play access included',
    ],
    highlight: true,
  },
  {
    name: 'Silver Membership',
    tier: 'SILVER',
    price: 15000,
    period: 'year',
    badge: 'Standard Access',
    description: 'Perfect for regular weekend and evening players.',
    features: [
      '25% Discount on all court bookings',
      '10% Discount on Pro Shop gear',
      '10% Discount at Cafeteria',
      'Maximum 2 bookings per day',
      '7 days advance booking window',
      'Access to Friday Social Play sessions',
    ],
    highlight: false,
  },
  {
    name: 'Junior Membership',
    tier: 'JUNIOR',
    price: 8000,
    period: 'year',
    badge: 'Under-18 Athletes',
    description: 'Special program designed for youth development and training.',
    features: [
      '30% Discount on court hours during youth slots',
      '10% Discount on rackets, shoes & apparel',
      '5% Discount on healthy drinks & snacks',
      'Priority registration for coaching clinics',
      'Maximum 2 bookings per day',
    ],
    highlight: false,
  },
];

export default function MembershipsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
          Transparent Membership Tiers
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Choose Your Club Membership</h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          Members enjoy privileged court pricing, daily free access options, and discounts on gear and dining.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={`flex flex-col justify-between border transition-all ${
              tier.highlight
                ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-950/30 to-zinc-900/80 shadow-lg shadow-emerald-950/50'
                : 'border-zinc-800 bg-zinc-900/40'
            }`}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={tier.tier === 'GOLD' ? 'gold' : tier.tier === 'SILVER' ? 'silver' : 'outline'}>
                  {tier.badge}
                </Badge>
                {tier.highlight && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
              </div>
              <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
              <CardDescription className="text-xs text-zinc-400">{tier.description}</CardDescription>
              <div className="pt-2">
                <span className="text-3xl font-extrabold text-white">{formatCurrency(tier.price)}</span>
                <span className="text-xs text-zinc-400 ml-1.5">/ {tier.period}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 flex-1">
              <div className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">Plan Privileges</div>
              <ul className="space-y-2">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4 border-t border-zinc-800/80">
              <Link href={`/trial?tier=${tier.tier}`} className="w-full">
                <Button variant={tier.highlight ? 'primary' : 'outline'} className="w-full gap-2">
                  <span>Inquire or Request Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
