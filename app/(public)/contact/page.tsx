import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Contact Club Front Desk</h1>
        <p className="text-sm text-zinc-400">
          Have an enquiry about court availability, tournament registration, or private coaching? We are here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6 space-y-4 text-xs">
            <h3 className="text-base font-semibold text-white">Direct Contacts</h3>
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-200 font-medium block">Front Desk & Reservations</span>
                <span className="text-zinc-400">+91 98765 43210</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-200 font-medium block">Email Concierge</span>
                <span className="text-zinc-400">concierge@thechampionsclub.com</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-zinc-200 font-medium block">Club Location</span>
                <span className="text-zinc-400">Plot 42, Champions Boulevard, Sports Enclave, Metropolis</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="p-6 space-y-4 text-xs">
            <h3 className="text-base font-semibold text-white">Reception & Facility Hours</h3>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>
                  <span className="text-zinc-200 font-medium block">Courts & Turf:</span>
                  <span className="text-zinc-400">06:00 AM - 10:00 PM Daily</span>
                </div>
                <div>
                  <span className="text-zinc-200 font-medium block">Pro Shop:</span>
                  <span className="text-zinc-400">08:00 AM - 08:30 PM Daily</span>
                </div>
                <div>
                  <span className="text-zinc-200 font-medium block">Nutrition Cafeteria:</span>
                  <span className="text-zinc-400">07:00 AM - 10:30 PM Daily</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
