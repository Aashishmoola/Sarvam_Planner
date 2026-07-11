import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepHeader } from "@/components/ui/step-header";

export default function WelcomePage() {
  return (
    <>
      <StepHeader
        step={1}
        total={5}
        title="Welcome."
        subtitle="Five short steps. Then one nudge a day is all it takes."
      />
      <div className="space-y-4 text-sm leading-6 text-gray-fade">
        <p>
          Sarvam Planner is built for people who are anxious about their goals
          and honest about their conscientiousness. You will set:
        </p>
        <ol className="space-y-1 pl-5 [&>li]:list-decimal">
          <li>Your limits — how much you can plan for right now.</li>
          <li>Your focus hours — when you work well and when you don&apos;t.</li>
          <li>Your goals — up to three long-term and three short-term.</li>
          <li>Five mottos — one to greet you each morning.</li>
        </ol>
        <p>
          Defaults are deliberately low. The app raises the ceiling only after
          you&apos;ve earned it.
        </p>
      </div>
      <div className="mt-12">
        <Link href="/limits">
          <Button>Begin</Button>
        </Link>
      </div>
    </>
  );
}
