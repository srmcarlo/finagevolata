const ONE_HOUR_SECONDS = 3600;
const SEVEN_DAYS_SECONDS = 7 * 86400;

export function computeLinkExpirySeconds(
  clickDayDate: Date | null,
  now: Date = new Date(),
): number {
  if (!clickDayDate) return SEVEN_DAYS_SECONDS;
  const targetMs = clickDayDate.getTime() + 86400 * 1000;
  const deltaSeconds = Math.floor((targetMs - now.getTime()) / 1000);
  if (deltaSeconds > SEVEN_DAYS_SECONDS) return SEVEN_DAYS_SECONDS;
  if (deltaSeconds < ONE_HOUR_SECONDS) return ONE_HOUR_SECONDS;
  return deltaSeconds;
}
