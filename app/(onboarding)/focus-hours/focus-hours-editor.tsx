"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import {
  addFocusPeriod,
  deleteFocusPeriod,
  finishFocusHours,
  type FocusPeriodsState,
} from "./actions";

type Period = {
  id: string;
  label: string;
  color: string;
  start_time: string;
  end_time: string;
  intensity: "high" | "low";
  days_of_week: number[];
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function DayToggles({
  name,
  initial,
}: {
  name: string;
  initial: number[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(initial));
  return (
    <div>
      <span className="text-xs uppercase tracking-wider text-gray-fade">
        Days
      </span>
      <div className="mt-2 flex gap-1">
        {DAY_LABELS.map((lbl, i) => {
          const on = selected.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const next = new Set(selected);
                if (on) next.delete(i);
                else next.add(i);
                setSelected(next);
              }}
              className={`tap-target flex-1 border py-2 text-xs transition-colors ${
                on
                  ? "border-blue-400 bg-blue-400/10 text-blue-100"
                  : "border-gray-soft text-gray-fade"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
      {Array.from(selected).map((d) => (
        <input key={d} type="hidden" name={name} value={d} />
      ))}
    </div>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add period"}
    </Button>
  );
}

export function FocusHoursEditor({
  periods,
  nextHref,
}: {
  periods: Period[];
  nextHref: string;
}) {
  const [state, formAction] = useFormState<FocusPeriodsState, FormData>(
    addFocusPeriod,
    {},
  );
  const [isPending, startTransition] = useTransition();
  const fe = state.fieldErrors ?? {};

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        {periods.length === 0 && (
          <p className="text-xs text-gray-mid">
            No periods yet. Add at least one high-focus window below.
          </p>
        )}
        {periods.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between border border-gray-soft px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="h-3 w-3"
                style={{ backgroundColor: p.color }}
              />
              <div>
                <div className="text-sm text-blue-50">
                  {p.label}
                  <span className="ml-2 text-xs text-gray-fade">
                    {p.start_time.slice(0, 5)}–{p.end_time.slice(0, 5)} ·{" "}
                    {p.intensity === "high" ? "High focus" : "Low focus"}
                  </span>
                </div>
                <div className="mt-0.5 flex gap-1 text-[10px] uppercase text-gray-mid">
                  {DAY_LABELS.map((lbl, i) => (
                    <span
                      key={i}
                      className={
                        p.days_of_week.includes(i)
                          ? "text-blue-300"
                          : "opacity-30"
                      }
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(() => {
                  void deleteFocusPeriod(p.id);
                })
              }
              className="tap-target text-xs uppercase tracking-wider text-gray-fade hover:text-blue-200 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest text-gray-fade">
          Add a period
        </h2>
        <form action={formAction} className="space-y-4">
          <LabeledInput
            name="label"
            label="Label"
            placeholder="Deep morning"
            required
            error={fe.label}
          />
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              name="start_time"
              label="Start"
              type="time"
              required
              defaultValue="09:00"
              error={fe.start_time}
            />
            <LabeledInput
              name="end_time"
              label="End"
              type="time"
              required
              defaultValue="11:00"
              error={fe.end_time}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-fade">
                Intensity
              </span>
              <select
                name="intensity"
                defaultValue="high"
                className="mt-1 block w-full rounded-none border-b border-gray-soft bg-transparent py-2 text-sm text-blue-50 outline-none focus:border-blue-400"
              >
                <option value="high" className="bg-ink-1">High focus</option>
                <option value="low" className="bg-ink-1">Low focus</option>
              </select>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-fade">
                Color
              </span>
              <input
                name="color"
                type="color"
                defaultValue="#4d84ff"
                className="mt-1 block h-10 w-full cursor-pointer border-none bg-transparent p-0"
              />
            </div>
          </div>
          <DayToggles name="days_of_week" initial={[1, 2, 3, 4, 5]} />

          {state.error && (
            <p className="text-xs text-blue-300">{state.error}</p>
          )}
          <div className="pt-2">
            <AddButton />
          </div>
        </form>
      </section>

      <div className="border-t border-gray-soft pt-6">
        <Button
          variant="primary"
          disabled={periods.length === 0}
          onClick={() => void finishFocusHours(nextHref)}
        >
          Continue
        </Button>
        {periods.length === 0 && (
          <p className="mt-2 text-xs text-gray-mid">
            Add at least one focus period to continue.
          </p>
        )}
      </div>
    </div>
  );
}
