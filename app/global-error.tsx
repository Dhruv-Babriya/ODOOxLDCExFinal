'use client';

import { useEffect } from 'react';
import { sanitizeErrorMessage } from '@/lib/errors';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Application Error Caught]:', error);
  }, [error]);

  const safeMessage = sanitizeErrorMessage(error?.message);

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white min-h-screen flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full border border-zinc-800 bg-zinc-900 p-8 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold tracking-tight">System Notice</h1>
          <p className="text-xs text-zinc-400">
            An unexpected error occurred while loading this page.
          </p>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 text-left">
            {safeMessage}
          </div>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
