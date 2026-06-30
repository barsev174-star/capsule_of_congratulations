# GigaChat greeting helper

## Current state

The greeting helper supports two server-side providers:

- `AI_PROVIDER=mock` keeps the deterministic local generator;
- `AI_PROVIDER=gigachat` uses GigaChat through the backend.

The browser never receives `GIGACHAT_AUTH_KEY`. Card context, the selected message-grid limit and existing visible greetings are loaded on the server.

## Product rules

- Draft notes: 20–700 characters.
- Generated message length: the active card-grid limit (`200`, `280` or `340` characters).
- One request for three variants counts as one AI action.
- Before payment: 5 successful actions per card.
- After a paid `payment_orders` record: 30 successful actions per card.
- Failed provider calls do not consume the limit.
- Existing visible greetings are passed without author names and are used to reject close duplicates.

## Storage and privacy

- `ai_usage_events` stores permanent usage metadata without message text.
- `ai_generation_drafts` temporarily stores the draft and generated variants for comparison.
- When the related greeting is submitted, its row is deleted from `ai_generation_drafts`; the usage event remains for quota accounting.

Migration: `migrations/0003_ai_generation_runtime.sql`.

## Environment

```env
AI_PROVIDER=gigachat
AI_FREE_LIMIT=5
AI_PAID_LIMIT=30
GIGACHAT_AUTH_KEY=<authorization key>
GIGACHAT_MODEL=GigaChat-2
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_BASE_URL=https://gigachat.devices.sberbank.ru/api/v1
GIGACHAT_TIMEOUT_MS=20000
```

The public Ministry of Digital Development root certificate is bundled at `infra/certs/russian_trusted_root_ca_pem.crt`. TLS verification stays enabled.

Do not commit `.env.local`, `.env.production` or `key.txt`.

## Local verification

```powershell
npm.cmd run db:migrate
npm.cmd run ai:check
npm.cmd test -- src/lib/ai
npm.cmd run build
```

`db:migrate` needs `DATABASE_URL` in the process environment. The application itself loads `.env.local` through Next.js.

## VPS rollout

1. Pull the release.
2. Add the AI variables above to `/home/deploy/capsule/.env.production`.
3. Run migration `0003` inside the web container.
4. Rebuild and restart `web` so the GigaChat key and provider are loaded.
5. Run `npm run ai:check` inside the web container.
6. Generate a greeting through a test participant link and submit it.
7. Confirm the web container remains healthy.

Keep `AI_PROVIDER=mock` until the production key and connection check are ready. Never silently fall back from GigaChat to mock in production.
