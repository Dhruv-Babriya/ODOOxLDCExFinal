'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createQuoteAction } from '@/actions/enquiries';
import { FileText, CheckCircle2, X } from 'lucide-react';

interface QuoteFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultEnquiryId?: string;
  defaultRecipientName?: string;
  defaultRecipientEmail?: string;
}

export function QuoteForm({ 
  onClose, 
  onSuccess, 
  defaultEnquiryId, 
  defaultRecipientName, 
  defaultRecipientEmail 
}: QuoteFormProps) {
  const [enquiryId, setEnquiryId] = useState(defaultEnquiryId || '');
  const [recipientName, setRecipientName] = useState(defaultRecipientName || '');
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || '');
  const [membershipPlanId, setMembershipPlanId] = useState('');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [validUntil, setValidUntil] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createQuoteAction({
      enquiryId: enquiryId || undefined,
      recipientName,
      recipientEmail,
      membershipPlanId: membershipPlanId || undefined,
      quotedAmount: parseFloat(quotedAmount),
      validUntil,
    });

    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to generate quote.');
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Quote Generated!</h3>
          <p className="text-xs text-zinc-400">The quote has been created and the lead's status has been updated.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base">Generate Quote</CardTitle>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white" type="button">
            <X className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Recipient Name *</label>
              <Input
                required
                placeholder="Lead's full name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Recipient Email *</label>
              <Input
                required
                type="email"
                placeholder="email@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Enquiry ID (optional)</label>
              <Input
                placeholder="UUID to link"
                value={enquiryId}
                onChange={(e) => setEnquiryId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Plan ID (optional)</label>
              <Input
                placeholder="UUID of membership plan"
                value={membershipPlanId}
                onChange={(e) => setMembershipPlanId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Quoted Amount (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={quotedAmount}
                onChange={(e) => setQuotedAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Valid Until *</label>
              <Input
                required
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Generate Quote
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
