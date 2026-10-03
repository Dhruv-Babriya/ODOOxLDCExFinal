'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateEnquiryStatusAction } from '@/actions/enquiries';
import { MessageSquare, PhoneCall, CalendarDays, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { QuoteForm } from '@/components/dashboard/QuoteForm';

export interface EnquiryItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  interested_sport?: string | null;
  requested_trial_date?: string | null;
  created_at: string;
}

interface EnquiryDashboardClientProps {
  enquiries: EnquiryItem[];
}

export function EnquiryDashboardClient({ enquiries }: EnquiryDashboardClientProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [activeQuoteForm, setActiveQuoteForm] = useState<string | null>(null);

  const handleStatusUpdate = async (enquiryId: string, status: string) => {
    setIsProcessing(enquiryId);
    await updateEnquiryStatusAction(enquiryId, status);
    setIsProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW': return <Badge variant="destructive">NEW</Badge>;
      case 'CONTACTED': return <Badge variant="warning">CONTACTED</Badge>;
      case 'TRIAL_SCHEDULED': return <Badge variant="outline" className="text-sky-400 border-sky-400/50">TRIAL</Badge>;
      case 'QUOTE_SENT': return <Badge variant="outline" className="text-purple-400 border-purple-400/50">QUOTE</Badge>;
      case 'CONVERTED': return <Badge variant="success">CONVERTED</Badge>;
      case 'CLOSED': return <Badge variant="outline">CLOSED</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
          <div>
            <CardTitle className="text-base text-white">Lead Pipeline</CardTitle>
            <CardDescription className="text-xs text-zinc-400">Track visitors from initial enquiry to member conversion</CardDescription>
          </div>
          <Badge variant="outline">{enquiries.length} Active Leads</Badge>
        </CardHeader>
        <CardContent>
          {enquiries.length === 0 ? (
             <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <MessageSquare className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No active enquiries found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enquiries.map((e) => (
                <div key={e.id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-white">{e.full_name}</h4>
                      {getStatusBadge(e.status)}
                    </div>
                    <div className="text-xs text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{e.email}</span>
                      <span>{e.phone}</span>
                      {e.interested_sport && <span>Sport: <span className="text-emerald-400">{e.interested_sport}</span></span>}
                      {e.requested_trial_date && <span>Trial: <span className="text-sky-400">{e.requested_trial_date}</span></span>}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Received: {formatDateTime(e.created_at)}
                    </div>
                  </div>

                  {/* Action Pipeline */}
                  <div className="shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800 flex flex-wrap gap-2 items-center">
                    {e.status === 'NEW' && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" disabled={isProcessing === e.id} onClick={() => handleStatusUpdate(e.id, 'CONTACTED')}>
                        <PhoneCall className="w-3 h-3 mr-1.5" /> Mark Contacted
                      </Button>
                    )}
                    
                    {['NEW', 'CONTACTED'].includes(e.status) && e.requested_trial_date && (
                      <Button size="sm" variant="outline" className="h-8 text-xs text-sky-400 border-sky-900" disabled={isProcessing === e.id} onClick={() => handleStatusUpdate(e.id, 'TRIAL_SCHEDULED')}>
                        <CalendarDays className="w-3 h-3 mr-1.5" /> Confirm Trial
                      </Button>
                    )}

                    {['NEW', 'CONTACTED', 'TRIAL_SCHEDULED'].includes(e.status) && (
                      <Button size="sm" variant="outline" className="h-8 text-xs text-purple-400 border-purple-900" disabled={isProcessing === e.id} onClick={() => setActiveQuoteForm(e.id)}>
                        <FileText className="w-3 h-3 mr-1.5" /> Send Quote
                      </Button>
                    )}

                    {e.status === 'QUOTE_SENT' && (
                      <Button size="sm" variant="primary" className="h-8 text-xs" disabled={isProcessing === e.id} onClick={() => handleStatusUpdate(e.id, 'CONVERTED')}>
                        <CheckCircle2 className="w-3 h-3 mr-1.5" /> Convert to Member
                      </Button>
                    )}

                    {!['CONVERTED', 'CLOSED'].includes(e.status) && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-500 hover:text-rose-400" disabled={isProcessing === e.id} onClick={() => handleStatusUpdate(e.id, 'CLOSED')}>
                        <XCircle className="w-3 h-3 mr-1.5" /> Close Lead
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {activeQuoteForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl relative">
             <QuoteForm 
                defaultEnquiryId={activeQuoteForm}
                defaultRecipientName={enquiries.find(e => e.id === activeQuoteForm)?.full_name}
                defaultRecipientEmail={enquiries.find(e => e.id === activeQuoteForm)?.email}
                onClose={() => setActiveQuoteForm(null)} 
                onSuccess={() => {
                  setActiveQuoteForm(null);
                  window.location.reload(); // Quick refresh to update state
                }} 
              />
          </div>
        </div>
      )}
    </div>
  );
}
