# AI providers

## Current setup

Production AI uses one transport/provider:

- `routerai` — RouterAI transport with YandexGPT models and strict JSON schemas;
- `mock` — deterministic local implementation used only when the provider is not configured in development or tests.

Participant composition, organizer composition and editing, best quotes, and recipient qualities all use YandexGPT through RouterAI. No OpenAI model, endpoint, key, or runtime fallback is selected by the active configuration.

Greetings use `yandex-semantic-extractor-v4` and `yandex-semantic-composer-v5`; single-result actions record the composer as `yandex-semantic-composer-v5-single-v1`. Card insights use `card-insights-yandex-v1`.

Active production configuration:

```env
AI_PROVIDER=routerai
AI_GREETING_PROVIDER=routerai
AI_INSIGHTS_PROVIDER=routerai
ROUTERAI_API_KEY=<server-side key>
ROUTERAI_BASE_URL=https://routerai.ru/api/v1
ROUTERAI_TIMEOUT_MS=60000
YANDEX_GREETING_EXTRACTOR_MODEL=yandex/gpt-pro-5.1
YANDEX_GREETING_COMPOSER_MODEL=yandex/gpt-pro-5.1
YANDEX_GREETING_EDIT_MODEL=yandex/gpt-pro-5.1
YANDEX_INSIGHTS_MODEL=yandex/gpt-pro-5.1
```

The transport is isolated behind the RouterAI client. A later direct Yandex Cloud adapter can replace it without changing the greeting state, API action contract, attempts, or persistence.

Best quotes return source-linked excerpts; qualities return five short source-linked definitions. Existing local validation checks IDs, limits, uniqueness and grounding before saving.

## `/join` single-result Yandex flow

Participant and organizer composition send `joinAction` and use the Yandex semantic profile with `yandex/gpt-pro-5.1` for extraction and composition:

```env
YANDEX_GREETING_EXTRACTOR_MODEL=yandex/gpt-pro-5.1
YANDEX_GREETING_COMPOSER_MODEL=yandex/gpt-pro-5.1
```

The default values are the same when the model variables are omitted. Requests use server-side `ROUTERAI_BASE_URL` and `ROUTERAI_API_KEY`.

The initial request returns one `Основной` result. Follow-up actions are `warmer`, `creative` and `alternative`; each family has its own client-side history and selection index. Opening a family or switching between existing history items does not call the provider. Only the nested generation button starts a new request.

The organizer's modal uses the same endpoint and semantic pipeline, authenticating with `manageToken`. `Вставить в поздравление` copies only the active family result into the ordinary manual textarea and closes the AI mode; it does not save or publish the contribution. Generated histories remain mounted while the editor stays open, including after returning from manual mode. Loading and error states keep the last successful text readable, and retry reuses the same request ID so a transport retry cannot spend the attempt twice.

### Organizer editor state

- On the first switch from `Написать самому` to `Помочь с текстом`, an already started manual greeting is copied into the AI source field. Later switches do not overwrite either the manual draft or generated histories.
- After the first successful generation, the source field collapses into the compact `Ваши исходные мысли` block. `Изменить` reopens it; `Свернуть` is available while its text is unchanged.
- The large `Подобрать текст` action is shown before the first result only. If the organizer changes the source after generation, the action returns as `Обновить по моим мыслям`.
- While an updated source is being processed, and if that request fails, the last successful result and histories remain readable. A successful update becomes the new `Основной` result and clears the old `Основной`, `Теплее`, `Творческий` and `Другой вариант` histories so variants from different source drafts cannot be mixed.
- Selecting an existing family or paging through its history never spends an AI attempt. A new attempt is spent only by an explicit generation action; when the limit is exhausted, the existing results stay available.
- Existing saved contributions continue to use the constrained edit helper. The expanded composition flow is used only when an organizer adds a new contribution.

An explicitly added detail is sent as `requiredDetail`, inserted into the semantic plan as the required `user-detail` fact and checked before the result is accepted. A transformation requires `sourceText`; `shorten` must return text shorter than its source. One targeted repair request is allowed for a hard validation failure.

The visible counter is the existing per-card AI-attempt budget. A successful request consumes one attempt. Failed provider requests retain the existing reservation-release behavior. HTTP `429` is displayed as an exhausted limit while previously generated histories remain readable.

The complete experiment history, quality findings and accepted UI behavior are recorded in `docs/AI_PROVIDER_AB_TEST_2026-08-27.md`.

## Archived experimental matrix generation

The repository still contains regression material for the former compose path that received `short`, `warm` and `style`. It is not runtime-selectable because active provider configuration accepts only `routerai` and `mock`:

```env
AI_GREETING_MODE=classic
AI_MATRIX_PROMPT_VERSION=greeting-openai-matrix-v4
```

The variables above document the former configuration and do not enable the matrix in the current build.

Matrix defaults to `greeting-openai-matrix-v4`; set `AI_MATRIX_PROMPT_VERSION=greeting-openai-matrix-v3` or `greeting-openai-matrix-v2` to compare with a preserved prompt. V4 keeps universal context inference, separately extracts personal consequences, actions and qualities from the draft, converts overloaded wishes into occasion-aware directions, and scores all seven texts for specificity, language, style and structural diversity. When the draft contains a personal consequence, a safe trio containing it takes priority over generic wording. V4 removes leaked `fromLabel` and duplicate occasion text and uses one targeted retry only for hard failures. Soft quality issues never produce `422`. The feature flag does not change the UI, database, card limits or API response shape.

The former paid matrix command has been removed from `package.json`; the implementation below is retained only as historical regression material.

## Archived ladder generation

`ladder` is preserved as regression material for the former three-result participant `compose` flow:

```env
AI_GREETING_PROVIDER=openai
AI_GREETING_MODE=ladder
```

It uses prompt `greeting-openai-ladder-v1` and keeps the public API IDs compatible: `short` / `Аккуратно`, `warm` / `Теплее`, and `style` / `Живее`.

The server infers the address, `ты/вы`, number of recipients, author voice and occasion category from existing product fields. The selected card layout supplies the real character limit. Existing published greetings are included only as anti-duplication context.

The flow uses one initial request, one targeted retry containing only rejected levels, and then deterministic fitting for a small overflow of at most 40 characters. Fitting removes only a secondary middle sentence and never truncates words or changes already valid text. A remaining failure becomes controlled `AI_VALIDATION_FAILED`.

The current `/join` UI always sends `joinAction`, and the service disables ladder selection. Changing `AI_GREETING_MODE` alone therefore does not switch the accepted single-result flow.

The ladder response remains compatible with the old three-assistance-level UI and is retained for regression coverage.

The former live assistance-level command has been removed from `package.json`.

## Archived pre-Yandex configuration

```env
AI_PROVIDER=openai
AI_GREETING_PROVIDER=openai
AI_INSIGHTS_PROVIDER=openai
OPENAI_API_KEY=<server-side key>
OPENAI_BASE_URL=https://routerai.ru/api/v1
OPENAI_MODEL=openai/gpt-5-mini
AI_JOIN_EXTRACTOR_MODEL=yandex/gpt-pro-5.1
AI_JOIN_COMPOSER_MODEL=yandex/gpt-pro-5.1
OPENAI_TIMEOUT_MS=60000
```

The key is stored only in `.env.local` or `.env.production`. Never commit `.env.local`, `.env.production` or `key.txt`.

## Reliability

- The `/join` provider requests a strict semantic plan followed by one text result; legacy paths keep their typed multi-variant schemas.
- The existing hard and soft quality validation remains active.
- One targeted retry is available with short validation feedback.
- On legacy multi-variant paths valid variants survive the first attempt and retry requests include only rejected variant types.
- Failed provider calls release the reserved AI action and do not consume the card limit.
- Existing greetings are passed as anti-duplication context without author names.
- Former OpenAI and GigaChat source remains only as non-selected regression material; unsupported provider values fail configuration instead of silently entering a legacy network path.
- Hard validation rejects prompt leakage, wrong author voice, missing required facts and invalid length; natural rephrasing remains accepted.
- An explicitly added `/join` detail becomes a required semantic fact instead of relying only on prompt wording.
- `/join` transformations preserve the main source; `shorten` is additionally required to be shorter than that source.

RouterAI accepted the production schema and returned valid structured output during the integration check. A later live request experienced elevated provider latency, so the application timeout remains mandatory.

## Rollback

There is no runtime OpenAI or GigaChat fallback in the current build. Setting `AI_PROVIDER`, `AI_GREETING_PROVIDER` or `AI_INSIGHTS_PROVIDER` to either legacy value fails configuration intentionally. A provider rollback therefore requires restoring the previous code/configuration from Git, not only changing an environment variable. Rebuild and restart the web container after any provider configuration change.

## Verification

```powershell
npm.cmd test -- --run src/lib/ai
npm.cmd run ai:check
npm.cmd run build
```
