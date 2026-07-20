# Демонстрационная страница /example: scroll-анимации и микроинтеракции

Дата: 20 июля 2026 года.

## Назначение

Демонстрационная страница `/example` оживлена по ТЗ `docs/plankimi.md`: плавные scroll-анимации и микроинтеракции без изменения структуры, текстов, палитры и логики выбора шаблона. Страница раскрывается как последовательная история открытки, а не как статичное полотно.

## Инфраструктура анимаций

- Библиотеки анимаций не подключались. Используются `IntersectionObserver`, CSS transitions, `transform` и `opacity`.
- Новый модуль `src/components/scroll-reveal/`:
  - `useScrollReveal(options)` — хук, возвращает пропсы для spread на элемент (`{...reveal}`);
  - `<ScrollReveal variant delay duration step>` — обёртка для мест, где лишний `<div>` не ломает раскладку.
- Один общий `IntersectionObserver` на страницу (`threshold: 0.18`, `rootMargin: "0px 0px -8% 0px"`). Reveal проигрывается один раз, после раскрытия элемент снимается с наблюдения.
- Варианты: `fade-up`, `fade-down`, `slide-left`, `slide-right`, `scale-in`, `stagger` (каскад прямых потомков с шагом `--reveal-step`).
- Начальное состояние ставится только на клиенте через `data-reveal` атрибут: без JS контент полностью видим, CLS отсутствует.
- Motion-токены в `globals.css`: `--motion-fast/normal/slow`, `--motion-ease-out`, `--motion-ease-soft`.
- Правила reveal объявлены через `:global(...)` внутри CSS-модуля: чистые attribute-селекторы без локального класса Turbopack отклоняет.

## Сценарии по секциям

- Header: логотип и служебная плашка — `fade-down`, задержка 100 мс между ними.
- Hero: каскад `fade-up` (eyebrow → заголовок → описание → кнопки → chips со stagger 60 мс); коллаж — `slide-right` 720 мс, затем плавание `translateY(-4px)` циклом 7 с.
- Секция 1 (шаблоны): карточки появляются навстречу (`slide-left` / `slide-right`, 120 мс между). Hover: `translateY(-4px)`, усиление тени, zoom превью `scale(1.015)`, 240 мс. Badge «✓ Выбрано» — `scale-in`.
- Секция 2 (анимация открытия): колонки с двух сторон; одноразовая декоративная мини-демонстрация конверта (~1050 мс: подъём на 11 px и возврат); стрелка схемы появляется fade'ом. Полная анимация по-прежнему запускается только кнопкой.
- Секция 3 (глазами получателя): коллаж `slide-left` + лёгкий scale, текст `slide-right`, список stagger 70 мс, галочки `scale-in`. Лёгкий parallax только для двух слоёв коллажа (5 px / 2.5 px), только desktop ≥ 1100 px.
- Нижний CTA: `fade-up` + `scale-in` (0.975 → 1, 520 мс); иконка, затем текст, затем кнопка; одноразовый highlight кнопки (подъём на 2 px).
- Scroll-progress индикатор (P2): компактные точки сбоку, активный шаг отслеживается отдельным observer'ом, скрыт на экранах < 1100 px, клик плавно скроллит к секции.

## Мобильная версия и reduced motion

- На ≤ 640 px `slide-left/right` деградируют до `fade-up`, длительность reveal ≤ 450 мс, parallax отключён.
- В медиазапросах правило `[data-reveal-visible="true"]` повторяется после переопределений начального transform — иначе элементы «застревают» в начальном состоянии из-за равной специфичности и порядка источника.
- `prefers-reduced-motion: reduce`: все элементы сразу видимы, плавание, parallax, мини-демо конверта и highlight отключены (JS и CSS), функциональные состояния работают.
- Горизонтальный overflow исключён: `.page` получил `overflow-x: clip` (hero-коллаж с `scale(1.2)` выходил за пределы viewport на мобильном).

## Query-параметр шаблона и связь с главной

- `/example?template=paper|route` (а также канонические `paper-birthday` / `route-adventure`) предвыбирает шаблон через `searchParams` в серверном `page.tsx` и проп `initialTemplateId`.
- Hero главной: кнопка «Посмотреть, как это выглядит» ведёт на `/example` (ранее якорь `#templates`).
- Карточки шаблонов на главной: действие «Открыть интерактивный пример» → `/example?template=<id>` (только для активных шаблонов).

## Телеметрия

События добавлены в `clientEvents` (`src/lib/telemetry.ts`), ключи контекста расширены `step` и `template`:

- `demo_page_view` — один раз при монтировании;
- `demo_template_selected` — при смене выбранного шаблона;
- `demo_animation_started` — при запуске демо;
- `demo_card_opened` — по факту открытия открытки (новый опциональный колбэк `onIntroDone` у `GiftIntro`, срабатывает и при «Пропустить»);
- `demo_create_clicked` — submit форм «Создать такую же» / «Создать открытку»;
- `demo_scroll_step_viewed` — один раз за просмотр для каждого шага (`template` / `animation` / `recipient_view`).

## Проверка

- `npm run lint` — чисто; `npm run build` — успешно; `npm test` — 297/298 (одно ранее существующее падение в `src/lib/ai/service-greeting.test.ts`, к задаче отношения не имеет).
- Playwright-прогон (`scripts/capture-example-page.mjs`, скриншоты в `screenshots/example-motion/`): каскад hero, карточки с разных сторон, мини-демо конверта, stagger списка, scale-анимация CTA, отсутствие повторного reveal при прокрутке вверх, отсутствие горизонтального overflow на 1440 px и 390 px, `prefers-reduced-motion`, предвыбор шаблона по query-параметру, отправка событий телеметрии.
