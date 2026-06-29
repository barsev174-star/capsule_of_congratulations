import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getPostgresPool, isPostgresConfigured } from "@/lib/db/postgres";
import type { CardDraft } from "@/lib/cards/types";
import type { OccasionId } from "@/lib/cards/templates";
import type {
  AdminUser,
  AdminUserRole,
  AdminUserWithCredentials,
  PaymentOrder,
  PaymentOrderStatus,
  TemplateOverride
} from "./types";

const dataDir = join(process.cwd(), "data");
const paymentOrdersFilePath = join(dataDir, "payment-orders.json");
const templateOverridesFilePath = join(dataDir, "template-overrides.json");
const adminUsersFilePath = join(dataDir, "admin-users.json");

const ensureJsonFile = async (filePath: string) => {
  await mkdir(dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
};

const readJsonFile = async <T>(filePath: string): Promise<T[]> => {
  await ensureJsonFile(filePath);

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const writeJsonFile = async <T>(filePath: string, items: T[]) => {
  await ensureJsonFile(filePath);
  await writeFile(filePath, JSON.stringify(items, null, 2), "utf8");
};

const toIso = (value: Date | string) => (value instanceof Date ? value.toISOString() : value);

// Payment orders

type PaymentOrderRow = {
  id: string;
  card_id: string;
  amount: number;
  currency: string;
  status: PaymentOrderStatus;
  provider: string | null;
  provider_order_id: string | null;
  paid_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

const mapPaymentOrder = (row: PaymentOrderRow): PaymentOrder => ({
  id: row.id,
  cardId: row.card_id,
  amount: row.amount,
  currency: row.currency,
  status: row.status,
  provider: row.provider,
  providerOrderId: row.provider_order_id,
  paidAt: row.paid_at ? toIso(row.paid_at) : null,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export type ListPaymentOrdersOptions = {
  status?: PaymentOrderStatus | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export const listPaymentOrders = async (
  options: ListPaymentOrdersOptions = {}
): Promise<(PaymentOrder & { recipientName: string; organizerEmail: string })[]> => {
  const { status, search, limit = 50, offset = 0 } = options;

  if (isPostgresConfigured()) {
    const conditions: string[] = [];
    const params: (string | PaymentOrderStatus | number)[] = [];

    if (status) {
      conditions.push(`po.status = $${params.length + 1}`);
      params.push(status);
    }

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(`(
        LOWER(c.recipient_name) LIKE $${params.length + 1}
        OR LOWER(c.organizer_email) LIKE $${params.length + 1}
      )`);
      params.push(term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT
        po.id,
        po.card_id,
        po.amount,
        po.currency,
        po.status,
        po.provider,
        po.provider_order_id,
        po.paid_at,
        po.created_at,
        po.updated_at,
        c.recipient_name AS "recipientName",
        c.organizer_email AS "organizerEmail"
      FROM payment_orders po
      JOIN cards c ON c.id = po.card_id
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const result = await getPostgresPool().query<PaymentOrderRow & { recipientName: string; organizerEmail: string }>(
      query,
      params
    );

    return result.rows.map((row) => ({
      ...mapPaymentOrder(row),
      recipientName: row.recipientName,
      organizerEmail: row.organizerEmail
    }));
  }

  const [orders, cards] = await Promise.all([
    readJsonFile<PaymentOrder>(paymentOrdersFilePath),
    readJsonFile<CardDraft>(join(dataDir, "cards.json"))
  ]);

  const cardById = new Map(cards.map((card) => [card.id, card]));

  let items = orders
    .map((order) => {
      const card = cardById.get(order.cardId);
      return {
        ...order,
        recipientName: card?.recipientName ?? "—",
        organizerEmail: card?.organizerEmail ?? ""
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  if (status) {
    items = items.filter((item) => item.status === status);
  }

  if (search?.trim()) {
    const normalized = search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.recipientName.toLowerCase().includes(normalized) ||
        item.organizerEmail.toLowerCase().includes(normalized)
    );
  }

  return items.slice(offset, offset + limit);
};

export const getPaymentOrderById = async (orderId: string): Promise<(PaymentOrder & { recipientName: string }) | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<PaymentOrderRow & { recipient_name: string }>(
      `
        SELECT po.*, c.recipient_name
        FROM payment_orders po
        JOIN cards c ON c.id = po.card_id
        WHERE po.id = $1
        LIMIT 1
      `,
      [orderId]
    );

    const row = result.rows[0];
    return row ? { ...mapPaymentOrder(row), recipientName: row.recipient_name } : null;
  }

  const orders = await readJsonFile<PaymentOrder>(paymentOrdersFilePath);
  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    return null;
  }

  const cards = await readJsonFile<CardDraft>(join(dataDir, "cards.json"));
  const card = cards.find((item) => item.id === order.cardId);

  return { ...order, recipientName: card?.recipientName ?? "—" };
};

export const createPaymentOrder = async (input: { cardId: string; amount: number }): Promise<PaymentOrder> => {
  const now = new Date().toISOString();
  const order: PaymentOrder = {
    id: randomUUID(),
    cardId: input.cardId,
    amount: input.amount,
    currency: "RUB",
    status: "pending",
    provider: null,
    providerOrderId: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now
  };

  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `
        INSERT INTO payment_orders (
          id, card_id, amount, currency, status, provider, provider_order_id, paid_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        order.id,
        order.cardId,
        order.amount,
        order.currency,
        order.status,
        order.provider,
        order.providerOrderId,
        order.paidAt,
        order.createdAt,
        order.updatedAt
      ]
    );

    return order;
  }

  const orders = await readJsonFile<PaymentOrder>(paymentOrdersFilePath);
  orders.push(order);
  await writeJsonFile(paymentOrdersFilePath, orders);

  return order;
};

export const updatePaymentOrderStatus = async (
  orderId: string,
  status: PaymentOrderStatus
): Promise<PaymentOrder | null> => {
  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<PaymentOrderRow>(
      `
        UPDATE payment_orders
        SET status = $2,
            paid_at = CASE WHEN $2 = 'paid' AND paid_at IS NULL THEN now() ELSE paid_at END,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [orderId, status]
    );

    return result.rows[0] ? mapPaymentOrder(result.rows[0]) : null;
  }

  const orders = await readJsonFile<PaymentOrder>(paymentOrdersFilePath);
  const index = orders.findIndex((item) => item.id === orderId);

  if (index === -1) {
    return null;
  }

  const paidAt = status === "paid" && !orders[index].paidAt ? now : orders[index].paidAt;
  const updated = { ...orders[index], status, paidAt, updatedAt: now };
  orders[index] = updated;
  await writeJsonFile(paymentOrdersFilePath, orders);

  return updated;
};

// Template overrides

type TemplateOverrideRow = {
  id: string;
  name: string | null;
  description: string | null;
  accent: string | null;
  recommended_for: OccasionId[] | null;
  is_active: boolean;
  updated_at: Date | string;
};

const mapTemplateOverride = (row: TemplateOverrideRow): TemplateOverride => ({
  id: row.id,
  name: row.name,
  description: row.description,
  accent: row.accent,
  recommendedFor: row.recommended_for,
  isActive: row.is_active,
  updatedAt: toIso(row.updated_at)
});

export const listTemplateOverrides = async (): Promise<TemplateOverride[]> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<TemplateOverrideRow>(
      "SELECT * FROM template_overrides ORDER BY id"
    );
    return result.rows.map(mapTemplateOverride);
  }

  return readJsonFile<TemplateOverride>(templateOverridesFilePath);
};

export const getTemplateOverrideById = async (id: string): Promise<TemplateOverride | null> => {
  const overrides = await listTemplateOverrides();
  return overrides.find((item) => item.id === id) ?? null;
};

export const upsertTemplateOverride = async (override: TemplateOverride): Promise<TemplateOverride> => {
  const now = new Date().toISOString();
  const nextOverride: TemplateOverride = {
    ...override,
    updatedAt: now
  };

  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `
        INSERT INTO template_overrides (id, name, description, accent, recommended_for, is_active, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            accent = EXCLUDED.accent,
            recommended_for = EXCLUDED.recommended_for,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at
      `,
      [
        nextOverride.id,
        nextOverride.name,
        nextOverride.description,
        nextOverride.accent,
        JSON.stringify(nextOverride.recommendedFor),
        nextOverride.isActive,
        nextOverride.updatedAt
      ]
    );

    return nextOverride;
  }

  const overrides = await readJsonFile<TemplateOverride>(templateOverridesFilePath);
  const index = overrides.findIndex((item) => item.id === nextOverride.id);

  if (index === -1) {
    overrides.push(nextOverride);
  } else {
    overrides[index] = nextOverride;
  }

  await writeJsonFile(templateOverridesFilePath, overrides);
  return nextOverride;
};

export const toggleTemplateOverride = async (id: string, isActive: boolean): Promise<TemplateOverride | null> => {
  const existing = await getTemplateOverrideById(id);

  if (!existing) {
    return upsertTemplateOverride({
      id,
      name: null,
      description: null,
      accent: null,
      recommendedFor: null,
      isActive,
      updatedAt: new Date().toISOString()
    });
  }

  return upsertTemplateOverride({ ...existing, isActive });
};

// Admin users

type AdminUserRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: AdminUserRole;
  created_at: Date | string;
  updated_at: Date | string;
};

const mapAdminUser = (row: AdminUserRow): AdminUserWithCredentials => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  passwordSalt: row.password_salt,
  role: row.role,
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at)
});

export const listAdminUsers = async (): Promise<AdminUser[]> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<AdminUserRow>(
      "SELECT * FROM admin_users ORDER BY created_at DESC"
    );
    return result.rows.map(mapAdminUser);
  }

  const users = await readJsonFile<AdminUserWithCredentials>(adminUsersFilePath);
  return users.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

export const getAdminUserByEmail = async (email: string): Promise<AdminUserWithCredentials | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<AdminUserRow>(
      "SELECT * FROM admin_users WHERE email = $1 LIMIT 1",
      [email.toLowerCase()]
    );
    return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
  }

  const users = await readJsonFile<AdminUserWithCredentials>(adminUsersFilePath);
  return users.find((item) => item.email.toLowerCase() === email.toLowerCase()) ?? null;
};

export const createAdminUser = async (input: {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  role: AdminUserRole;
}): Promise<AdminUser> => {
  const now = new Date().toISOString();
  const user: AdminUserWithCredentials = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
    role: input.role,
    createdAt: now,
    updatedAt: now
  };

  if (isPostgresConfigured()) {
    await getPostgresPool().query(
      `
        INSERT INTO admin_users (id, email, password_hash, password_salt, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [user.id, user.email, user.passwordHash, user.passwordSalt, user.role, user.createdAt, user.updatedAt]
    );

    return user;
  }

  const users = await readJsonFile<AdminUserWithCredentials>(adminUsersFilePath);
  users.push(user);
  await writeJsonFile(adminUsersFilePath, users);

  return user;
};

export const updateAdminUserRole = async (userId: string, role: AdminUserRole): Promise<AdminUser | null> => {
  const now = new Date().toISOString();

  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<AdminUserRow>(
      "UPDATE admin_users SET role = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [userId, role]
    );
    return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
  }

  const users = await readJsonFile<AdminUserWithCredentials>(adminUsersFilePath);
  const index = users.findIndex((item) => item.id === userId);

  if (index === -1) {
    return null;
  }

  const updated = { ...users[index], role, updatedAt: now };
  users[index] = updated;
  await writeJsonFile(adminUsersFilePath, users);

  return updated;
};

export const deleteAdminUser = async (userId: string): Promise<AdminUser | null> => {
  if (isPostgresConfigured()) {
    const result = await getPostgresPool().query<AdminUserRow>(
      "DELETE FROM admin_users WHERE id = $1 RETURNING *",
      [userId]
    );
    return result.rows[0] ? mapAdminUser(result.rows[0]) : null;
  }

  const users = await readJsonFile<AdminUserWithCredentials>(adminUsersFilePath);
  const index = users.findIndex((item) => item.id === userId);

  if (index === -1) {
    return null;
  }

  const deleted = users[index];
  users.splice(index, 1);
  await writeJsonFile(adminUsersFilePath, users);

  return deleted;
};
