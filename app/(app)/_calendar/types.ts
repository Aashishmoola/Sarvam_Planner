// Shared shapes between the /day/[date] server page and the <DayView> client.

export type DayConfig = {
  sleep_start: string;
  sleep_end: string;
  timezone: string;
  max_productive_hours: number;
};

export type FocusPeriodRow = {
  id: string;
  label: string;
  color: string;
  start_time: string;
  end_time: string;
  intensity: "high" | "low";
  days_of_week: number[];
};

export type ShortTermGoalRow = {
  id: string;
  title: string;
  cycle_length_days: number;
  difficulty_level: number;
  status: string;
  retired_at: string | null;
  current_cycle_ends_on: string | null;
};

export type AssignmentStatus =
  | "pending"
  | "checked"
  | "crossed"
  | "auto_failed";

export type AssignmentRow = {
  id: string;
  short_term_goal_id: string;
  start_time: string;
  end_time: string;
  warning_off_focus: boolean;
  status: AssignmentStatus;
  resolved_at: string | null;
  effort_score: number | null;
  journal_mood: string | null;
  journal_technique_tweak: string | null;
  journal_notes: string | null;
  goal_title: string;
};

export type NonProductiveRow = {
  id: string;
  position: number;
  title: string;
  status: AssignmentStatus;
  resolved_at: string | null;
  journal_notes: string | null;
};

export type DayPlanRow = {
  id: string;
  date: string;
} | null;

export type DayData = {
  date: string;
  isToday: boolean;
  isPast: boolean;
  prevDate: string;
  nextDate: string | null;
  config: DayConfig;
  focusPeriods: FocusPeriodRow[];
  shortTermGoals: ShortTermGoalRow[];
  dayPlan: DayPlanRow;
  assignments: AssignmentRow[];
  nonProductive: NonProductiveRow[];
  mottos: string[];
  dayOfWeek: number;
  email: string | null;
};
