import { createHash } from "node:crypto";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};
type ConsumeRateLimitInput = {
  scope: string;
  clientKey: string;
  limit: number;
  windowMs: number;
  now?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

declare global {
  var __slovestoPublicRateLimits: Map<string, RateLimitBucket> | undefined;
  var __slovestoPublicRateLimitOperations: number | undefined;
}

const buckets = globalThis.__slovestoPublicRateLimits ?? new Map<string, RateLimitBucket>();
globalThis.__slovestoPublicRateLimits = buckets;

const safePositiveInteger = (value: number, fallback: number) =>
  Number.isSafeInteger(value) && value > 0 ? value : fallback;

const cleanupBuckets = (now: number) => {
  globalThis.__slovestoPublicRateLimitOperations = (globalThis.__slovestoPublicRateLimitOperations ?? 0) + 1;
  if (globalThis.__slovestoPublicRateLimitOperations % 250 !== 0 && buckets.size < 10_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= 10_000) return;
  const overflow = buckets.size - 10_000;
  [...buckets.entries()]
    .sort((left, right) => left[1].resetAt - right[1].resetAt)
    .slice(0, overflow)
    .forEach(([key]) => buckets.delete(key));
};

const normalizedForwardedAddress = (headers: Headers) => {
  const forwarded = headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return forwarded?.at(-1) || headers.get("x-real-ip")?.trim() || "unknown-client";
};

export const getPublicClientKey = (headers: Headers) => createHash("sha256")
  .update(normalizedForwardedAddress(headers))
  .digest("hex")
  .slice(0, 24);

export const consumePublicRateLimit = (input: ConsumeRateLimitInput): RateLimitResult => {
  const now = input.now ?? Date.now();
  const limit = safePositiveInteger(input.limit, 1);
  const windowMs = safePositiveInteger(input.windowMs, 60_000);
  cleanupBuckets(now);

  const key = `${input.scope}:${input.clientKey}`;
  const existing = buckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : existing;

  bucket.count += 1;
  buckets.set(key, bucket);
  const allowed = bucket.count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt
  };
};

export const getConfiguredRateLimit = (name: string, fallback: number) => {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return safePositiveInteger(parsed, fallback);
};

export const rateLimitHeaders = (result: RateLimitResult) => ({
  "X-RateLimit-Limit": String(result.limit),
  "X-RateLimit-Remaining": String(result.remaining),
  ...(result.allowed ? {} : { "Retry-After": String(result.retryAfterSeconds) })
});

export const resetPublicRateLimitsForTests = () => {
  buckets.clear();
  globalThis.__slovestoPublicRateLimitOperations = 0;
};
