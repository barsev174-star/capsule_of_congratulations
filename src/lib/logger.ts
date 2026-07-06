type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LogEntry = {
  level: LogLevel;
  event: string;
  message: string;
  context?: LogContext;
  timestamp: string;
};

const serializeLogEntry = (entry: LogEntry) => JSON.stringify(entry);

const sensitiveKeyPattern = /(email|token|secret|password|accessurl|manageurl|message|content|prompt|response|recipientname|authorname|detail|^error$)/i;
const maxStringLength = 300;

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (depth > 3) return "[truncated]";
  if (value instanceof Error) return { name: value.name, message: value.message.slice(0, maxStringLength) };
  if (typeof value === "string") return value.slice(0, maxStringLength);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object" && value) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !sensitiveKeyPattern.test(key))
        .map(([key, item]) => [key, sanitizeValue(item, depth + 1)])
    );
  }
  return undefined;
};

export const sanitizeLogContext = (context?: LogContext): LogContext | undefined =>
  context ? (sanitizeValue(context) as LogContext) : undefined;

export const createLogEntry = (
  level: LogLevel,
  event: string,
  message: string,
  context?: LogContext
): LogEntry => ({
  level,
  event,
  message,
  context: sanitizeLogContext(context),
  timestamp: new Date().toISOString()
});

export const log = (level: LogLevel, event: string, message: string, context?: LogContext) => {
  const entry = createLogEntry(level, event, message, context);
  const payload = serializeLogEntry(entry);

  if (level === "error") {
    console.error(payload);
    return entry;
  }

  if (level === "warn") {
    console.warn(payload);
    return entry;
  }

  console.info(payload);
  return entry;
};

export const logger = {
  info: (event: string, message: string, context?: LogContext) => log("info", event, message, context),
  warn: (event: string, message: string, context?: LogContext) => log("warn", event, message, context),
  error: (event: string, message: string, context?: LogContext) => log("error", event, message, context)
};
