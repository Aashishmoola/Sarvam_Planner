"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { saveMottos, type MottosState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Finish"}
    </Button>
  );
}

export function MottosForm({
  initial,
  nextHref,
}: {
  initial: string[];
  nextHref: string;
}) {
  const bound = saveMottos.bind(null, nextHref);
  const [state, formAction] = useFormState<MottosState, FormData>(bound, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {initial.map((val, i) => (
        <LabeledInput
          key={i}
          name={`motto_${i}`}
          label={`Motto ${i + 1}`}
          defaultValue={val}
          placeholder="Show up, even quietly."
          maxLength={200}
          required
          error={fe[`motto_${i}`]}
        />
      ))}
      {state.error && (
        <p className="text-xs text-blue-300">{state.error}</p>
      )}
      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
