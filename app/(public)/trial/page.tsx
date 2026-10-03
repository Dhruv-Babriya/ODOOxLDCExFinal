'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { submitPublicEnquiryAction } from '@/actions/enquiries';

export default function TrialBookingPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sport, setSport] = useState<'TENNIS' | 'CRICKET'>('TENNIS');
  const [trialDate, setTrialDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitPublicEnquiryAction({
        fullName,
        email,
        phone,
        interestedSport: sport,
        requestedTrialDate: trialDate || undefined,
        message: message || undefined,
      });

      if (!result.success) throw new Error(result.error || 'Failed to submit');

      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      setError('Unable to submit enquiry at this moment. Please call reception directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
          Complimentary Experience
        </Badge>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Request a Club Trial Session</h1>
        <p className="text-sm text-zinc-400">
          Experience our championship courts, meet our coaching team, and tour the clubhouse facilities.
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="text-lg text-white">Guest Registration Details</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Our membership concierge will contact you within 24 hours to confirm your scheduled slot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Trial Request Received!</h3>
              <p className="text-xs text-zinc-300 max-w-md mx-auto">
                Thank you for your interest in The Champions Club. A club advisor has been notified and will reach out with your session details and access pass.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Full Name *</label>
                <Input
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Email Address *</label>
                  <Input
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Phone Number *</label>
                  <Input
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Primary Sport Interest</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={sport}
                    onChange={(e) => setSport(e.target.value as 'TENNIS' | 'CRICKET')}
                  >
                    <option value="TENNIS">Tennis Courts</option>
                    <option value="CRICKET">Cricket Oval & Nets</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Preferred Trial Date</label>
                  <Input
                    type="date"
                    value={trialDate}
                    onChange={(e) => setTrialDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Special Notes or Questions</label>
                <textarea
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Tell us about your playing experience or specific membership questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                Submit Trial Request
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
