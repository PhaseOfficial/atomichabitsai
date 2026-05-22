import { useData } from "@/src/hooks/useData";
import { useMemo } from "react";

interface HabitRecord {
  title: string;
  current_streak: number;
  two_minute_version: string;
}

export function useHabitSummary(userId: string) {
  const { data: habits = [] } = useData<HabitRecord>(
    "SELECT title, current_streak, two_minute_version FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)",
    [userId],
  );

  const habitContext = useMemo(() => {
    if (habits.length === 0) {
      return "User has no active habits yet.";
    }

    return (
      "Current Habits:\n" +
      habits
        .map(
          (habit) =>
            `- ${habit.title} (Streak: ${habit.current_streak}, 2-min: ${habit.two_minute_version})`,
        )
        .join("\n")
    );
  }, [habits]);

  return { habitContext };
}
