# Project handoff — 2026-06-24

Этот файл нужно читать первым при переходе в новый чат. Он фиксирует, где остановились, что уже проверено и какой следующий шаг разумнее сделать.

## Текущий статус production

Production MVP запущен на реальном домене:

`https://darislova.ru`

Также работает:

`https://www.darislova.ru`

Серверная часть VPS-размещения завершена:

1. DNS `darislova.ru` и `www.darislova.ru` указывает на VPS `168.222.141.120`.
2. Приложение лежит на VPS в `/home/deploy/capsule`.
3. Docker Compose project: `capsule`.
4. Контейнеры:
   - `capsule-postgres-1` — PostgreSQL, healthy;
   - `capsule-web-1` — Next.js production server, healthy.
5. Web-контейнер опубликован только локально: `127.0.0.1:3100->3000`.
6. Caddy из production stack Prognozist обслуживает публичные `80/443`.
7. Caddy подключен к Docker network `capsule_default`.
8. Site block `darislova.ru, www.darislova.ru` проксирует в `capsule-web-1:3000`.
9. HTTPS-сертификаты выпущены Caddy автоматически.
10. PostgreSQL migration применена.
11. Ручной backup базы и uploads проверен.
12. Ежедневный root cron backup настроен на `03:35`.
13. Production health check прошел: `Production health checks passed`.

Проверено вручную:

1. `https://darislova.ru` открывается.
2. `https://www.darislova.ru` открывается.
3. Лендинг создает новую открытку.
4. После создания открывается `/manage/[manageToken]`.
5. `/join/[slug]` открывается.

## Текущий продуктовый статус

Первичный дизайн scrapbook-открытки закончен. Сейчас фокус не на дальнейшей визуальной шлифовке финальной открытки, а на превращении локального прототипа в рабочий MVP-flow.

Рабочий MVP-flow:

1. `/` — лендинг.
2. Кнопка `Создать открытку` на лендинге создает новый пустой черновик и сразу открывает `/manage/[manageToken]`.
3. `/manage/[manageToken]` — экран организатора: основа открытки, ссылки, поздравления, фото, предпросмотр.
4. `/join/[slug]` — страница участника для написания поздравления.
5. `/preview/[manageToken]` — предпросмотр для организатора.
6. `/gift/[slug]` — финальная открытка для получателя.

Старый `/create` пока остается в проекте как отдельная страница, но основной CTA с лендинга больше не должен вести туда.

## Последняя правка перед handoff

Исправлена кнопка `Создать открытку` на главной странице:

1. Было: обычная ссылка на `/create`, из-за чего открывался старый экран создания.
2. Стало: server action `startCardFromShowcaseAction`, который создает пустой черновик и редиректит в `/manage/[manageToken]`.
3. Проверено в браузере: после клика открывался `http://localhost:3000/manage/79bbe39fe81322660ebbdb58c36055d3`.
4. `npm.cmd run build` прошел успешно.

Измененный файл: `src/app/page.tsx`.

## Что уже реализовано технически

1. Next.js + TypeScript.
2. Локальное JSON-хранилище без `DATABASE_URL`.
3. PostgreSQL-режим при заданном `DATABASE_URL`.
4. Миграции PostgreSQL через `npm.cmd run db:migrate`.
5. Локальное хранилище фото в `public/uploads/cards`.
6. Лимит медиа на MVP: до 7 фото на открытку.
7. Helper для URL: `src/lib/routes/card-links.ts`.
8. Production env: `NEXT_PUBLIC_SITE_URL=https://darislova.ru`.
9. Production Docker Compose заготовка:
   - `Dockerfile.prod`;
   - `docker-compose.prod.yml`;
   - `.env.production.example`;
   - backup/health scripts в `infra/scripts`.

## Решение по домену

Для MVP используется один домен:

`https://darislova.ru`

Структура:

1. `/` — лендинг.
2. `/create` — старый/резервный экран создания.
3. `/join/[slug]` — участник.
4. `/manage/[manageToken]` — организатор.
5. `/preview/[manageToken]` — предпросмотр.
6. `/gift/[slug]` — финальная открытка.

Поддомены `cards.`, `gift.`, `app.` пока не нужны.

## VPS-контекст

VPS пользователя: 2 CPU, 4 GB RAM, 30 GB SSD, Ubuntu. Для MVP подходит.

На этом VPS уже работает другой проект: `Prognozist` — Telegram bot + mini app. Его нельзя ломать. Для открыток выбран отдельный Docker stack `capsule`, а Caddy/80/443 уже может принадлежать Prognozist.

Рекомендованный первый деплой:

1. Открытки поднимаются отдельным compose stack.
2. `capsule-web` слушает `127.0.0.1:3100`.
3. Caddy Prognozist получил дополнительный site block для `darislova.ru, www.darislova.ru`.
4. Caddy подключен к сети `capsule_default` и проксирует напрямую на `capsule-web-1:3000`.
5. Позже можно вынести Caddy в общий infra-layer или закрепить shared network в compose-конфигурациях, чтобы ручное `docker network connect` не потерялось при пересоздании Caddy-контейнера.

## Skill make-interfaces-feel-better

Пользователь установил skill:

`C:\Users\zapra\.codex\skills\make-interfaces-feel-better`

В папке есть:

1. `SKILL.md`;
2. `typography.md`;
3. `surfaces.md`;
4. `animations.md`;
5. `performance.md`.

Но в текущей сессии skill не появился в списке доступных skills даже после перезапуска. Возможные причины:

1. текущий thread был создан до установки skill;
2. Codex Desktop читает skills только при создании нового thread;
3. конкретная версия Codex Desktop не подхватывает пользовательские skills из `.codex\skills`.

В новом чате нужно проверить доступность skill заново. Если он снова не виден, можно читать `SKILL.md` вручную и применять его принципы без официального skill-trigger.

## Что нужно сделать следующим

Главный следующий шаг: пройти полный production MVP-flow с реальной тестовой открыткой, включая `/gift/[slug]`, а затем улучшить экран участника `/join/[slug]`, где человек пишет поздравление.

Цель: сделать экран более дружелюбным, понятным и конверсионным, не трогая пока финальный scrapbook-дизайн.

Рекомендуемый план:

1. Создать тестовую открытку на `https://darislova.ru`.
2. Пройти весь путь:
   - заполнить основу;
   - открыть ссылку участника;
   - добавить поздравление;
   - загрузить тестовое фото;
   - открыть `/gift/[slug]`;
   - проверить, что фото и текст переживают перезапуск страницы.
3. После проверки полного flow открыть `/join/[slug]` на локальном dev-сервере.
4. Пройти сценарий участника:
   - понять, кому открытка;
   - написать поздравление;
   - при желании воспользоваться AI-помощником;
   - отправить поздравление;
   - увидеть понятный success state.
5. Применить UI-polish из `make-interfaces-feel-better`:
   - типографика и переносы;
   - понятные состояния формы;
   - мягкие hover/press состояния;
   - аккуратные radius/shadow;
   - нормальные hit areas;
   - mobile-first проверка.
6. Проверить desktop и mobile через браузер.
7. Обновить docs и сделать коммит.

## Что не делать прямо сейчас

1. Не продолжать тонкую визуальную шлифовку финальной открытки без новой явной задачи.
2. Не добавлять оплату.
3. Не делать регистрацию и личный кабинет.
4. Не усложнять домены поддоменами.
5. Не ломать Prognozist на VPS.
6. Не подключать внешнюю AI-модель до проверки ручного MVP-flow.

## Проверки перед следующим коммитом

Минимум:

```powershell
npm.cmd run build
```

Желательно после UI-правок:

```powershell
npx.cmd vitest run --root C:\Project\Поздравления2.0
```

Если используется PostgreSQL:

```powershell
$env:DATABASE_URL="postgres://capsule:capsule_pass@localhost:5432/capsule"
npm.cmd run db:migrate
```
