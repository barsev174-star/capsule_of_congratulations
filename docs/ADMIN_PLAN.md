# План: админка (MVP)

## Контекст

Проект уже имеет:
- Next.js 16 + React 19 + TypeScript, CSS Modules.
- Два режима хранения: JSON-файлы (`data/`) при отсутствии `DATABASE_URL` и PostgreSQL при его наличии.
- Сущности `cards`, `contributions`, `card_media_assets`, управляемые через `src/lib/cards/repository.ts` и `src/lib/cards/repository-postgres.ts`.
- Страницу организатора `/manage/[manageToken]`, но нет централизованной админки.
- Нет аутентификации.

Админка делается поэтапно. Этот план — **Phase 1**: авторизация, дашборд, управление открытками и модерация поздравлений. Шаблоны, заказы/оплаты и роли оставляем на Phase 2, потому что сейчас шаблоны захардкожены, а платёжный модуль ещё не реализован.

## Phase 1 — базовая админка

### 1. Переменные окружения

Добавить в `.env.example` и `.env.production.example`:

```bash
# Admin credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<scrypt-hash>
ADMIN_PASSWORD_SALT=<salt>
ADMIN_SESSION_SECRET=<random-32-bytes-hex>
```

- `ADMIN_EMAIL` — логин администратора.
- `ADMIN_PASSWORD_HASH` + `ADMIN_PASSWORD_SALT` — хеш пароля через `crypto.scrypt`.
- `ADMIN_SESSION_SECRET` — секрет для подписи сессионной cookie.

Создать скрипт `scripts/generate-admin-password.mjs`, который по введённому паролю генерирует `ADMIN_PASSWORD_HASH` и `ADMIN_PASSWORD_SALT`.

### 2. Auth-модуль

Файлы:
- `src/lib/admin/auth.ts`
  - `hashAdminPassword(password, salt)` — `crypto.scryptSync`.
  - `verifyAdminPassword(password, hash, salt)` — сравнение через `crypto.timingSafeEqual`.
  - `createAdminSessionToken(email)` — подписанный токен (`base64(header).base64(payload).base64(hmac-sha256)`).
  - `verifyAdminSessionToken(token)` — проверка подписи и срока действия.
  - `getAdminAuthEnv()` — валидация переменных окружения.
- `src/lib/admin/session.ts`
  - `getAdminSession()` — читает cookie `admin_session` из `next/headers` и верифицирует.
  - `setAdminSession(token)` — ставит `admin_session` httpOnly, Secure, SameSite=Lax, path=/admin.
  - `clearAdminSession()` — очищает cookie.

### 3. Защита маршрутов

- `src/app/admin/layout.tsx` — server layout. Вызывает `getAdminSession()`; если сессии нет, редиректит на `/admin/login`. Рендерит общий скелет: шапка + боковое меню + `<main>`.
- `src/app/admin/login/page.tsx` — публичная страница логина. Клиентская форма с полями email/password и выводом ошибки.
- `src/app/admin/login/actions.ts` — server action `loginAdminAction(prevState, formData)`:
  - валидирует email/password;
  - сверяет хеш;
  - создаёт токен и cookie;
  - логирует `admin.login` / `admin.login_failed`.
  - `logoutAdminAction()` — чистит cookie.

### 4. Админ-репозиторий

Файл `src/lib/admin/repository.ts`. Функции должны работать в обоих режимах (JSON/Postgres):

- `getAdminDashboardStats()` — возвращает:
  - `totalCards`, `cardsByStatus` (draft/collecting/ready/closed),
  - `totalContributions`, `visibleContributions`, `hiddenContributions`, `deletedContributions`,
  - `totalMediaAssets`,
  - `recentCards` — последние 10 открыток с полями id, recipientName, organizerEmail, status, createdAt.
- `listAdminCards(options)` — список открыток с пагинацией/фильтрами:
  - `status`,
  - `search` по `recipientName`, `organizerName`, `organizerEmail`,
  - сортировка по `createdAt DESC`.
- `getAdminCardById(cardId)` — полная карточка + связанные поздравления и медиа.
- `listAdminContributions(options)` — все поздравления с данными карточки (recipientName, publicSlug):
  - фильтр по `status`,
  - фильтр по `search` по `authorName` / `message`.
- `updateAdminCardStatus(cardId, status)` — обёртка над существующей `updateCardStatus`.
- `updateAdminContributionStatus(contributionId, status)` — обёртка над `updateContributionStatus`.

Для Postgres использовать SQL-запросы с `JOIN`. Для JSON — читать `data/cards.json` / `data/contributions.json` и фильтровать в памяти.

### 5. Страницы админки

- `src/app/admin/page.tsx` — Dashboard.
  - Стат-карточки по открыткам, поздравлениям, фото.
  - Таблица/список последних 10 открыток со ссылками.
- `src/app/admin/cards/page.tsx` — список всех открыток.
  - Таблица: имя получателя, повод, email организатора, статус, дата, действия.
  - Фильтр по статусу и поисковая строка (query-параметры).
  - Кнопки: «Управлять» (ссылка на `/manage/[manageToken]`), «Открытка» (ссылка на `/gift/[finalSlug]`), «Сменить статус».
- `src/app/admin/cards/[id]/page.tsx` — детальная карточка.
  - Основные поля, статус, ссылки.
  - Список поздравлений к этой открытке.
  - Список загруженных фото.
- `src/app/admin/contributions/page.tsx` — модерация поздравлений.
  - Таблица: автор, текст, открытка (получатель), статус, дата.
  - Быстрые действия: «Показать», «Скрыть», «Удалить».

### 6. Компоненты и стили

- `src/app/admin/admin.module.css` — общие стили админки (шапка, боковое меню, таблицы, стат-карточки).
- `src/app/admin/components/admin-shell.tsx` — обёртка с навигацией.
- `src/app/admin/components/admin-nav.tsx` — ссылки: Dashboard, Открытки, Поздравления.
- `src/app/admin/components/stat-card.tsx` — карточка метрики.
- `src/app/admin/components/status-badge.tsx` — бейдж статуса открытки/поздравления.
- `src/app/admin/components/search-input.tsx` — поле поиска с сабмитом.

### 7. Server actions для админки

Файл `src/app/admin/actions.ts`:
- `updateCardStatusAdminAction(formData)` — проверяет сессию, меняет статус, revalidate `/admin/cards`.
- `updateContributionStatusAdminAction(formData)` — проверяет сессию, меняет статус, revalidate `/admin/contributions`.
- Все действия логируются через `logger.info`.

### 8. Тесты

- `src/lib/admin/auth.test.ts` — проверка `hashAdminPassword`, `verifyAdminPassword`, `createAdminSessionToken`, `verifyAdminSessionToken`.
- `src/lib/admin/repository.test.ts` (опционально) — базовые проверки `getAdminDashboardStats` в JSON-режиме.

### 9. Документация

- Обновить `docs/ADMIN_PLAN.md` (этот документ) по мере реализации.
- Добавить в `README.md` раздел «Админка» с логином и env-переменными.

### 10. Проверка

Команды:
```bash
npm run build
npm run test
npm run lint
```

Ручная проверка:
1. Сгенерировать пароль: `node scripts/generate-admin-password.mjs`.
2. Добавить env-переменные в `.env.local`.
3. Запустить `npm run dev`.
4. Открыть `/admin/login`, войти.
5. Убедиться, что `/admin` показывает дашборд.
6. Проверить фильтры и статусы на `/admin/cards` и `/admin/contributions`.
7. Проверить logout.

## Phase 2 — реализовано

- [x] Миграция `0002_admin_phase2.sql` (`payment_orders`, `template_overrides`, `admin_users`).
- [x] Страница «Заказы и оплаты» с ручным управлением статусами.
- [x] Страница «Шаблоны» — редактирование метаданных и включение/выключение шаблонов.
- [x] Страница «Администраторы» — создание пользователей и смена ролей.
- [x] Ролевая модель: admin / moderator / support.
- [x] Runtime-мерж шаблонов через `src/lib/cards/templates-server.ts`.
- [x] Auth fallback: сначала `admin_users`, затем env-переменные.

## Acceptance criteria Phase 2

- [x] Миграция применена.
- [x] `/admin/orders` показывает заказы и позволяет менять статус.
- [x] `/admin/templates` позволяет редактировать и включать/выключать шаблоны.
- [x] Выключенные шаблоны не доступны для выбора в редакторе.
- [x] `/admin/users` позволяет управлять администраторами.
- [x] Ролевая модель ограничивает доступ к разделам.
- [x] `npm run build` проходит после применения миграций.
- [ ] `npm run test` проходит (кроме прежнего failing test в `view-model.test.ts`).
- [ ] `npm run lint` проходит (кроме прежних ошибок в manage-формах).

## Acceptance criteria Phase 1

- [ ] Есть env-переменные для админ-логина/пароля/секрета.
- [ ] `/admin/login` работает и отображает ошибки при неверных данных.
- [ ] `/admin/*` недоступны без валидной сессии.
- [ ] Logout очищает сессию.
- [ ] Dashboard показывает актуальную статистику.
- [ ] `/admin/cards` показывает список открыток с фильтрами.
- [ ] `/admin/cards/[id]` показывает детали открытки.
- [ ] `/admin/contributions` позволяет скрывать/восстанавливать/удалять поздравления.
- [ ] Все действия логируются.
- [ ] `npm run build`, `npm run test`, `npm run lint` проходят.
