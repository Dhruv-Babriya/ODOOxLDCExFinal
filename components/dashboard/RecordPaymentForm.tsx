'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recordPaymentAction } from '@/actions/payments';
import { PAYMENT_METHODS } from '@/types/shared';
import { CreditCard, CheckCircle2, X } from 'lucide-react';

interface RecordPaymentFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultInvoiceId?: string;
  defaultBookingId?: string;
  defaultShopOrderId?: string;
  defaultBarOrderId?: string;
  defaultMemberId?: string;
  defaultAmount?: number;
}

export function RecordPaymentForm({
  onClose,
  onSuccess,
  defaultInvoiceId,
  defaultBookingId,
  defaultShopOrderId,
  defaultBarOrderId,
  defaultMemberId,
  defaultAmount,
}: RecordPaymentFormProps) {
  const [amount, setAmount] = useState(defaultAmount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [transactionReference, setTransactionReference] = useState('');
  const [memberId, setMemberId] = useState(defaultMemberId || '');
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || '');
  const [bookingId, setBookingId] = useState(defaultBookingId || '');
  const [shopOrderId, setShopOrderId] = useState(defaultShopOrderId || '');
  const [barOrderId, setBarOrderId] = useState(defaultBarOrderId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await recordPaymentAction({
      amount: parseFloat(amount),
      paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER',
      transactionReference: transactionReference || undefined,
      memberId: memberId || undefined,
      invoiceId: invoiceId || undefined,
      bookingId: bookingId || undefined,
      shopOrderId: shopOrderId || undefined,
      barOrderId: barOrderId || undefined,
    });

    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error);
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Payment Recorded!</h3>
          <p className="text-xs text-zinc-400">The transaction has been saved to the financial ledger.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base">Record Payment</CardTitle>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
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
              <label className="text-xs font-medium text-zinc-300">Amount (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Payment Method *</label>
              <select
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {(paymentMethod === 'UPI' || paymentMethod === 'CARD' || paymentMethod === 'BANK_TRANSFER') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Transaction Reference</label>
              <Input
                placeholder={paymentMethod === 'UPI' ? 'UPI Transaction ID' : paymentMethod === 'CARD' ? 'Card approval code' : 'Transfer reference'}
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Invoice ID (optional)</label>
              <Input
                placeholder="UUID of invoice"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Member ID (optional)</label>
              <Input
                placeholder="UUID of member"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Booking ID</label>
              <Input
                placeholder="UUID"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Shop Order ID</label>
              <Input
                placeholder="UUID"
                value={shopOrderId}
                onChange={(e) => setShopOrderId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Bar Order ID</label>
              <Input
                placeholder="UUID"
                value={barOrderId}
                onChange={(e) => setBarOrderId(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Record Payment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
