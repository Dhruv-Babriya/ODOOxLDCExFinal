import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export default async function MembershipPlansDashboardPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from('membership_plans')
    .select('*')
    .order('price', { ascending: false });

  return (
    <DashboardModuleShell
      title="Membership Plans Configuration"
      subtitle="Pricing structures, tier discounts across court bookings, pro shop, and cafeteria."
      developerOwner="Developer 1"
      developerRole="Core Platform & Membership Specialist"
      tables={['membership_plans', 'members']}
      contracts={['MembershipPlan', 'MembershipTier', 'membershipPlanSchema']}
      phase1Roadmap={[
        'Interactive plan creation and tier editing modal',
        'Discount rules configuration engine (court %, shop %, bar %, free hours/day)',
        'Active member count aggregate per plan tier',
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <Card key={plan.id} className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <Badge variant={plan.tier === 'GOLD' ? 'gold' : plan.tier === 'SILVER' ? 'silver' : 'outline'}>
                  {plan.tier}
                </Badge>
                <Badge variant={plan.is_active ? 'success' : 'outline'} className="text-[10px]">
                  {plan.is_active ? 'Active' : 'Archived'}
                </Badge>
              </div>
              <CardTitle className="text-lg text-white mt-2">{plan.name}</CardTitle>
              <div className="text-xl font-bold text-white pt-1">
                {formatCurrency(plan.price)}
                <span className="text-xs text-zinc-400 font-normal ml-1">/ {plan.duration_days} days</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
              <div className="flex justify-between">
                <span>Court Discount:</span>
                <span className="font-semibold text-emerald-400">{plan.court_discount_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Free Daily Hours:</span>
                <span className="font-semibold text-white">{plan.free_court_hours_per_day} hr / day</span>
              </div>
              <div className="flex justify-between">
                <span>Max Daily Bookings:</span>
                <span className="font-semibold text-white">{plan.max_daily_bookings}</span>
              </div>
              <div className="flex justify-between">
                <span>Shop Discount:</span>
                <span className="font-semibold text-white">{plan.shop_discount_percent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Bar Discount:</span>
                <span className="font-semibold text-white">{plan.bar_discount_percent}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardModuleShell>
  );
}
