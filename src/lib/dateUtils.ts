/** Local calendar date key (YYYY-MM-DD) consistent with `getToday()`. */
export function dateToLocalKey(d: Date): string {
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

export function getToday(): string {
  return dateToLocalKey(new Date());
}
