const padDatePart = (value: number) => String(value).padStart(2, "0");

/**
 * PostgreSQL `date` values are calendar dates, not moments in time. The pg
 * driver may expose them as a Date at local midnight, so converting through
 * toISOString() can move the value to the previous UTC day.
 */
export const serializeDateOnly = (value: Date | string) => {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate())
  ].join("-");
};
