import { getDb } from '../db/database';

export interface HabitStreakInfo {
  currentStreak: number;
  maxStreak: number;
  isDoneToday: boolean;
  lastLoggedDate: string | null;
}

/**
 * Calculates streak info for a habit based on its logs
 */
export function calculateStreak(
  logDates: string[], 
  weekendFlexibility: boolean = false
): HabitStreakInfo {
  if (logDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0, isDoneToday: false, lastLoggedDate: null };
  }

  // Normalize dates to YYYY-MM-DD and sort descending
  const uniqueDates = [...new Set(logDates.map(d => d.split('T')[0]))].sort((a, b) => b.localeCompare(a));
  
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const isDoneToday = uniqueDates.includes(todayStr);
  const lastLoggedDate = uniqueDates[0];

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  // Calculate Current Streak
  let currentStreak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  // If not done today, start checking from yesterday
  if (!isDoneToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let dateIdx = isDoneToday ? 0 : (uniqueDates[0] === yesterdayStr ? 0 : -1);
  
  // If the last log is older than yesterday, the streak might be broken
  if (!isDoneToday && uniqueDates[0] !== yesterdayStr) {
    if (weekendFlexibility) {
      // Check if all days between last log and today were weekends
      let tempDate = new Date();
      tempDate.setDate(tempDate.getDate() - 1);
      let broken = false;
      while (tempDate.toISOString().split('T')[0] > uniqueDates[0]) {
        if (!isWeekend(tempDate.toISOString().split('T')[0])) {
          broken = true;
          break;
        }
        tempDate.setDate(tempDate.getDate() - 1);
      }
      if (broken) {
        currentStreak = 0;
      } else {
        // Not broken, but we start counting from the last log
        dateIdx = 0;
      }
    } else {
      currentStreak = 0;
    }
  }

  if (dateIdx !== -1) {
    let curr = isDoneToday ? new Date() : new Date(uniqueDates[0]);
    curr.setHours(0, 0, 0, 0);
    
    let logPtr = 0;
    while (logPtr < uniqueDates.length) {
      const logDateStr = uniqueDates[logPtr];
      const currDateStr = curr.toISOString().split('T')[0];

      if (logDateStr === currDateStr) {
        currentStreak++;
        logPtr++;
        curr.setDate(curr.getDate() - 1);
      } else if (weekendFlexibility && isWeekend(currDateStr)) {
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate Max Streak
  let maxStreak = 0;
  let tempStreak = 0;
  let curr = new Date(uniqueDates[uniqueDates.length - 1]);
  curr.setHours(0, 0, 0, 0);
  
  const lastDate = new Date(uniqueDates[0]);
  lastDate.setHours(0, 0, 0, 0);

  let logPtr = uniqueDates.length - 1;
  while (curr <= lastDate) {
    const currDateStr = curr.toISOString().split('T')[0];
    const logDateStr = uniqueDates[logPtr];

    if (logDateStr === currDateStr) {
      tempStreak++;
      logPtr--;
      maxStreak = Math.max(maxStreak, tempStreak);
      curr.setDate(curr.getDate() + 1);
    } else if (weekendFlexibility && isWeekend(currDateStr)) {
      curr.setDate(curr.getDate() + 1);
    } else {
      tempStreak = 0;
      curr.setDate(curr.getDate() + 1);
    }
  }

  return {
    currentStreak,
    maxStreak,
    isDoneToday,
    lastLoggedDate
  };
}

/**
 * Updates the streak counts for a specific habit in the database
 */
export async function updateHabitStreak(habitId: string) {
  const db = await getDb();
  
  // 1. Get habit info
  const habit = await db.getFirstAsync<{weekend_flexibility: number}>(
    'SELECT weekend_flexibility FROM habits WHERE id = ?', 
    [habitId]
  );
  if (!habit) return;

  // 2. Get all logs for this habit
  const logs = await db.getAllAsync<{logged_at: string}>(
    'SELECT logged_at FROM logs WHERE habit_id = ? ORDER BY logged_at DESC',
    [habitId]
  );

  // 3. Calculate new streak
  const streakInfo = calculateStreak(
    logs.map(l => l.logged_at),
    habit.weekend_flexibility === 1
  );

  // 4. Update habit record
  await db.runAsync(
    'UPDATE habits SET current_streak = ?, max_streak = ?, updated_at = ? WHERE id = ?',
    [streakInfo.currentStreak, streakInfo.maxStreak, new Date().toISOString(), habitId]
  );
}
