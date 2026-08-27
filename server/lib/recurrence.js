function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addMonthClamped(anchorDate, monthsToAdd) {
  const anchor = new Date(anchorDate);
  const targetMonth = anchor.getUTCMonth() + monthsToAdd;
  const targetYear = anchor.getUTCFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(anchor.getUTCDate(), lastDayOfMonth(targetYear, normalizedMonth));

  return new Date(Date.UTC(
    targetYear,
    normalizedMonth,
    day,
    anchor.getUTCHours(),
    anchor.getUTCMinutes(),
    anchor.getUTCSeconds(),
    anchor.getUTCMilliseconds()
  ));
}

function generateMonthlyOccurrenceDates(series, fromIndex, horizonDate) {
  const occurrences = [];
  const endDate = series.end_date ? new Date(`${series.end_date}T23:59:59.999Z`) : null;
  const firstDate = new Date(series.first_scheduled_at);
  const limit = endDate && endDate < horizonDate ? endDate : horizonDate;
  let index = fromIndex;

  if (fromIndex === 0 && firstDate > limit) {
    return endDate && firstDate > endDate
      ? occurrences
      : [{ occurrence_index: 0, scheduled_at: firstDate }];
  }

  while (true) {
    const scheduledAt = addMonthClamped(series.first_scheduled_at, index);
    if (scheduledAt > limit) break;
    occurrences.push({ occurrence_index: index, scheduled_at: scheduledAt });
    index += 1;
  }

  return occurrences;
}

module.exports = { addMonthClamped, generateMonthlyOccurrenceDates };