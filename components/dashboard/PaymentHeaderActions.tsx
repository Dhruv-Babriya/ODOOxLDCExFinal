'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RecordPaymentForm } from './RecordPaymentForm';
import { Plus } from 'lucide-react';

export function PaymentHeaderActions() {
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="flex justify-end mb-4">
      {!isRecording ? (
        <Button variant="primary" onClick={() => setIsRecording(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record New Payment
        </Button>
      ) : (
        <div className="w-full max-w-2xl ml-auto">
          <RecordPaymentForm onClose={() => setIsRecording(false)} onSuccess={() => setIsRecording(false)} />
        </div>
      )}
    </div>
  );
}
