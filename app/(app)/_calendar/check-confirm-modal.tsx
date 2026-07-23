"use client";

import { useEffect, useState } from "react";
import type { AssignmentRow } from "./types";

export function CheckConfirmModal({
  assignment,
  onConfirm,
  onCancel,
  pending,
  error,
}: {
  assignment: AssignmentRow;
  onConfirm: (effort: number, journal: JournalDraft) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [effort, setEffort] = useState<number | null>(null);
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
      aria-label="Confirm check-off"
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink-0/70 animate-fadein"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm border border-gray-soft bg-ink-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-medium text-blue-50">
          Are you sure you truthfully completed this goal?
        </h2>
        <p className="mt-1 text-xs text-gray-fade">{assignment.goal_title}</p>

        <div className="mt-5">
          <span className="text-xs uppercase tracking-wider text-gray-fade">
            Effort
          </span>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = effort === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={pending}
                  onClick={() => setEffort(n)}
                  className={`tap-target border py-2 text-sm transition-colors disabled:opacity-40 ${
                    active
                      ? "border-blue-400 bg-blue-400/10 text-blue-100"
                      : "border-gray-soft text-gray-fade hover:border-blue-400"
                  }`}
                  aria-pressed={active}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

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
            disabled={effort === null || pending}
            onClick={() => effort && onConfirm(effort, journal)}
            className="tap-target border border-blue-400 px-4 text-xs uppercase tracking-widest text-blue-100 hover:bg-blue-400 hover:text-ink-0 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Yes, done"}
          </button>
        </div>
      </div>
    </div>
  );
}

export type JournalDraft = {
  mood: string;
  technique: string;
  notes: string;
};

export function JournalFields({
  journal,
  setJournal,
}: {
  journal: JournalDraft;
  setJournal: (j: JournalDraft) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-gray-fade">
          Mood
        </span>
        <input
          value={journal.mood}
          onChange={(e) => setJournal({ ...journal, mood: e.target.value })}
          className="mt-1 block w-full rounded-none border-b border-gray-soft bg-transparent px-0 py-2 text-sm text-blue-50 outline-none focus:border-blue-400"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-gray-fade">
          Technique tweak
        </span>
        <textarea
          value={journal.technique}
          onChange={(e) => setJournal({ ...journal, technique: e.target.value })}
          rows={2}
          className="mt-1 block w-full resize-none border-b border-gray-soft bg-transparent px-0 py-2 text-sm text-blue-50 outline-none focus:border-blue-400"
        />
      </label>
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-gray-fade">
          Notes
        </span>
        <textarea
          value={journal.notes}
          onChange={(e) => setJournal({ ...journal, notes: e.target.value })}
          rows={3}
          className="mt-1 block w-full resize-none border-b border-gray-soft bg-transparent px-0 py-2 text-sm text-blue-50 outline-none focus:border-blue-400"
        />
      </label>
    </div>
  );
}
