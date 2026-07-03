const NGT_LOCALE = 'en-NG';
const NGT_TIMEZONE = 'Africa/Lagos';

export function formatNGT(ts: number | undefined | null): string {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString(NGT_LOCALE, {
    timeZone: NGT_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatNGTDate(ts: number | undefined | null): string {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleDateString(NGT_LOCALE, {
    timeZone: NGT_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
