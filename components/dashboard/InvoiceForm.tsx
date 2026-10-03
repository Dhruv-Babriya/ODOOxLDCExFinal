'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createInvoiceAction } from '@/actions/invoices';
import { RECIPIENT_TYPES } from '@/types/shared';
import { Receipt, CheckCircle2, X, Plus, Trash2 } from 'lucide-react';

interface InvoiceFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function InvoiceForm({ onClose, onSuccess }: InvoiceFormProps) {
  const [memberId, setMemberId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientType, setRecipientType] = useState('MEMBER');
  const [dueDate, setDueDate] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof typeof items[0], value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createInvoiceAction({
      memberId: memberId || undefined,
      recipientName,
      recipientEmail: recipientEmail || undefined,
      recipientType: recipientType as 'MEMBER' | 'BUSINESS_CLIENT' | 'WALK_IN',
      dueDate,
      taxAmount: parseFloat(taxAmount),
      notes: notes || undefined,
      items: items.map(i => ({
        description: i.description,
        quantity: typeof i.quantity === 'string' ? parseInt(i.quantity, 10) : i.quantity,
        unitPrice: typeof i.unitPrice === 'string' ? parseFloat(i.unitPrice) : i.unitPrice
      }))
    });

    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to create invoice.');
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Invoice Created!</h3>
          <p className="text-xs text-zinc-400">The invoice has been generated and added to the register.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const total = subtotal + parseFloat(taxAmount || '0');

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base">Create Invoice</CardTitle>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white" type="button">
            <X className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white border-b border-zinc-800 pb-2">Client Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Recipient Name *</label>
                <Input
                  required
                  placeholder="John Doe or Acme Corp"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Recipient Type</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value)}
                >
                  {RECIPIENT_TYPES.map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Email (optional)</label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Member ID (optional)</label>
                <Input
                  placeholder="UUID if member"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white border-b border-zinc-800 pb-2">Invoice Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Due Date *</label>
                <Input
                  required
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Tax Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Notes (optional)</label>
              <textarea
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="Payment instructions or special remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-sm font-semibold text-white">Line Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/80">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Description *</label>
                    <Input
                      required
                      placeholder="Service or product description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-20 space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Qty *</label>
                    <Input
                      required
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="w-28 space-y-1.5">
                    <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Unit (₹) *</label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    />
                  </div>
                  {items.length > 1 && (
                    <div className="pt-6">
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} className="h-10 text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4 text-sm text-zinc-300 space-x-6">
              <div className="text-right space-y-1">
                <div>Subtotal:</div>
                <div>Tax:</div>
                <div className="text-white font-bold text-base mt-2 pt-2 border-t border-zinc-700">Total:</div>
              </div>
              <div className="text-right font-mono space-y-1">
                <div>₹{subtotal.toFixed(2)}</div>
                <div>₹{parseFloat(taxAmount || '0').toFixed(2)}</div>
                <div className="text-emerald-400 font-bold text-base mt-2 pt-2 border-t border-zinc-700">₹{total.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Generate Invoice
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
