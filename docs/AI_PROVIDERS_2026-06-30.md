# AI providers

## Current setup

Greeting generation supports three server-side providers:

- `mock` - deterministic local fallback for development;
- `gigachat` - the preserved GigaChat implementation;
- `openai` - an OpenAI-compatible API with strict Structured Outputs.

The OpenAI-compatible provider is currently configured for RouterAI and `openai/gpt-5-mini`. It generates participant greetings in `compose`, `improve` and `shorten` modes. The response schema requires exactly three variants: `short`, `warm` and `style`.

Current participant prompt: `greeting-openai-v3`.

Best quotes and recipient qualities remain on GigaChat. This separation is intentional and controlled by two variables:

```env
AI_GREETING_PROVIDER=openai
AI_INSIGHTS_PROVIDER=gigachat
```

`AI_PROVIDER` remains as a backward-compatible default for greeting generation.

## Experimental matrix generation

The public API and UI still receive `short`, `warm` and `style`. An optional backend experiment can generate seven internal styles in one OpenAI request and then select the same public three:

```env
AI_GREETING_MODE=classic
```

Set `AI_GREETING_MODE=matrix` to enable the experiment. If the variable is missing, the service uses `classic`. Matrix is used only for OpenAI `compose` requests; manager improve/shorten operations and other providers stay on classic.

Matrix uses `greeting-openai-matrix-v1`, infers relationship/address mode with local heuristics, validates only the selected public variants and retries the full matrix at most once. The feature flag does not change the UI, database, card limits or API response shape.

## OpenAI-compatible configuration

```env
AI_PROVIDER=openai
AI_GREETING_PROVIDER=openai
AI_INSIGHTS_PROVIDER=gigachat
OPENAI_API_KEY=<server-side key>
OPENAI_BASE_URL=https://routerai.ru/api/v1
OPENAI_MODEL=openai/gpt-5-mini
OPENAI_TIMEOUT_MS=60000
```

The key is stored only in `.env.local` or `.env.production`. Never commit `.env.local`, `.env.production` or `key.txt`.

## Reliability

- The provider requests strict JSON Schema output with exactly three typed variants.
- The existing hard and soft quality validation remains active.
- One retry is available with short validation feedback.
- Valid variants survive the first attempt; retry requests only rejected variant types.
- Failed provider calls release the reserved AI action and do not consume the card limit.
- Existing greetings are passed as anti-duplication context without author names.
- GigaChat code and configuration are retained for immediate rollback.
- Hard validation rejects copied drafts, prompt leakage, wrong author voice, invented work details and exact career clichés. Natural rephrasing remains accepted.
- The short variant is limited to 180 characters and two sentences.
- Noticeable replacement phrases cannot repeat across variants; accepted variants survive a targeted retry.
- Humor is isolated to the `style` variant when the humor style is selected.

RouterAI accepted the production schema and returned valid structured output during the integration check. A later live request experienced elevated provider latency, so the application timeout remains mandatory.

## Switching back to GigaChat

No code rollback is required:

```env
AI_PROVIDER=gigachat
AI_GREETING_PROVIDER=gigachat
AI_INSIGHTS_PROVIDER=gigachat
```

Rebuild and restart the web container after changing production environment variables.

## Verification

```powershell
npm.cmd test -- --run src/lib/ai
npm.cmd run build
```
