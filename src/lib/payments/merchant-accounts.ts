import { getPostgresPool } from "@/lib/db/postgres";
import { randomUUID } from "node:crypto";

export type MerchantAccount = {
  id: string;
  provider: "ROBOKASSA";
  merchantLogin: string;
  secretReference: string;
  sellerFullName: string;
  sellerInn: string;
  sellerTaxStatus: "SELF_EMPLOYED";
  status: "TEST" | "ACTIVE" | "RETIRED";
};

type Row = {
  id: string; provider: "ROBOKASSA"; merchant_login: string; secret_reference: string;
  seller_full_name: string; seller_inn: string; seller_tax_status: "SELF_EMPLOYED";
  status: MerchantAccount["status"];
};

const map = (row: Row): MerchantAccount => ({
  id: row.id, provider: row.provider, merchantLogin: row.merchant_login, secretReference: row.secret_reference,
  sellerFullName: row.seller_full_name, sellerInn: row.seller_inn, sellerTaxStatus: row.seller_tax_status, status: row.status
});

export const getMerchantAccountById = async (id: string) => {
  const result = await getPostgresPool().query<Row>("SELECT * FROM merchant_accounts WHERE id = $1 LIMIT 1", [id]);
  return result.rows[0] ? map(result.rows[0]) : null;
};

export const getActiveRobokassaMerchantAccount = async (mode: "test" | "live") => {
  const status = mode === "test" ? "TEST" : "ACTIVE";
  const result = await getPostgresPool().query<Row>(`SELECT * FROM merchant_accounts
    WHERE provider = 'ROBOKASSA' AND status = $1 AND (active_from IS NULL OR active_from <= now())
      AND (active_until IS NULL OR active_until > now()) ORDER BY created_at DESC LIMIT 1`, [status]);
  return result.rows[0] ? map(result.rows[0]) : null;
};

export const listMerchantAccounts = async () => {
  const result = await getPostgresPool().query<Row>("SELECT * FROM merchant_accounts ORDER BY created_at DESC");
  return result.rows.map(map);
};

export const createMerchantAccount = async (input: Omit<MerchantAccount, "id" | "provider">) => {
  const account: MerchantAccount = { id: randomUUID(), provider: "ROBOKASSA", ...input };
  await getPostgresPool().query(`INSERT INTO merchant_accounts (
    id, provider, merchant_login, secret_reference, seller_full_name, seller_inn, seller_tax_status, status
  ) VALUES ($1, 'ROBOKASSA', $2, $3, $4, $5, 'SELF_EMPLOYED', $6)`, [
    account.id, account.merchantLogin, account.secretReference, account.sellerFullName, account.sellerInn, account.status
  ]);
  return account;
};
