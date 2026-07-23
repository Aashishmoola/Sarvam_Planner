"use client";

import { useEffect, useState } from "react";
import type { AssignmentRow } from "./types";
import { JournalFields, type JournalDraft } from "./check-confirm-modal";

export function CrossConfirmModal({
  assignment,
  onConfirm,
  onCancel,
  pending,
  error,
}: {
  assignment: AssignmentRow;
  onConfirm: (journal: JournalDraft) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [showJournal, setShowJournal] = useState(false);
  const [journal, setJournal] = useState<JournalDraft>({
    mood: assignment.journal_mood ?? "",
    technique: assignment.journal_technique_tweak ?? "",
    notes: assignment.journal_notes ?? "",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm cross-off"
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink-0/70 animate-fadein"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm border border-gray-soft bg-ink-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-blue-50">
          Are you sure you were not able to complete this goal?
        </h2>
        <p className="mt-1 text-xs text-gray-fade">{assignment.goal_title}</p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowJournal((s) => !s)}
            className="text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200"
          >
            {showJournal ? "− Hide journal" : "+ Add journal"}
          </button>
          {showJournal && (
            <JournalFields journal={journal} setJournal={setJournal} />
          )}
        </div>

        {error && <p className="mt-3 text-xs text-blue-300">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="tap-target text-xs uppercase tracking-widest text-gray-fade hover:text-blue-200 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(journal)}
            className="tap-target border border-blue-300/50 px-4 text-xs uppercase tracking-widest text-blue-200 hover:bg-blue-300/10 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
