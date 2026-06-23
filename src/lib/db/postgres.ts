import pg from "pg";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __capsulePostgresPool: pg.Pool | undefined;
}

export const isPostgresConfigured = () => Boolean(process.env.DATABASE_URL);

export const getPostgresPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__capsulePostgresPool) {
    globalThis.__capsulePostgresPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  return globalThis.__capsulePostgresPool;
};
