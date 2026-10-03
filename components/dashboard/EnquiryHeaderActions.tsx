'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QuoteForm } from './QuoteForm';
import { Plus } from 'lucide-react';

export function EnquiryHeaderActions() {
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div className="flex justify-end mb-4">
      {!isCreating ? (
        <Button variant="primary" onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generate Quote
        </Button>
      ) : (
        <div className="w-full max-w-2xl ml-auto">
          <QuoteForm onClose={() => setIsCreating(false)} onSuccess={() => setIsCreating(false)} />
        </div>
      )}
    </div>
  );
}
