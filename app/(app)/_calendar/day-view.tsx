"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  buildDayGrid,
  collapseSleepBands,
  completionPct,
  hhmmToMinutes,
  isSlotOffFocus,
  layoutDay,
  minutesToHHMM,
  slotFocusForDayOfWeek,
  type RenderItem,
} from "@/lib/engine/day-calendar";
import type {
  AssignmentRow,
  DayData,
  NonProductiveRow,
} from "./types";
import {
  assignGoalToSlot,
  checkOffGoal,
  crossOffGoal,
  unassignGoal,
  updateJournal,
  upsertNonProductiveGoal,
  resolveNonProductiveGoal,
} from "./actions";
import { PrevNextNav } from "./prev-next-nav";
import { CompletionBadge } from "./completion-badge";
import { GoalPicker } from "./goal-picker";
import { CheckConfirmModal, type JournalDraft } from "./check-confirm-modal";
import { CrossConfirmModal } from "./cross-confirm-modal";
import { JournalEditor } from "./journal-editor";
import { HoorayPopup } from "./hooray-popup";
import { NonProductiveSection } from "./non-productive-section";

const PX_PER_MIN = 44 / 30; // 30-min slot ≈ 44px (tap target)

type Modal =
  | { kind: "none" }
  | { kind: "picker"; start: number; end: number; offFocus: boolean }
  | { kind: "check"; assignment: AssignmentRow }
  | { kind: "cross"; assignment: AssignmentRow }
  | { kind: "journal"; assignment: AssignmentRow };

function dayOfYear(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0);
  return Math.floor(ms / 86_400_000);
}

function replaceAssignment(
  list: AssignmentRow[],
  row: AssignmentRow,
): AssignmentRow[] {
  const idx = list.findIndex((a) => a.id === row.id);
  if (idx === -1) return [...list, row];
  const next = [...list];
  next[idx] = row;
  return next;
}

function replaceNonProd(
  list: NonProductiveRow[],
  row: NonProductiveRow,
): NonProductiveRow[] {
  const idx = list.findIndex((n) => n.id === row.id);
  if (idx === -1) return [...list, row];
  const next = [...list];
  next[idx] = row;
  return next;
}

export function DayView({ data }: { data: DayData }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentRow[]>(
    data.assignments,
  );
  const [nonProductive, setNonProductive] = useState<NonProductiveRow[]>(
    data.nonProductive,
  );
  const [modal, setModal] = useState<Modal>({ kind: "none" });
  const [hooray, setHooray] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [crossError, setCrossError] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);

  const touchStartX = useRef<number | null>(null);

  const editable = data.isToday;
  const readOnly = data.isPast;
  const dayGrid = collapseSleepBands(buildDayGrid(data.config));
  const layoutAssignments = assignments.map((a) => ({
    ...a,
    startMinutes: hhmmToMinutes(a.start_time),
    endMinutes: hhmmToMinutes(a.end_time),
  }));
  const items: RenderItem<(typeof layoutAssignments)[number]>[] = layoutDay(
    dayGrid,
    layoutAssignments,
  );

  const completion = completionPct(assignments);
  const motto =
    data.mottos.length > 0
      ? data.mottos[dayOfYear(data.date) % data.mottos.length]
      : null;

  // ── Place goal (direct async handler so every failure surfaces) ──
  const [assigning, setAssigning] = useState(false);

  async function handlePick(
    goalId: string,
    slot: { start: number; end: number },
  ) {
    setPickerError(null);
    setAssigning(true);
    try {
      const r = await assignGoalToSlot({
        date: data.date,
        short_term_goal_id: goalId,
        start_time: minutesToHHMM(slot.start),
        end_time: minutesToHHMM(slot.end),
      });
      if (!r.ok) {
        setPickerError(r.error);
        return;
      }
      setAssignments((a) => [...a, r.data]);
      setModal({ kind: "none" });
    } catch (e) {
      console.error("place goal failed", e);
      setPickerError(
        e instanceof Error ? e.message : "Could not place the goal.",
      );
    } finally {
      setAssigning(false);
    }
  }

  const checkMut = useMutation({
    mutationFn: async (input: {
      id: string;
      effort: number;
      journal: JournalDraft;
    }) => {
      const r = await checkOffGoal({
        assignment_id: input.id,
        effort_score: input.effort,
        journal_mood: input.journal.mood || null,
        journal_technique_tweak: input.journal.technique || null,
        journal_notes: input.journal.notes || null,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onMutate: ({ id }) => {
      const snapshot = assignments;
      setAssignments((a) =>
        a.map((x) => (x.id === id ? { ...x, status: "checked" } : x)),
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) setAssignments(ctx.snapshot);
      setCheckError(_e.message);
    },
    onSuccess: (row) => setAssignments((a) => replaceAssignment(a, row)),
  });

  const crossMut = useMutation({
    mutationFn: async (input: {
      id: string;
      journal: JournalDraft;
    }) => {
      const r = await crossOffGoal({
        assignment_id: input.id,
        journal_mood: input.journal.mood || null,
        journal_technique_tweak: input.journal.technique || null,
        journal_notes: input.journal.notes || null,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onMutate: ({ id }) => {
      const snapshot = assignments;
      setAssignments((a) =>
        a.map((x) => (x.id === id ? { ...x, status: "crossed" } : x)),
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) setAssignments(ctx.snapshot);
      setCrossError(_e.message);
    },
    onSuccess: (row) => setAssignments((a) => replaceAssignment(a, row)),
  });

  const unassignMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await unassignGoal(id);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onMutate: (id) => {
      const snapshot = assignments;
      setAssignments((a) => a.filter((x) => x.id !== id));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) setAssignments(ctx.snapshot);
    },
  });

  const journalMut = useMutation({
    mutationFn: async (input: {
      id: string;
      journal: JournalDraft;
    }) => {
      const r = await updateJournal({
        assignment_id: input.id,
        journal_mood: input.journal.mood || null,
        journal_technique_tweak: input.journal.technique || null,
        journal_notes: input.journal.notes || null,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (row) => setAssignments((a) => replaceAssignment(a, row)),
    onError: (e: Error) => setJournalError(e.message),
  });

  const nonProdUpsertMut = useMutation({
    mutationFn: async (input: {
      day_plan_id: string;
      position: number;
      title: string;
    }) => {
      const r = await upsertNonProductiveGoal(input);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (data) => {
      if ("deleted" in data) {
        setNonProductive((list) => list.filter((n) => n.id !== data.id));
      } else {
        setNonProductive((list) => replaceNonProd(list, data));
      }
    },
  });

  const nonProdResolveMut = useMutation({
    mutationFn: async (input: {
      id: string;
      action: "check" | "cross";
      notes?: string;
    }) => {
      const r = await resolveNonProductiveGoal({
        id: input.id,
        action: input.action,
        journal_notes: input.notes ?? null,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onMutate: ({ id, action }) => {
      const snapshot = nonProductive;
      setNonProductive((list) =>
        list.map((n) =>
          n.id === id
            ? { ...n, status: action === "check" ? "checked" : "crossed" }
            : n,
        ),
      );
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) setNonProductive(ctx.snapshot);
    },
    onSuccess: (row) => setNonProductive((list) => replaceNonProd(list, row)),
  });

  // ── Keyboard + swipe navigation ──────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal.kind !== "none") return;
      if (e.key === "ArrowLeft") router.push(`/day/${data.prevDate}`);
      if (e.key === "ArrowRight" && data.nextDate)
        router.push(`/day/${data.nextDate}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, data.prevDate, data.nextDate, router]);

  function openPicker(start: number, end: number) {
    setPickerError(null);
    setModal({
      kind: "picker",
      start,
      end,
      offFocus: isSlotOffFocus(
        { startMinutes: start, endMinutes: end },
        data.focusPeriods,
        data.dayOfWeek,
      ),
    });
  }

  const nonProdPending =
    nonProdUpsertMut.isPending || nonProdResolveMut.isPending;

  return (
    <div>
      <header className="mb-6 flex items-baseline justify-between">
        <PrevNextNav
          prevDate={data.prevDate}
          nextDate={data.nextDate}
          date={data.date}
        />
        <CompletionBadge value={completion} />
      </header>

      {motto && (
        <p className="mb-6 border-l-2 border-blue-400/40 pl-3 text-sm italic text-blue-200">
          {motto}
        </p>
      )}

      {!data.dayPlan && data.isPast && (
        <p className="mb-6 text-xs text-gray-mid">
          No plan was created for this day.
        </p>
      )}

      <div
        className="divide-y divide-gray-soft/40 border-y border-gray-soft"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (dx > 60) router.push(`/day/${data.prevDate}`);
          else if (dx < -60 && data.nextDate)
            router.push(`/day/${data.nextDate}`);
        }}
      >
        {items.map((item, i) => {
          if (item.kind === "sleep") {
            return (
              <div
                key={`sleep-${i}`}
                className="flex items-center justify-between bg-ink-1 px-3 py-2 text-xs text-gray-mid"
              >
                <span>Sleep</span>
                <span>
                  {minutesToHHMM(item.startMinutes)}–
                  {minutesToHHMM(item.endMinutes)}
                </span>
              </div>
            );
          }

          if (item.kind === "assignment") {
            return (
              <AssignmentCard
                key={item.assignment.id}
                assignment={item.assignment}
                startMinutes={item.startMinutes}
                endMinutes={item.endMinutes}
                readOnly={readOnly}
                pending={
                  checkMut.isPending ||
                  crossMut.isPending ||
                  unassignMut.isPending
                }
                onCheck={() => {
                  setCheckError(null);
                  setModal({ kind: "check", assignment: item.assignment });
                }}
                onCross={() => {
                  setCrossError(null);
                  setModal({ kind: "cross", assignment: item.assignment });
                }}
                onJournal={() => {
                  setJournalError(null);
                  setModal({ kind: "journal", assignment: item.assignment });
                }}
                onRemove={() => unassignMut.mutate(item.assignment.id)}
              />
            );
          }

          // Empty slot
          const focus = slotFocusForDayOfWeek(
            { startMinutes: item.startMinutes, endMinutes: item.endMinutes },
            data.focusPeriods,
            data.dayOfWeek,
          );
          return (
            <button
              key={`slot-${i}`}
              type="button"
              disabled={!editable}
              onClick={() =>
                editable && openPicker(item.startMinutes, item.endMinutes)
              }
              style={{
                backgroundColor: focus.period
                  ? focus.period.color + "14"
                  : undefined,
              }}
              className={`flex h-11 w-full items-center justify-between px-3 text-left transition-filter ${
                editable
                  ? "cursor-pointer hover:brightness-125 focus:brightness-150 focus:outline-none"
                  : "cursor-default"
              }`}
            >
              <span className="text-xs text-gray-fade">
                {minutesToHHMM(item.startMinutes)}
              </span>
              {editable && (
                <span className="text-[10px] uppercase tracking-wider text-gray-mid">
                  {focus.intensity === "high" ? "high focus" : "tap to place"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {data.dayPlan && (
        <NonProductiveSection
          goals={nonProductive}
          readOnly={readOnly}
          pending={nonProdPending}
          onUpsert={(position, title) =>
            nonProdUpsertMut.mutate({
              day_plan_id: data.dayPlan!.id,
              position,
              title,
            })
          }
          onResolve={(id, action) =>
            nonProdResolveMut.mutate({ id, action })
          }
        />
      )}

      {/* Modals */}
      {modal.kind === "picker" && (
        <GoalPicker
          startMinutes={modal.start}
          endMinutes={modal.end}
          offFocus={modal.offFocus}
          goals={data.shortTermGoals}
          pending={assigning}
          error={pickerError}
          onCancel={() => setModal({ kind: "none" })}
          onPick={(goalId) =>
            handlePick(goalId, { start: modal.start, end: modal.end })
          }
        />
      )}

      {modal.kind === "check" && (
        <CheckConfirmModal
          assignment={modal.assignment}
          pending={checkMut.isPending}
          error={checkError}
          onCancel={() => setModal({ kind: "none" })}
          onConfirm={(effort, journal) =>
            checkMut.mutate(
              { id: modal.assignment.id, effort, journal },
              {
                onSuccess: () => {
                  setModal({ kind: "none" });
                  setHooray(true);
                },
              },
            )
          }
        />
      )}

      {modal.kind === "cross" && (
        <CrossConfirmModal
          assignment={modal.assignment}
          pending={crossMut.isPending}
          error={crossError}
          onCancel={() => setModal({ kind: "none" })}
          onConfirm={(journal) =>
            crossMut.mutate(
              { id: modal.assignment.id, journal },
              { onSuccess: () => setModal({ kind: "none" }) },
            )
          }
        />
      )}

      {modal.kind === "journal" && (
        <JournalEditor
          assignment={modal.assignment}
          pending={journalMut.isPending}
          error={journalError}
          onCancel={() => setModal({ kind: "none" })}
          onSave={(journal) =>
            journalMut.mutate(
              { id: modal.assignment.id, journal },
              { onSuccess: () => setModal({ kind: "none" }) },
            )
          }
        />
      )}

      {hooray && <HoorayPopup onDismiss={() => setHooray(false)} />}
    </div>
  );
}

function AssignmentCard({
  assignment,
  startMinutes,
  endMinutes,
  readOnly,
  pending,
  onCheck,
  onCross,
  onJournal,
  onRemove,
}: {
  assignment: AssignmentRow;
  startMinutes: number;
  endMinutes: number;
  readOnly: boolean;
  pending: boolean;
  onCheck: () => void;
  onCross: () => void;
  onJournal: () => void;
  onRemove: () => void;
}) {
  const heightPx = (endMinutes - startMinutes) * PX_PER_MIN;
  const status = assignment.status;

  const containerClass = {
    pending: "border-gray-soft",
    checked: "border-blue-400/50 bg-blue-400/10",
    crossed: "border-blue-300/40",
    auto_failed: "border-blue-300/40",
  }[status];

  return (
    <div
      className={`flex flex-col justify-center border-l-2 px-4 ${containerClass}`}
      style={{ minHeight: `${Math.max(heightPx, 44)}px` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-blue-50">{assignment.goal_title}</div>
          <div className="mt-0.5 text-xs text-gray-fade">
            {minutesToHHMM(startMinutes)}–{minutesToHHMM(endMinutes)}
            {status === "auto_failed" && (
              <span className="ml-2 text-blue-300">auto-failed at noon</span>
            )}
            {assignment.warning_off_focus && status === "pending" && (
              <span className="ml-2 text-blue-300">off-focus</span>
            )}
          </div>
          {assignment.effort_score !== null && (
            <div className="mt-0.5 text-xs text-gray-mid">
              effort {assignment.effort_score}/5
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {status === "checked" && <span className="text-blue-200">✓</span>}
          {status === "crossed" && <span className="text-blue-300">✗</span>}
          {status === "auto_failed" && <span className="text-blue-300">✗</span>}
        </div>
      </div>

      <div className="mt-2 flex gap-4">
        {!readOnly && status === "pending" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={onCheck}
              className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
            >
              ✓ Check
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onCross}
              className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
            >
              ✗ Cross
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onRemove}
              className="tap-target text-xs uppercase tracking-wider text-gray-mid hover:text-blue-200 disabled:opacity-40"
            >
              Remove
            </button>
          </>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={onJournal}
          className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
        >
          {assignment.journal_mood || assignment.journal_technique_tweak || assignment.journal_notes
            ? "Journal ✓"
            : "Journal"}
        </button>
      </div>
    </div>
  );
}
