"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import {
  addLongTermGoal,
  addShortTermGoal,
  deleteLongTermGoal,
  deleteShortTermGoal,
  finishGoals,
  type GoalsState,
} from "./actions";

type LongTerm = { id: string; title: string; description: string | null };
type ShortTerm = {
  id: string;
  title: string;
  description: string | null;
  cycle_length_days: number;
  parent_long_term_goal_id: string | null;
};

const CYCLE_OPTIONS = [
  {
    value: 7,
    title: "7 days",
    pro: "Fast feedback loop",
    con: "Two fails ends a cycle quickly",
  },
  {
    value: 14,
    title: "14 days",
    pro: "Balanced (recommended)",
    con: "—",
  },
  {
    value: 21,
    title: "21 days",
    pro: "Classic habit-formation window",
    con: "Longer wait for adjustment",
  },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function DeleteButton({
  onClick,
  pending,
}: {
  onClick: () => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
    >
      Remove
    </button>
  );
}

export function GoalsEditor({
  longTerm,
  shortTerm,
  maxLong,
  maxShort,
  nextHref,
}: {
  longTerm: LongTerm[];
  shortTerm: ShortTerm[];
  maxLong: number;
  maxShort: number;
  nextHref: string;
}) {
  const [ltState, ltAction] = useFormState<GoalsState, FormData>(
    addLongTermGoal,
    {},
  );
  const [stState, stAction] = useFormState<GoalsState, FormData>(
    addShortTermGoal,
    {},
  );
  const [cycle, setCycle] = useState<number>(14);
  const [isPending, startTransition] = useTransition();

  const canAddLong = longTerm.length < maxLong;
  const canAddShort = shortTerm.length < maxShort;
  const canContinue = longTerm.length > 0 && shortTerm.length > 0;

  return (
    <div className="space-y-12">
      {/* Long-term goals */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-gray-fade">
          Long-term goals ({longTerm.length}/{maxLong})
        </h2>
        <div className="space-y-2">
          {longTerm.map((g) => (
            <div
              key={g.id}
              className="flex items-start justify-between gap-4 border border-gray-soft px-4 py-3"
            >
              <div>
                <div className="text-sm text-blue-50">{g.title}</div>
                {g.description && (
                  <div className="mt-1 text-xs text-gray-fade">
                    {g.description}
                  </div>
                )}
              </div>
              <DeleteButton
                pending={isPending}
                onClick={() =>
                  startTransition(() => {
                    void deleteLongTermGoal(g.id);
                  })
                }
              />
            </div>
          ))}
        </div>

        {canAddLong && (
          <form action={ltAction} className="mt-5 space-y-3">
            <LabeledInput
              name="title"
              label="Title"
              placeholder="Ship a working MVP"
              required
              error={ltState.fieldErrors?.title}
            />
            <LabeledInput
              name="description"
              label="Description (optional)"
              placeholder="Why this matters"
            />
            {ltState.error && (
              <p className="text-xs text-blue-300">{ltState.error}</p>
            )}
            <SubmitButton label="Add long-term goal" />
          </form>
        )}
      </section>

      {/* Short-term goals */}
      <section>
        <h2 className="mb-3 text-xs uppercase tracking-widest text-gray-fade">
          Short-term goals ({shortTerm.length}/{maxShort})
        </h2>
        <div className="space-y-2">
          {shortTerm.map((g) => (
            <div
              key={g.id}
              className="flex items-start justify-between gap-4 border border-gray-soft px-4 py-3"
            >
              <div>
                <div className="text-sm text-blue-50">
                  {g.title}
                  <span className="ml-2 text-xs text-gray-fade">
                    {g.cycle_length_days}-day cycle
                  </span>
                </div>
                {g.description && (
                  <div className="mt-1 text-xs text-gray-fade">
                    {g.description}
                  </div>
                )}
              </div>
              <DeleteButton
                pending={isPending}
                onClick={() =>
                  startTransition(() => {
                    void deleteShortTermGoal(g.id);
                  })
                }
              />
            </div>
          ))}
        </div>

        {canAddShort && (
          <form action={stAction} className="mt-5 space-y-4">
            <LabeledInput
              name="title"
              label="Title"
              placeholder="Write for 30 min every morning"
              required
              error={stState.fieldErrors?.title}
            />
            <LabeledInput
              name="description"
              label="Description (optional)"
              placeholder="Approach, technique, etc."
            />

            {longTerm.length > 0 && (
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-fade">
                  Parent long-term goal (optional)
                </span>
                <select
                  name="parent_long_term_goal_id"
                  defaultValue=""
                  className="mt-1 block w-full rounded-none border-b border-gray-soft bg-transparent py-2 text-sm text-blue-50 outline-none focus:border-blue-400"
                >
                  <option value="" className="bg-ink-1">
                    None
                  </option>
                  {longTerm.map((g) => (
                    <option key={g.id} value={g.id} className="bg-ink-1">
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <fieldset>
              <span className="text-xs uppercase tracking-wider text-gray-fade">
                Cycle length
              </span>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {CYCLE_OPTIONS.map((opt) => {
                  const active = cycle === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`cursor-pointer border p-3 text-xs transition-colors ${
                        active
                          ? "border-blue-400 bg-blue-400/10"
                          : "border-gray-soft"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cycle_length_days"
                        value={opt.value}
                        checked={active}
                        onChange={() => setCycle(opt.value)}
                        className="sr-only"
                      />
                      <div
                        className={`text-sm ${
                          active ? "text-blue-100" : "text-blue-50"
                        }`}
                      >
                        {opt.title}
                      </div>
                      <div className="mt-1 text-[11px] text-gray-fade">
                        + {opt.pro}
                      </div>
                      <div className="text-[11px] text-gray-mid">
                        − {opt.con}
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {stState.error && (
              <p className="text-xs text-blue-300">{stState.error}</p>
            )}
            <SubmitButton label="Add short-term goal" />
          </form>
        )}
      </section>

      <div className="border-t border-gray-soft pt-6">
        <Button
          disabled={!canContinue}
          onClick={() => void finishGoals(nextHref)}
        >
          Continue
        </Button>
        {!canContinue && (
          <p className="mt-2 text-xs text-gray-mid">
            Add at least one long-term and one short-term goal to continue.
          </p>
        )}
      </div>
    </div>
  );
}
