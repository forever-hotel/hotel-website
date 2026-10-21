export function validStay(from: string, to: string, guests: number): boolean {
  const date = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const nights = (Date.parse(to) - Date.parse(from)) / 86400000;
  return (
    date(from) &&
    date(to) &&
    nights >= 1 &&
    nights <= 90 &&
    Number.isInteger(guests) &&
    guests > 0
  );
}

export function availabilityCount(data: unknown): number {
  if (
    !data ||
    typeof data !== 'object' ||
    !('availableCount' in data) ||
    !Number.isSafeInteger(data.availableCount) ||
    Number(data.availableCount) < 0
  )
    throw new Error('Invalid availability response');
  return Number(data.availableCount);
}

export function monthDates(month: string): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const first = new Date(`${month}-01T00:00:00Z`);
  const dates: string[] = [];
  for (
    let day = new Date(first);
    day.getUTCMonth() === first.getUTCMonth();
    day = new Date(day.getTime() + 86400000)
  )
    dates.push(day.toISOString().slice(0, 10));
  return dates;
}

export function hotelMonth(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`;
}
