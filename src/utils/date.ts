export function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}
