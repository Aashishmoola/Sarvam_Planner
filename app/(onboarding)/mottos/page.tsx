import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StepHeader } from "@/components/ui/step-header";
import { MottosForm } from "./mottos-form";

export default async function MottosPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from("mottos")
    .select("position, text")
    .eq("user_id", user!.id)
    .order("position");

  const initial: string[] = [0, 1, 2, 3, 4].map(
    (i) => existing?.find((m) => m.position === i)?.text ?? "",
  );

  return (
    <>
      <StepHeader
        step={5}
        total={5}
        title="Your mottos"
        subtitle="Five short lines to live up to. One appears on your morning check-in each day, in order."
      />
      <MottosForm initial={initial} nextHref="/today" />
    </>
  );
}
