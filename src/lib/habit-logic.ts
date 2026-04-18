import { getDb } from '../db/database';

export interface HabitStreakInfo {
  currentStreak: number;
  maxStreak: number;
  isDoneToday: boolean;
  lastLoggedDate: string | null;
}

/**
 * Helper to get local YYYY-MM-DD string
 */
function getLocalDayString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to check if a local date string is a weekend
 */
function isWeekend(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
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

  // Normalize dates to local YYYY-MM-DD and sort descending
  const uniqueDates = [...new Set(logDates.map(d => {
    // Handle ISO (T) or SQLite (space) format
    const datePart = d.split(/[T ]/)[0]; 
    if (d.includes('T') || d.includes(':')) {
      // If it looks like a full timestamp, we treat it as UTC and convert to LOCAL YYYY-MM-DD
      const dateObj = new Date(d.replace(' ', 'T'));
      if (!isNaN(dateObj.getTime())) {
        return getLocalDayString(dateObj);
      }
    }
    return datePart; // Fallback to the date part
  }))].sort((a, b) => b.localeCompare(a));
  
  const todayStr = getLocalDayString();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDayString(yesterdayDate);

  const isDoneToday = uniqueDates.includes(todayStr);
  const lastLoggedDate = uniqueDates[0];

  // Calculate Current Streak
  let currentStreak = 0;
  
  // Start checking from today (if done) or the last log date (if not done)
  let checkDateStr = isDoneToday ? todayStr : uniqueDates[0];
  
  // If not done today, check if the streak is already broken
  if (!isDoneToday) {
    let gapDate = new Date();
    gapDate.setDate(gapDate.getDate() - 1);
    
    // Move back through weekends if flexibility is on
    while (weekendFlexibility && isWeekend(getLocalDayString(gapDate))) {
      gapDate.setDate(gapDate.getDate() - 1);
    }
    
    const latestAllowedDate = getLocalDayString(gapDate);
    if (uniqueDates[0] < latestAllowedDate) {
      // Streak is broken
      currentStreak = 0;
      checkDateStr = null;
    }
  }

  if (checkDateStr) {
    let curr = new Date(); // Start from today
    // If we're starting from a previous log, sync curr to that
    if (!isDoneToday) {
      const [y, m, d] = uniqueDates[0].split('-').map(Number);
      curr = new Date(y, m - 1, d);
    }
    
    let logPtr = 0;
    // Fast forward logPtr to match checkDateStr
    while (logPtr < uniqueDates.length && uniqueDates[logPtr] > checkDateStr) {
      logPtr++;
    }

    while (logPtr < uniqueDates.length) {
      const currDateStr = getLocalDayString(curr);
      const logDateStr = uniqueDates[logPtr];

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
  
  // To calculate max streak, we iterate from the earliest log to the latest
  const earliestDateParts = uniqueDates[uniqueDates.length - 1].split('-').map(Number);
  let curr = new Date(earliestDateParts[0], earliestDateParts[1] - 1, earliestDateParts[2]);
  
  const latestDateParts = uniqueDates[0].split('-').map(Number);
  const lastDate = new Date(latestDateParts[0], latestDateParts[1] - 1, latestDateParts[2]);

  let logPtr = uniqueDates.length - 1;
  while (curr <= lastDate) {
    const currDateStr = getLocalDayString(curr);
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
  
  const habit = await db.getFirstAsync<{weekend_flexibility: number}>(
    'SELECT weekend_flexibility FROM habits WHERE id = ?', 
    [habitId]
  );
  if (!habit) return;

  const logs = await db.getAllAsync<{logged_at: string}>(
    'SELECT logged_at FROM logs WHERE habit_id = ? ORDER BY logged_at DESC',
    [habitId]
  );

  const streakInfo = calculateStreak(
    logs.map(l => l.logged_at),
    habit.weekend_flexibility === 1
  );

  await db.runAsync(
    'UPDATE habits SET current_streak = ?, max_streak = ?, updated_at = ? WHERE id = ?',
    [streakInfo.currentStreak, streakInfo.maxStreak, new Date().toISOString(), habitId]
  );
}

/**
 * Recalculates streaks for all active habits
 */
export async function recalculateAllStreaks(userId: string = 'guest') {
  const db = await getDb();
  const habits = await db.getAllAsync<{id: string}>(
    'SELECT id FROM habits WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)',
    [userId]
  );

  for (const habit of habits) {
    await updateHabitStreak(habit.id);
  }
}
