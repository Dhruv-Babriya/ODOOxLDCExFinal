import Link from 'next/link';
import { Trophy, Phone, Mail, MapPin } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Trophy className="h-4 w-4" />
              </div>
              <span className="font-bold text-white tracking-tight">THE CHAMPIONS CLUB</span>
            </div>
            <p className="text-sm text-zinc-400">
              Premier athletic club featuring championship clay & hard tennis courts, cricket pitch & nets, professional pro shop, and wellness cafeteria.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/memberships" className="hover:text-emerald-400 transition-colors">Membership Plans</Link></li>
              <li><Link href="/courts" className="hover:text-emerald-400 transition-colors">Courts & Availability</Link></li>
              <li><Link href="/shop" className="hover:text-emerald-400 transition-colors">Pro Gear Shop</Link></li>
              <li><Link href="/trial" className="hover:text-emerald-400 transition-colors">Request a Trial</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Operating Hours</h4>
            <ul className="space-y-2 text-sm">
              <li>Mon - Fri: 06:00 AM - 10:00 PM</li>
              <li>Saturday: 06:00 AM - 11:00 PM</li>
              <li>Sunday: 06:00 AM - 10:00 PM</li>
              <li className="text-emerald-400 font-medium pt-1">Friday Social Play: 06:00 PM - 09:00 PM</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Club Reception</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Champions Boulevard, Sports Enclave</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>frontdesk@thechampionsclub.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-800/80 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} The Champions Club. All rights reserved.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link href="/login" className="hover:text-zinc-200">Staff & Member Portal</Link>
            <Link href="/contact" className="hover:text-zinc-200">Contact Reception</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
