"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  hhmmToMinutes,
  minutesToHHMM,
} from "@/lib/engine/day-calendar";
import { saveFocusPeriods, finishFocusHours } from "./actions";

type LabelDef = {
  key: string;
  label: string;
  color: string;
  intensity: "high" | "low";
};

// Four preset labels (deliberate palette extension per product review).
const LABELS: LabelDef[] = [
  { key: "deep", label: "Deep work", color: "#2560ff", intensity: "high" },
  { key: "low", label: "Low productivity", color: "#8ab0ff", intensity: "low" },
  { key: "school", label: "School / work", color: "#ff7a7a", intensity: "high" },
  { key: "rest", label: "Rest & family", color: "#5bbf6b", intensity: "low" },
];

const COLOR_TO_KEY: Record<string, string> = Object.fromEntries(
  LABELS.map((l) => [l.color.toLowerCase(), l.key]),
);

type Period = {
  label: string;
  color: string;
  start_time: string;
  end_time: string;
  intensity: "high" | "low";
};

function covers(
  bs: number,
  be: number,
  ps: number,
  pe: number,
): boolean {
  if (ps === pe) return false;
  if (ps < pe) return bs >= ps && be <= pe;
  return bs >= ps || be <= pe; // period wraps midnight
}

/** Build the waking 30-min blocks from the sleep window. */
function buildWaking(sleepStart: string, sleepEnd: string) {
  const sStart = hhmmToMinutes(sleepStart);
  const sEnd = hhmmToMinutes(sleepEnd);
  const wakeStart = sEnd;
  let wakeEnd = sStart < sEnd ? sStart + 1440 : sStart;
  if (wakeEnd <= wakeStart) wakeEnd = wakeStart + 1440;
  const blocks: { start: number; end: number }[] = [];
  for (let m = wakeStart; m < wakeEnd; m += 30) {
    blocks.push({ start: m, end: m + 30 });
  }
  return { wakeStart, wakeEnd, blocks };
}

export function FocusHoursEditor({
  periods,
  sleepStart,
  sleepEnd,
  nextHref,
}: {
  periods: Period[];
  sleepStart: string;
  sleepEnd: string;
  nextHref: string;
}) {
  const { blocks } = useMemo(
    () => buildWaking(sleepStart, sleepEnd),
    [sleepStart, sleepEnd],
  );

  // blockIndex -> label key | null
  const [assign, setAssign] = useState<Record<number, string | null>>(() => {
    const map: Record<number, string | null> = {};
    blocks.forEach((_, i) => (map[i] = null));
    for (const p of periods) {
      const key = COLOR_TO_KEY[p.color.toLowerCase()];
      if (!key) continue;
      const ps = hhmmToMinutes(p.start_time);
      const pe = hhmmToMinutes(p.end_time);
      blocks.forEach((b, i) => {
        if (covers(b.start % 1440, b.end % 1440, ps, pe)) map[i] = key;
      });
    }
    return map;
  });

  const [selected, setSelected] = useState<string | null>(LABELS[0].key);
  const [dragAnchor, setDragAnchor] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Clear drag if the pointer releases outside the stack.
  useEffect(() => {
    const onUp = () => {
      setDragAnchor(null);
      setDragCurrent(null);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  function applyRange(a: number, b: number, key: string) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    setAssign((prev) => {
      const next = { ...prev };
      for (let i = lo; i <= hi; i++) next[i] = key;
      return next;
    });
  }

  const unassignedCount = blocks.filter((_, i) => !assign[i]).length;

  async function handleContinue() {
    if (unassignedCount > 0) {
      setError(
        `Assign every block before continuing. ${unassignedCount} left.`,
      );
      return;
    }
    setError(null);
    setSaving(true);

    // Collapse contiguous same-label blocks into period runs.
    const runs: Period[] = [];
    let runKey: string | null = null;
    let runStart = 0;
    blocks.forEach((b, i) => {
      const key = assign[i];
      if (key !== runKey) {
        if (runKey !== null) {
          const def = LABELS.find((l) => l.key === runKey)!;
          runs.push({
            label: def.label,
            color: def.color,
            start_time: minutesToHHMM(blocks[runStart].start % 1440),
            end_time: minutesToHHMM(b.start % 1440),
            intensity: def.intensity,
          });
        }
        runKey = key;
        runStart = i;
      }
    });
    if (runKey !== null) {
      const def = LABELS.find((l) => l.key === runKey)!;
      runs.push({
        label: def.label,
        color: def.color,
        start_time: minutesToHHMM(blocks[runStart].start % 1440),
        end_time: minutesToHHMM(blocks[blocks.length - 1].end % 1440),
        intensity: def.intensity,
      });
    }

    const res = await saveFocusPeriods({ periods: runs });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    finishFocusHours(nextHref);
  }

  return (
    <div className="space-y-6">
      {/* Label palette */}
      <div>
        <span className="text-xs uppercase tracking-wider text-gray-fade">
          Labels
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LABELS.map((l) => {
            const active = selected === l.key;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => setSelected(active ? null : l.key)}
                className={`flex items-center gap-2 border px-3 py-2 text-left text-xs transition-colors ${
                  active
                    ? "border-blue-400 bg-blue-400/10"
                    : "border-gray-soft hover:border-blue-400"
                }`}
              >
                <span
                  aria-hidden
                  className="h-3 w-3"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-blue-50">{l.label}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-gray-mid">
          {selected
            ? "Drag across the stack to paint blocks. Tap a single block to fill it."
            : "Select a label, then paint blocks."}
        </p>
      </div>

      {/* Block stack */}
      <div className="border-y border-gray-soft">
        {blocks.map((b, i) => {
          const key = assign[i];
          const def = key ? LABELS.find((l) => l.key === key) : null;
          const inDrag =
            dragAnchor !== null &&
            dragCurrent !== null &&
            i >= Math.min(dragAnchor, dragCurrent) &&
            i <= Math.max(dragAnchor, dragCurrent);
          const tint = def ? def.color + "22" : undefined;
          return (
            <button
              key={i}
              type="button"
              onPointerDown={(e) => {
                if (!selected) return;
                e.preventDefault();
                setDragAnchor(i);
                setDragCurrent(i);
              }}
              onPointerEnter={() => {
                if (dragAnchor !== null) setDragCurrent(i);
              }}
              onPointerUp={() => {
                if (dragAnchor !== null && selected) {
                  applyRange(dragAnchor, i, selected);
                  setDragAnchor(null);
                  setDragCurrent(null);
                }
              }}
              className="flex h-10 w-full items-center justify-between border-b border-gray-soft/40 px-3 text-left last:border-b-0"
              style={{
                backgroundColor: inDrag && selected
                  ? LABELS.find((l) => l.key === selected)!.color + "33"
                  : tint,
              }}
            >
              <span className="text-[11px] text-gray-fade">
                {minutesToHHMM(b.start % 1440)}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-gray-mid">
                {def ? def.label : "unassigned"}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-blue-300">{error}</p>}

      <div className="border-t border-gray-soft pt-6">
        <Button
          variant="primary"
          disabled={saving}
          onClick={() => void handleContinue()}
        >
          {saving ? "Saving…" : "Continue"}
        </Button>
        {unassignedCount > 0 && (
          <p className="mt-2 text-xs text-gray-mid">
            {unassignedCount} block{unassignedCount === 1 ? "" : "s"} unassigned.
          </p>
        )}
      </div>
    </div>
  );
}
