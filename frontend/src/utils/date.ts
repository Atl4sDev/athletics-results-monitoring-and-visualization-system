/** Parses an ISO 8601 datetime string. Used for competition dates and athlete `birthDate` from public endpoints. */
export function parseISODate(iso: string): Date {
  return new Date(iso)
}

/** Parses the `DD.MM.YYYY` format returned by the admin athlete endpoints for `birthDate`. */
export function parseDDMMYYYY(s: string): Date {
  const [day, month, year] = s.split('.')
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Formats a competition date range as a human-readable string.
 * Collapses to a single date for same-day events, omits the month for
 * same-month ranges: `"01–03.06.2025"`, or `"30.06–02.07.2025"` across months.
 */
export function formatDateRange(start: string, end: string): string {
  const s = parseISODate(start)
  const e = parseISODate(end)
  const sDay = String(s.getDate()).padStart(2, '0')
  const sMonth = String(s.getMonth() + 1).padStart(2, '0')
  const eDay = String(e.getDate()).padStart(2, '0')
  const eMonth = String(e.getMonth() + 1).padStart(2, '0')
  const year = e.getFullYear()
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()) {
    return `${sDay}.${sMonth}.${year}`
  }
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${sDay}–${eDay}.${eMonth}.${year}`
  }
  return `${sDay}.${sMonth}–${eDay}.${eMonth}.${year}`
}

/**
 * Formats a `YYYY-MM-DD` schedule key as `DD.MM` for day tabs.
 * Appends `T00:00:00` before parsing to prevent the browser from interpreting
 * the date as UTC midnight and potentially shifting it to the previous day.
 */
export function formatDayTab(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}
