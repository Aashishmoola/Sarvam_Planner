"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { minutesToHHMM } from "@/lib/engine/day-calendar";
import type { ShortTermGoalRow } from "./types";

export function GoalPicker({
  startMinutes,
  endMinutes,
  offFocus,
  goals,
  onPick,
  onCancel,
  pending,
  error,
}: {
  startMinutes: number;
  endMinutes: number;
  offFocus: boolean;
  goals: ShortTermGoalRow[];
  onPick: (goalId: string) => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const confirmLabel = offFocus ? "Place here anyway" : "Place goal";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Place a goal"
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink-3/70 animate-fadein sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm border border-gray-soft bg-ink-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-blue-50">Place a goal</h2>
          <span className="text-xs text-gray-fade">
            {minutesToHHMM(startMinutes)}–{minutesToHHMM(endMinutes)}
          </span>
        </div>

        {offFocus && (
          <p className="mb-4 border border-blue-300/50 px-3 py-2 text-xs text-blue-200">
            This slot is a low-focus (or unmarked) period. Place it here anyway?
          </p>
        )}

        {goals.length === 0 ? (
          <p className="text-xs text-gray-mid">
            You have no active short-term goals. Add one in{" "}
            <Link href="/settings/goals" className="text-blue-200 hover:underline">
              Settings → Goals
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => {
              const active = selected === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={pending}
                  onClick={() => setSelected(g.id)}
                  className={`block w-full border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                    active
                      ? "border-blue-400 bg-blue-400/10 text-blue-600"
                      : "border-gray-soft text-blue-50 hover:border-blue-400"
                  }`}
                >
                  {g.title}
                  <span className="ml-2 text-xs text-gray-fade">
                    {g.cycle_length_days}d
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
            disabled={!selected || pending}
            onClick={() => selected && onPick(selected)}
            className="tap-target bg-blue-400 border border-blue-400 px-4 text-xs uppercase tracking-widest text-blue-100 hover:bg-blue-500 disabled:opacity-40"
          >
            {pending ? "Placing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
