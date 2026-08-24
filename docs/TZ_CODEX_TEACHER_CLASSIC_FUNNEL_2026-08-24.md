# ТЗ для Codex: teacher-landing — привязка `school-classic` к funnel и интеграционная приёмка

Дата: 24 августа 2026 года.

Страница: `/gruppovaya-otkrytka/uchitelyu`.

## 0. Роль Codex

Codex отвечает за техническую непрерывность сценария:

`SEO-landing → создание черновика с предвыбранным school-classic → manage → корректная telemetry`.

Presentation и тексты страницы выполняет Kimi по отдельному ТЗ. Не править его файлы параллельно до handoff, кроме исправления интеграционной ошибки после согласования.

Это ТЗ отменяет прежнее решение `Prefill: не добавлять` только для teacher-landing. Generic CTA главной и других страниц должны продолжить создавать пустой черновик без выбранного шаблона.

## 1. Владелец файлов Codex

Планируемая область:

- `src/app/home-actions.ts`;
- `src/lib/cards/service.ts`;
- тесты card service и server action, если применимо;
- `src/app/gruppovaya-otkrytka/uchitelyu/teacher-landing-client.tsx`;
- `src/app/_home/header.tsx`;
- при необходимости минимальные связанные типы/тесты telemetry;
- этот документ и итоговый handoff/status-документ.

Не менять без интеграционной необходимости:

- `src/app/gruppovaya-otkrytka/uchitelyu/page.tsx`;
- `page.module.css`;
- `teacher-landing-content.ts`;
- landing assets Kimi;
- `src/app/example/*`;
- `src/templates/school-classic/*`;
- payment, DB schema и product limits.

Не коммитить и не добавлять в staging без подтверждения пользователя.

## 2. Landing-specific server action

Добавить отдельное безопасное действие для teacher-landing, например `startTeacherCardFromShowcaseAction`.

Требования:

- template ID жёстко задаётся сервером как `school-classic`;
- не принимать произвольный `templateId` из формы;
- сохранить чтение first-touch cookie и текущий attribution context;
- сохранить `funnel.card_creation_started`;
- создать черновик и перенаправить в существующий `/manage/[manageToken]`;
- generic `startCardFromShowcaseAction` не менять по результату: он создаёт черновик с `templateId: null`.

## 3. Атомарная и корректная инициализация draft

Предпочтительный вариант — расширить `createEmptyCardDraft` обратносуместимым опциональным параметром initial template, чтобы:

- `templateId` был установлен до `saveCardDraft`;
- `funnel.card_created` сразу содержал `templateId: "school-classic"`;
- не создавать промежуточный draft с `templateId: null` и последующий update;
- текущие вызовы без второго параметра не меняли поведение.

Пример контракта на уровне идеи, не обязательная сигнатура:

```ts
createEmptyCardDraft(funnelContext, { templateId: "school-classic" })
```

Использовать существующий тип `CardTemplateId`. Не расширять публичный ввод пользователя и не добавлять новую DB migration.

## 4. CTA teacher-landing

В `TeacherCreateForm` заменить action на landing-specific действие, не меняя component API для Kimi.

Все placement должны сохраниться:

- `hero`;
- `example`;
- `final`;
- `middle`, если используется.

Событие `seo_create_click` должно дополнительно и безопасно отражать `template: school-classic`, только если этот ключ уже разрешён telemetry allowlist. Если расширение allowlist не требуется или создаёт лишний контракт, достаточно связки с `funnel.card_created.templateId`.

## 5. CTA в header

Для `HomeHeader variant="teacher"` использовать teacher-specific action.

Для всех остальных вариантов оставить generic action.

Текст teacher CTA заменить с `Собрать учителю` на `Создать открытку`.

Не менять навигацию и визуальный CSS header, если это не требуется для нового текста.

## 6. Интерактивный пример

В `TeacherExampleLink`:

- href: `/example?template=school-classic`;
- telemetry: `template: "school-classic"`.

Не менять `/example`, потому что alias и готовая fixture Анны Сергеевны уже существуют.

Проверить, что query действительно выбирает `school-classic` на первом render и не показывает сначала Алису из `school-scrapbook`.

## 7. Тесты

Добавить или обновить тесты, подтверждающие:

1. generic `createEmptyCardDraft()` сохраняет `templateId: null`;
2. teacher-вариант сохраняет `templateId: school-classic` до первого repository save;
3. `funnel.card_created` получает правильный template ID;
4. generic home action не изменил поведение;
5. teacher form и teacher header используют landing-specific action;
6. example link и client telemetry используют `school-classic`;
7. невалидный client input не может выбрать другой шаблон, потому что template hard-coded на сервере.

Не запускать реальные POST-действия против production или пользовательской БД.

## 8. Интеграционная приёмка после Kimi

После handoff Kimi:

- проверить отсутствие оставшихся `school-scrapbook` в teacher-landing presentation и metadata;
- проверить, что новый screenshot содержит имя, повод и счётчики, а не пустой фон;
- сверить видимый FAQ с JSON-LD;
- проверить один H1, canonical и OG;
- проверить, что новые H2 не выглядят keyword stuffing;
- проверить mobile 320/390 и desktop 1440;
- проверить no-JS, reduced motion, keyboard focus и быстрый scroll;
- убедиться, что художественные цвета school-classic не перешли в UI controls;
- проверить отсутствие изменений payment и recipient flow.

Если нужна presentation-коррекция, сначала зафиксировать конкретный дефект и изменить минимальный участок после завершения работы Kimi, чтобы не создавать параллельный конфликт.

## 9. Обязательные проверки Codex

Целевые тесты выполнить первыми, затем полный набор:

```text
npm test -- <целевые test-файлы>
npm exec tsc -- --noEmit
npm run ui:colors
npm run ui:contrast
npm run lint
npm run build
git diff --check
```

Browser/flow QA:

- `/gruppovaya-otkrytka/uchitelyu` возвращает 200;
- `/example?template=school-classic` открывает Анну Сергеевну;
- teacher CTA создаёт draft с `templateId=school-classic` и ведёт в manage;
- generic CTA главной создаёт draft с `templateId=null`;
- attribution сохраняется;
- telemetry не содержит секретов, имён пользователей и произвольного form input;
- console и server logs без новых ошибок.

## 10. Условия готовности

- визуальное обещание и фактический созданный draft используют один шаблон;
- template ID выбран сервером и не подменяется клиентом;
- generic flow не изменился;
- `funnel.card_created` сразу знает правильный template ID;
- пример, OG, hero и центральный screenshot согласованы;
- тесты и проверки зелёные;
- итоговый diff разделён по ответственности и не содержит временных capture-файлов.

## 11. Handoff пользователю

1. Что реализовал Kimi.
2. Что реализовал Codex.
3. Таблица `Before | After` по итоговой странице и funnel.
4. Результаты unit, typecheck, UI, lint, build и browser QA.
5. Ссылки на новые screenshots/assets.
6. Перечень сознательно отложенных intent-страниц.
7. Не делать commit, staging или deploy без отдельного указания пользователя.
