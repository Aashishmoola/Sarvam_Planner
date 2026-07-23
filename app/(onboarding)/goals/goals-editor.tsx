"use client";

import { useState, useTransition } from "react";
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
  // Long-term add form (controlled so we can clear it on success).
  const [ltTitle, setLtTitle] = useState("");
  const [ltDesc, setLtDesc] = useState("");
  const [ltState, setLtState] = useState<GoalsState>({});
  const [ltPending, setLtPending] = useState(false);

  // Short-term add form.
  const [stTitle, setStTitle] = useState("");
  const [stDesc, setStDesc] = useState("");
  const [stParent, setStParent] = useState("");
  const [cycle, setCycle] = useState<number>(14);
  const [stState, setStState] = useState<GoalsState>({});
  const [stPending, setStPending] = useState(false);

  const [isPending, startTransition] = useTransition();

  const canAddLong = longTerm.length < maxLong;
  const canAddShort = shortTerm.length < maxShort;
  const canContinue = longTerm.length > 0 && shortTerm.length > 0;

  async function handleAddLong(e: React.FormEvent) {
    e.preventDefault();
    setLtPending(true);
    try {
      const fd = new FormData();
      fd.set("title", ltTitle);
      fd.set("description", ltDesc);
      const s = await addLongTermGoal({}, fd);
      setLtState(s);
      if (!s.error) {
        setLtTitle("");
        setLtDesc("");
      }
    } finally {
      setLtPending(false);
    }
  }

  async function handleAddShort(e: React.FormEvent) {
    e.preventDefault();
    setStPending(true);
    try {
      const fd = new FormData();
      fd.set("title", stTitle);
      fd.set("description", stDesc);
      fd.set("cycle_length_days", String(cycle));
      fd.set("parent_long_term_goal_id", stParent || "");
      const s = await addShortTermGoal({}, fd);
      setStState(s);
      if (!s.error) {
        setStTitle("");
        setStDesc("");
        setStParent("");
      }
    } finally {
      setStPending(false);
    }
  }

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
          <form onSubmit={handleAddLong} className="mt-5 space-y-3">
            <LabeledInput
              label="Title"
              placeholder="Ship a working MVP"
              required
              value={ltTitle}
              onChange={(e) => setLtTitle(e.target.value)}
              error={ltState.fieldErrors?.title}
            />
            <LabeledInput
              label="Description (optional)"
              placeholder="Why this matters"
              value={ltDesc}
              onChange={(e) => setLtDesc(e.target.value)}
            />
            {ltState.error && (
              <p className="text-xs text-blue-300">{ltState.error}</p>
            )}
            <Button type="submit" disabled={ltPending}>
              {ltPending ? "Saving…" : "Add long-term goal"}
            </Button>
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
          <form onSubmit={handleAddShort} className="mt-5 space-y-4">
            <LabeledInput
              label="Title"
              placeholder="Write for 30 min every morning"
              required
              value={stTitle}
              onChange={(e) => setStTitle(e.target.value)}
              error={stState.fieldErrors?.title}
            />
            <LabeledInput
              label="Description (optional)"
              placeholder="Approach, technique, etc."
              value={stDesc}
              onChange={(e) => setStDesc(e.target.value)}
            />

            {longTerm.length > 0 && (
              <div>
                <span className="text-xs uppercase tracking-wider text-gray-fade">
                  Parent long-term goal (optional)
                </span>
                <select
                  value={stParent}
                  onChange={(e) => setStParent(e.target.value)}
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
            <Button type="submit" disabled={stPending}>
              {stPending ? "Saving…" : "Add short-term goal"}
            </Button>
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
