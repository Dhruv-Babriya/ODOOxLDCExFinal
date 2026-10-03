import { Card, CardContent } from '@/components/ui/card';
import { Shield, HeartHandshake, Award } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">About The Champions Club</h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          Founded to unite tennis players, cricketers, and sports enthusiasts in a premier sporting environment with world-class courts and hospitality.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6 space-y-2">
            <Award className="h-6 w-6 text-emerald-400" />
            <h3 className="font-semibold text-white">Championship Heritage</h3>
            <p className="text-xs text-zinc-400">
              Built to international tournament standards with high-rebound acrylic surfaces, French clay tennis courts, and full-spec cricket pitches.
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6 space-y-2">
            <HeartHandshake className="h-6 w-6 text-emerald-400" />
            <h3 className="font-semibold text-white">Social Play & Community</h3>
            <p className="text-xs text-zinc-400">
              Weekly Friday Social Play brings members together for doubles mixers, friendly matches, and post-game cafeteria networking.
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6 space-y-2">
            <Shield className="h-6 w-6 text-emerald-400" />
            <h3 className="font-semibold text-white">Holistic Athlete Wellness</h3>
            <p className="text-xs text-zinc-400">
              Certified coaching staff, equipment stringing services, footwear fitting, and nutritional recovery smoothies on demand.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
