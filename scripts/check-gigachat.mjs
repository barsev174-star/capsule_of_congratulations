import { readFileSync } from "node:fs";
import { request } from "node:https";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const key = process.env.GIGACHAT_AUTH_KEY?.trim();
if (!key) throw new Error("GIGACHAT_AUTH_KEY is not configured.");

const caPath = process.env.GIGACHAT_CA_CERT_PATH ?? "infra/certs/russian_trusted_root_ca_pem.crt";
const ca = readFileSync(resolve(process.cwd(), caPath));
const body = new URLSearchParams({ scope: process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS" }).toString();

const token = await new Promise((resolvePromise, reject) => {
  const req = request(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      ca,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        RqUID: randomUUID()
      }
    },
    (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (res.statusCode !== 200 || !data.access_token) {
          reject(new Error(`GigaChat OAuth returned HTTP ${res.statusCode ?? 500}.`));
          return;
        }
        resolvePromise(data.access_token);
      });
    }
  );
  req.setTimeout(20_000, () => req.destroy(new Error("GigaChat OAuth timed out.")));
  req.on("error", reject);
  req.write(body);
  req.end();
});

const baseUrl = (process.env.GIGACHAT_BASE_URL ?? "https://gigachat.devices.sberbank.ru/api/v1").replace(/\/$/, "");
await new Promise((resolvePromise, reject) => {
  const req = request(
    `${baseUrl}/models`,
    { method: "GET", ca, headers: { Accept: "application/json", Authorization: `Bearer ${token}` } },
    (res) => {
      res.resume();
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`GigaChat models endpoint returned HTTP ${res.statusCode ?? 500}.`));
          return;
        }
        resolvePromise();
      });
    }
  );
  req.setTimeout(20_000, () => req.destroy(new Error("GigaChat models request timed out.")));
  req.on("error", reject);
  req.end();
});

const chatBody = JSON.stringify({
  model: process.env.GIGACHAT_MODEL ?? "GigaChat-2",
  messages: [{ role: "user", content: "Ответь одним словом: готово" }],
  temperature: 0.2,
  max_tokens: 20
});

await new Promise((resolvePromise, reject) => {
  const req = request(
    `${baseUrl}/chat/completions`,
    {
      method: "POST",
      ca,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(chatBody)
      }
    },
    (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode !== 200) {
          reject(new Error(`GigaChat chat endpoint returned HTTP ${res.statusCode ?? 500}: ${text.slice(0, 200)}`));
          return;
        }
        const data = JSON.parse(text);
        if (typeof data.choices?.[0]?.message?.content !== "string") {
          reject(new Error("GigaChat chat endpoint returned an invalid response."));
          return;
        }
        resolvePromise();
      });
    }
  );
  req.setTimeout(20_000, () => req.destroy(new Error("GigaChat chat request timed out.")));
  req.on("error", reject);
  req.write(chatBody);
  req.end();
});

console.log("GigaChat connection check passed.");
