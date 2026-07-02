# AI providers

## Current setup

Greeting generation supports three server-side providers:

- `mock` - deterministic local fallback for development;
- `gigachat` - the preserved GigaChat implementation;
- `openai` - an OpenAI-compatible API with strict Structured Outputs.

The OpenAI-compatible provider is currently configured for RouterAI and `openai/gpt-5-mini`. It generates participant greetings in `compose`, `improve` and `shorten` modes. The response schema requires exactly three variants: `short`, `warm` and `style`.

Current participant prompt: `greeting-openai-v3`.

Participant greetings, best quotes and recipient qualities now use the OpenAI-compatible provider. They are controlled independently so insights can be disabled without affecting greeting generation:

```env
AI_GREETING_PROVIDER=openai
AI_INSIGHTS_PROVIDER=openai
```

`AI_PROVIDER` remains as a backward-compatible default for greeting generation.

Card insights use prompt `card-insights-openai-v1` with strict Structured Outputs. Best quotes return exactly three source-linked excerpts; qualities return exactly five short source-linked definitions. Existing local validation checks IDs, limits, uniqueness and grounding before saving. GigaChat provider code is retained only as legacy rollback code and is not selected by the current configuration.

## Experimental matrix generation

The public API and UI still receive `short`, `warm` and `style`. An optional backend experiment can generate seven internal styles in one OpenAI request and then select the same public three:

```env
AI_GREETING_MODE=classic
AI_MATRIX_PROMPT_VERSION=greeting-openai-matrix-v4
```

Set `AI_GREETING_MODE=matrix` to enable the experiment. If the variable is missing, the service uses `classic`. Matrix is used only for OpenAI `compose` requests; manager improve/shorten operations and other providers stay on classic.

Matrix defaults to `greeting-openai-matrix-v4`; set `AI_MATRIX_PROMPT_VERSION=greeting-openai-matrix-v3` or `greeting-openai-matrix-v2` to compare with a preserved prompt. V4 keeps universal context inference, separately extracts personal consequences, actions and qualities from the draft, converts overloaded wishes into occasion-aware directions, and scores all seven texts for specificity, language, style and structural diversity. When the draft contains a personal consequence, a safe trio containing it takes priority over generic wording. V4 removes leaked `fromLabel` and duplicate occasion text and uses one targeted retry only for hard failures. Soft quality issues never produce `422`. The feature flag does not change the UI, database, card limits or API response shape.

For a single paid provider request that prints all seven raw matrix variants, load `.env.local`, set `RUN_OPENAI_LIVE=1`, and run `npm run test:greetings:matrix`. The live test is skipped during the regular test suite.

## Ladder generation

`ladder` is the current production candidate for participant `compose` requests:

```env
AI_GREETING_PROVIDER=openai
AI_GREETING_MODE=ladder
```

It uses prompt `greeting-openai-ladder-v1` and keeps the public API IDs compatible: `short` / `Аккуратно`, `warm` / `Теплее`, and `style` / `Живее`.

The server infers the address, `ты/вы`, number of recipients, author voice and occasion category from existing product fields. The selected card layout supplies the real character limit. Existing published greetings are included only as anti-duplication context.

The flow uses one initial request, one targeted retry containing only rejected levels, and then deterministic fitting for a small overflow of at most 40 characters. Fitting removes only a secondary middle sentence and never truncates words or changes already valid text. A remaining failure becomes controlled `AI_VALIDATION_FAILED`.

`ladder` applies only to OpenAI `compose`. Manager `improve` and `shorten`, insight generation and other providers retain their existing paths. Set `AI_GREETING_MODE=matrix` and restart the web container for an immediate rollback.

In ladder mode the participant UI hides the obsolete style selector and presents the three assistance levels. No public environment variable is required.

Live development checks use `npm run test:greetings:levels` with `RUN_OPENAI_LIVE=1` and `GREETING_LIVE_SCENARIO=graduation`, `educator`, or `wedding`.

## OpenAI-compatible configuration

```env
AI_PROVIDER=openai
AI_GREETING_PROVIDER=openai
AI_INSIGHTS_PROVIDER=openai
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
- GigaChat code remains only as archived implementation and is not part of the production configuration.
- Hard validation rejects copied drafts, prompt leakage, wrong author voice, invented work details and exact career clichés. Natural rephrasing remains accepted.
- The short variant is limited to 180 characters and two sentences.
- Noticeable replacement phrases cannot repeat across variants; accepted variants survive a targeted retry.
- Humor is isolated to the `style` variant when the humor style is selected.

RouterAI accepted the production schema and returned valid structured output during the integration check. A later live request experienced elevated provider latency, so the application timeout remains mandatory.

## AI rollback

Keep OpenAI for every AI block. To roll back only participant composition from ladder to the previous matrix selector:

```env
AI_PROVIDER=openai
AI_GREETING_PROVIDER=openai
AI_GREETING_MODE=matrix
AI_INSIGHTS_PROVIDER=openai
```

Rebuild and restart the web container after changing production environment variables. Do not enable GigaChat on VPS.

## Verification

```powershell
npm.cmd test -- --run src/lib/ai
npm.cmd run build
```
