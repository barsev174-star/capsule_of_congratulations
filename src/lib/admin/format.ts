export type AdminPeriod = 7 | 30 | 90 | null;
export const parsePeriod = (value?: string): AdminPeriod => value === "all" ? null : value === "30" ? 30 : value === "90" ? 90 : 7;
export const parsePage = (value?: string) => { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 100000) : 1; };
export const parseFilterDate = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : undefined;
export const formatMoney = (kopecks: number, currency = "RUB", maximumFractionDigits = 2) => new Intl.NumberFormat("ru-RU", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits }).format(kopecks / 100);
export const formatAdminDate = (value: string | Date | null | undefined, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Yekaterinburg", day: "2-digit", month: "2-digit", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } as const : {}) }).format(date);
};
export const comparePeriod = (current: number, previous: number | null) => previous === null ? "За всё время" : previous === 0 ? (current === 0 ? "Без изменений к предыдущему периоду" : `Предыдущий период: ${previous}`) : `${current >= previous ? "+" : ""}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format((current - previous) / Math.abs(previous) * 100)}% к предыдущему периоду`;
