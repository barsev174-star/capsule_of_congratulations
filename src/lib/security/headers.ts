export type AppSecurityHeader = {
  key: string;
  value: string;
};

const contentSecurityPolicy = [
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self' https://auth.robokassa.ru"
].join("; ");

export const appSecurityHeaders: AppSecurityHeader[] = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains"
  }
];
