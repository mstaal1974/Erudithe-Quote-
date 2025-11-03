export function addBusinessDays(startDate: Date, days: number): Date {
  const date = new Date(startDate.valueOf());
  let added = 0;
  // If the start date is on a weekend, move to the next Monday
  if (date.getDay() === 6) { // Saturday
    date.setDate(date.getDate() + 2);
  } else if (date.getDay() === 0) { // Sunday
    date.setDate(date.getDate() + 1);
  }

  while (added < days) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
      added++;
    }
  }
  return date;
}

export function subtractBusinessDays(endDate: Date, days: number): Date {
  const date = new Date(endDate.valueOf());
  let subtracted = 0;
  while (subtracted < days) {
    // Move to the previous day
    date.setDate(date.getDate() - 1);
    const dayOfWeek = date.getDay();
    // If it's a weekday, count it
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      subtracted++;
    }
  }
  return date;
}

export function getDaysBetween(startDate: Date, endDate: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    // Resetting time to midnight to count full days
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    return Math.round((end.getTime() - start.getTime()) / oneDay);
}