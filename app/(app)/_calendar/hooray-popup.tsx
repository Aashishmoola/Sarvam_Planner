"use client";

import { useEffect } from "react";

export function HoorayPopup({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 1500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Goal completed"
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-3/80 animate-fadein"
    >
      <p className="text-lg font-medium tracking-tight text-blue-100 animate-pop">
        Hooray. That&apos;s one.
      </p>
    </div>
  );
}
