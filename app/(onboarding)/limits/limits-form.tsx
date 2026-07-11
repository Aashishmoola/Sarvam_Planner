"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { saveLimits, type LimitsState } from "./actions";

type Initial = {
  max_long_goals: number;
  max_short_goals: number;
  max_productive_hours: number;
  sleep_start: string;
  sleep_end: string;
  morning_push_at: string;
  timezone: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function LimitsForm({
  initial,
  nextHref,
}: {
  initial: Initial;
  nextHref: string;
}) {
  const [tz, setTz] = useState(initial.timezone);
  const bound = saveLimits.bind(null, nextHref);
  const [state, formAction] = useFormState<LimitsState, FormData>(bound, {});

  useEffect(() => {
    if (initial.timezone === "UTC") {
      try {
        const guessed = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (guessed) setTz(guessed);
      } catch {
        /* ignore */
      }
    }
  }, [initial.timezone]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <LabeledInput
        name="max_long_goals"
        label="Max long-term goals"
        type="number"
        min={1}
        max={3}
        defaultValue={initial.max_long_goals}
        hint="Up to 3. Active until you complete them."
        error={fe.max_long_goals}
      />
      <LabeledInput
        name="max_short_goals"
        label="Max short-term goals"
        type="number"
        min={1}
        max={3}
        defaultValue={initial.max_short_goals}
        hint="1 is the recommended start. The engine may offer to raise this after two full completed cycles."
        error={fe.max_short_goals}
      />
      <LabeledInput
        name="max_productive_hours"
        label="Productive hours per day"
        type="number"
        min={1}
        max={12}
        defaultValue={initial.max_productive_hours}
        hint="The upper bound on time you'll assign to short-term goals in a day."
        error={fe.max_productive_hours}
      />
      <div className="grid grid-cols-2 gap-4">
        <LabeledInput
          name="sleep_start"
          label="Sleep starts"
          type="time"
          defaultValue={initial.sleep_start}
          error={fe.sleep_start}
        />
        <LabeledInput
          name="sleep_end"
          label="Sleep ends"
          type="time"
          defaultValue={initial.sleep_end}
          error={fe.sleep_end}
        />
      </div>
      <LabeledInput
        name="morning_push_at"
        label="Morning nudge time"
        type="time"
        defaultValue={initial.morning_push_at}
        hint="When the daily check-in push arrives on Chrome (Phase D)."
        error={fe.morning_push_at}
      />
      <LabeledInput
        name="timezone"
        label="Timezone (IANA)"
        value={tz}
        onChange={(e) => setTz(e.target.value)}
        hint="Auto-detected. Change only if wrong."
        error={fe.timezone}
      />

      {state.error && (
        <p className="text-xs text-blue-300">{state.error}</p>
      )}
      <div className="pt-2">
        <SubmitButton label="Continue" />
      </div>
    </form>
  );
}
