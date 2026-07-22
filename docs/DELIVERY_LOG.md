# Журнал поставки

## Update 2026-07-22 Join Page Unified Greeting Form And Poll After Submit

1. Страница `/join` перестроена в один основной сценарий: единый блок «Ваше поздравление» (имя, подпись, текст, согласие, кнопка «Подарить слова»); отдельная форма «Нужна помощь с текстом?» удалена, вход в ИИ — кнопка «Помочь с текстом» в тулбаре редактора рядом со счётчиком символов и «Отменить замену».
2. Правая колонка — динамическая панель состояний `HINTS / AI_LOADING / AI_RESULTS / AI_ERROR` со стабильной структурой header/content/footer: подсказки «О чём можно написать» с циклическими примерами, skeleton-загрузка, вкладки «Аккуратно / Теплее / Живее», «Получить ещё», счётчик генераций в footer.
3. Голосование за подарок переведено на сценарий «сначала поздравление → потом опрос»: до отправки опрос не вытесняет подсказки (только неинтерактивный тизер «После поздравления можно помочь выбрать подарок»), после отправки появляется приглашение «Перейти к голосованию», раскрывающее полноширинную inline-секцию ниже формы (плавный scroll + перенос фокуса); bottom sheet и модальные сценарии удалены.
4. Блок «Уже добавили» заменён компактной лентой карточек с автоскроллом (marquee, пауза на hover, `prefers-reduced-motion`).
5. Mobile-полировка: уплотнённые вертикальные ритмы, устойчивая двухколоночная сетка кнопок «Отменить замену» / «Помочь с текстом» на 360 px, иерархия действий результата («Использовать вариант» заметнее «Получить ещё»), disabled-state главной кнопки (настоящий атрибут `disabled`, терракотовая палитра), safe-area.
6. Серверная часть не менялась: `src/lib/ai/**`, API генерации и опроса, лимиты, валидация и env сохранены; «Интерактивный пример» и «Напомнить заранее» не затронуты.
7. Проверки: ESLint и production build проходят; Vitest — 306 тестов зелёные, включая 11 новых сценариев панели и post-submit опроса (`join-poll-flow.test.tsx`); 14 падений в `src/lib/ai/service-greeting.test.ts` — прежний WIP, к задаче не относится.
8. Коммиты серии: `56fd330`…`0066e84` (10 коммитов), пуш и деплой — по отдельной команде.

## Update 2026-07-20 Best Phrases Guardrails And Paper Cleanup

1. The `Best phrases` block is available only after at least six greetings are collected. The manager explains this requirement without showing a partial set of cards.
2. The AI now proposes six candidates and the application publishes exactly three validated phrases. Each phrase targets 55–80 characters, never exceeds 100 characters, and cannot contain an ellipsis or be cut programmatically.
3. Existing quotes that do not meet the current validation rules are withheld until the manager regenerates a complete valid set of three.
4. The pink and beige watercolor-stain assets are disabled for the Paper Classic template on every viewport.
5. Checks: focused Vitest suite, ESLint, and production build passed.

## Update 2026-07-20 Paper Classic Desktop Greeting Polaroids

1. Для шаблона «Бумажный классический» закреплена отдельная desktop-композиция фотографий в блоке «Поздравления»; mobile-вёрстка не наследует эти правила.
2. Во всех схемах горизонтальные фотографии обрезаются через `object-fit: cover` внутри полароида, а подпись размещается в увеличенном нижнем поле и помещает две строки без обрезания.
3. Схема из трёх фото использует компактные одинаковые рамки, которые целиком помещаются в высоту правой колонки.
4. Схема из двух фото использует увеличенные рамки и фото, контролируемый вертикальный отступ и лёгкий чередующийся наклон; размеры рамки и изображения настраиваются независимо.
5. Проверка после изменений: ESLint проходит.

## Update 2026-07-19 Route Template And Manage Media Polish

1. Шаблон «Маршрут» доведён до готовности для проверки на реальных открытках: обновлены desktop- и mobile-композиции блоков, полароидов, подвала и декоративных ассетов.
2. В блоке поздравлений поддерживаются три варианта фото: одно вертикальное фото показывает три карточки слева с прокруткой остальных; два или три горизонтальных фото показывают четыре карточки.
3. Подписи фотографий ограничены 45 символами, размещаются в компактном двухстрочном поле полароида и сохраняются с debounce-автосохранением.
4. В manager тип фото расположен под выбором блока, меню действий закрывается при клике вне него и по Escape, а удаление фото работает без вложенной формы.
5. Схема выбора вертикального фото в manager отражает фактическую компоновку: три сообщения слева и одна вертикальная фотография справа.
6. Превью шаблонов «Маршрут» и «Бумажный классический» унифицированы по размеру в manager; карточки на главной используют корректные изображения.
7. Исправлены фоновые ассеты карточек поздравлений в схемах «В один ряд» и «В два ряда»: декоративные изображения полностью помещаются в карточку.
8. Проверки после изменений: ESLint и production build проходят.

## Update 2026-07-07 Final Card Responsive Polish And Media Caption Reliability

1. Мобильная финальная открытка `/gift/[finalSlug]` выровнена по единому правилу: бумажные подложки максимально приближены к краям, но рваные границы остаются видимыми.
2. Hero адаптирован к имени в две строки; кнопка «Открыть поздравления» стала компактнее и сохраняет безопасную ширину на узком экране.
3. Блоки «Самые важные слова», «За что тебя ценят», «Моменты», «Поздравления» и «Лучшие фразы» получили скорректированные мобильные размеры подложек и внутренних областей.
4. В «Моментах» и фотоблоке поздравлений настроена мобильная композиция из одного большого и двух малых полароидов; декоративные рамки находятся поверх фотографий.
5. Подписи полароидов центрируются, переносятся на две строки и не расширяют desktop-сетку; одинаковое поведение используется на `/example` и `/gift/[finalSlug]`.
6. Счётчик поздравлений на мобильном расположен справа от заголовка, ссылка «Смотреть все поздравления» скрыта, а кнопка дозагрузки оформлена нейтрально в стиле открытки.
7. Дебаг-панель ассетов на desktop вынесена рядом с мобильным preview и при узком viewport изначально свёрнута, чтобы не перекрывать открытку.
8. Исправлено автосохранение подписей фотографий: вместо пропуска последних изменений из-за временного ограничения используется debounce 600 мс после завершения ввода.
9. Проверки после изменений: ESLint, профильные Vitest-тесты и production build проходят.

## Update 2026-07-06 Stable Mobile Basics Form

1. Убрано автосохранение блока «Основа открытки», которое на мобильном могло перезагрузить manager и вернуть промежуточные значения полей.
2. Добавлена явная кнопка «Сохранить изменения» и понятный статус несохранённых данных.
3. Кнопка на мобильном занимает всю ширину; во время сохранения блокируется.
4. Проверено на viewport `390 x 844`: медленное заполнение не вызывает перезагрузку, значения сохраняются только по кнопке и остаются после reload.

## Update 2026-07-05 Free Beta End-To-End Audit

1. Локально пройден путь: главная -> создание -> manager -> приглашение -> OpenAI -> отправка поздравления -> модерация -> preview -> бесплатная публикация -> gift.
2. Проверены вход организатора и отправка обращения в поддержку; тестовое обращение успешно зарегистрировано.
3. Исправлен цикл автосохранения основы открытки: server action запускается только после изменения поля и внутри React transition.
4. Исправлен лимит AI для обычного участника: отсутствие главного поздравления больше не превращает лимит выбранной сетки в 500 символов.
5. После успешной отправки скрывается AI-блок вместе с временным черновиком и вариантами.
6. Исправлены пробелы и склонение счётчика участников в hero финальной открытки.
7. Desktop и mobile не имеют горизонтального переполнения на главной, manager, join и gift.
8. Оставшаяся ручная проверка: реальная загрузка фото с телефона и получение одноразовой email-ссылки.
9. Подробности: `docs/FREE_BETA_AUDIT_2026-07-05.md`.

## Update 2026-07-05 Example, Participant Value And Gift Intro Ready

1. Бесплатная beta уже включает публикацию открытки, поддержку, вход организатора, OpenAI-помощь с текстом, демонстрационную открытку и улучшенный сценарий участника.
2. Страница `/example` показывает ценность готовой открытки и подготовлена к добавлению новых шаблонов и вариантов анимации.
3. Нижняя часть `/join` дополнена переходом к примеру открытки и формой напоминания о будущем событии.
4. Intro-сцена `/gift/[finalSlug]` переведена на цельную анимацию длительностью 4,8 секунды: закрытый конверт плавно сменяется открытым, оборот открытки сразу находится внутри, затем открытка поднимается, раскрывается и переходит в полноценную страницу.
5. Для intro используются растровые ассеты закрытого и открытого конверта; дальнейшие фазы подъёма и раскрытия сохранены без изменений.
6. Анимация проверена локально в браузере, production build и TypeScript проходят.
7. Актуальный список обязательных работ до оплаты и платного запуска: `docs/PRE_PAYMENT_READINESS_2026-07-05.md`.

## Update 2026-07-02 Canonical WWW Domain

1. DNS и сертификаты для `darislova.ru` и `www.darislova.ru` корректны, но внешний HTTPS к apex нестабилен и фильтруется до Caddy.
2. Канонический production URL изменён на `https://www.darislova.ru`.
3. Production env, env-пример и health-check используют `www`; новые ссылки участников, manager, preview и gift должны строиться с `www`.

## Update 2026-07-02 OpenAI AI Flow Ready For Deploy

1. Генерация поздравлений участника переведена на универсальный режим `ladder`: «Аккуратно», «Теплее», «Живее».
2. Добавлены строгая проверка обращения и лимитов, один точечный retry и локальная коррекция небольших превышений без дополнительного AI-запроса.
3. Блоки «Лучшие фразы» и «За что тебя ценят» переведены на OpenAI Structured Outputs; GigaChat исключён из рабочей конфигурации.
4. «Лучшие фразы» выбирают содержательные части поздравлений без приветственных формул и ограничены 120 символами.
5. Локальная конфигурация и production-пример используют `AI_GREETING_MODE=ladder` и `AI_INSIGHTS_PROVIDER=openai`.
6. Полная проверка перед подготовкой deploy: 215 тестов и production build прошли; последующие точечные проверки AI-блоков также прошли.
7. Инструкция обновления VPS: `docs/DEPLOY_UPDATE_2026-07-02.md`.

## Update 2026-06-29 Gift Opening Animation

1. Для опубликованной страницы `/gift/[finalSlug]` добавлена вступительная сцена вручения открытки.
2. Сценарий анимации: печать исчезает, верхний клапан открывается и остаётся видимым, сложенная открытка показывается внутри кармана, поднимается, раскрывается и плавно переходит в настоящую открытку.
3. Внутри раскрывающейся открытки используется реальный выбранный шаблон, а не техническая заглушка.
4. Оборот оформлен в стиле бренда `Дари слова`; в закрытом конверте открытка не просвечивает.
5. Анимация проигрывается один раз за сессию, поддерживает пропуск, повторное открытие и `prefers-reduced-motion`.
6. Для локальной проверки доступен параметр `?forceIntro=1`; в production он не включает неопубликованную открытку.
7. Проверено в браузере на desktop и mobile; ошибок в консоли нет, `npm run build` проходит.
8. Следующий шаг: развернуть коммит на VPS и пройти анимацию на реальном телефоне.

## Update 2026-06-24 Full Production Flow Verified

1. На `https://darislova.ru` вручную пройден полный пользовательский путь:
   - создание открытки;
   - управление через `/manage/[manageToken]`;
   - добавление поздравления через `/join/[slug]`;
   - просмотр финальной открытки через `/gift/[finalSlug]`.
2. После добавления production route для `/uploads/cards/*` фотографии корректно открываются в админке и финальной открытке.
3. Актуальный бренд для MVP: `Дари слова`, домен: `darislova.ru`.
4. Следующий продуктовый шаг: довести публичные тексты и экран участника до более теплого и понятного состояния, затем проверить повторный production flow после выкладки.

## Update 2026-06-24 Production Launch On darislova.ru

1. Куплен и выбран основной домен MVP: `darislova.ru`.
2. DNS настроен на VPS `168.222.141.120`:
   - `darislova.ru` -> `168.222.141.120`;
   - `www.darislova.ru` -> `168.222.141.120`.
3. Проект открыток развернут на VPS в `/home/deploy/capsule`.
4. Production stack `capsule` поднят отдельно от Prognozist:
   - `capsule-postgres-1` healthy;
   - `capsule-web-1` healthy;
   - web опубликован только локально: `127.0.0.1:3100->3000`.
5. PostgreSQL migration `0001_initial_mvp_flow.sql` применена через `npm run db:migrate`.
6. Caddy из production stack Prognozist подключен к Docker network `capsule_default`.
7. В Caddy добавлен site block для `darislova.ru, www.darislova.ru`, reverse proxy идет на `capsule-web-1:3000`.
8. Caddy автоматически выпустил HTTPS-сертификаты для `darislova.ru` и `www.darislova.ru`.
9. Проверено:
   - `curl -I https://darislova.ru` -> `HTTP/2 200`;
   - `curl -I https://www.darislova.ru` -> `HTTP/2 200`;
   - создание открытки с лендинга открывает `/manage/[manageToken]`;
   - `/join/[slug]` открывается.
10. Ручной backup прошел успешно:
    - `postgres-*.sql.gz`;
    - `uploads-*.tar.gz`;
    - `.sha256`;
    - `latest` symlinks.
11. Настроен ежедневный root cron backup:
    - `35 3 * * * cd /home/deploy/capsule && BACKUP_DIR=/home/deploy/capsule/backups RETENTION_DAYS=14 bash infra/scripts/run-nightly-backup.sh >> /var/log/capsule-backup.log 2>&1`.
12. Production health check прошел:
    - `BASE_URL=https://darislova.ru bash infra/scripts/check-production-health.sh`;
    - результат: `Production health checks passed`.

## Update 2026-06-23 Handoff and landing create CTA

1. Добавлен `docs/PROJECT_HANDOFF_2026-06-23.md` — его нужно читать первым в новом чате.
2. Кнопка `Создать открытку` на `/` больше не ведет на старый `/create`; теперь она создает новый пустой черновик и открывает `/manage/[manageToken]`.
3. Старый `/create` оставлен как отдельный резервный маршрут, но не является основным стартом MVP-flow.
4. Проверено в браузере: после клика с лендинга открыт новый manage URL.
5. `npm.cmd run build` прошел успешно после правки.
6. Skill `make-interfaces-feel-better` установлен в `C:\Users\zapra\.codex\skills\make-interfaces-feel-better`, но текущая сессия Codex его не видит как активный skill; в новом чате нужно проверить еще раз.

## Update 2026-06-18 Scrapbook Debug Controls

1. В `debugAssets=1` для component-ассетов добавлены настройки `width`, `maxWidth` и `rotate`.
2. Размер quality tags больше не блокируется старым фиксированным CSS-правилом на `220px`.
3. Бумага summary и плашки качеств теперь используют настраиваемый поворот из конфига, а не только жесткий CSS.
4. Component-ассеты получили `zIndex`, импорт полного JSON-конфига и локальное сохранение настроек в браузере.
5. `rotate` теперь крутит бумажный слой ассета, а `padding` применяется к живому контенту внутри него.
6. Сохранены актуальные настройки scrapbook из debug-конфига и добавлены paper layers для `messages`, `memories`, `ai-summary` и `closing`.
7. Локальный debug-конфиг теперь сливается с дефолтом, чтобы новые ассеты не пропадали после старого `Paste config`.
8. Убраны конфликтующие старые подложки у component-ассетов scrapbook: листы `hero`, `summary`, `messages`, `memories`, `ai-summary` и `closing` теперь настраиваются единым бумажным слоем.
9. В `debugAssets=1` добавлены отдельные настройки внутреннего бумажного слоя `paperTop/Left/Right/Bottom/Width/Height`, а также component-ассеты для карточек поздравлений и polaroid-рамок фото.
10. Component-ассеты переведены с конфликтующего `::before` на реальные слои: бумажные ассеты рендерятся под контентом, а polaroid-рамки поверх фото.
11. Добавлена защита от случайного исчезновения листов при `paperWidth/paperHeight` около `1px`; новый debug-конфиг применен с сохранением видимости базовых paper layers.
12. Локальные debug-настройки базовых листов теперь санитизируются при загрузке: крупные inset-ы и фиксированные размеры листа не могут скрыть `Hero Paper`, `Summary Paper` и `AI Summary Paper`.

## Сделано

### 2026-06-13

1. Зафиксированы постоянные рабочие правила проекта.
2. Зафиксирован урезанный продуктовый контур MVP 1.0.
3. Зафиксированы 4 базовых шаблона для первой версии.
4. Создан журнал решений и журнал поставки.
5. Инициализирован локальный git-репозиторий.
6. Добавлен базовый `.gitignore`.
7. Сделан первый локальный коммит с базовыми правилами и продуктовой рамкой.
8. Добавлена памятка по подключению удаленного GitHub-репозитория.
9. Подключен `origin` к GitHub-репозиторию `barsev174-star/capsule_of_congratulations`.
10. Зафиксирована поэтапная дорожная карта разработки блоками.
11. Git remote переведен на SSH и push подтвержден пользователем как рабочий.
12. Собран каркас приложения на `Next.js + TypeScript`.
13. Настроены `ESLint` и `Vitest`.
14. Добавлено базовое структурированное логирование.
15. Добавлен стартовый лендинг и технические страницы-заглушки для следующих блоков.
16. Реализована форма создания открытки.
17. Добавлена серверная валидация формы.
18. Реализован выбор одного из 4 шаблонов в сценарии создания.
19. Добавлено локальное сохранение черновика открытки.
20. Реализован API-обработчик создания открытки.
21. Добавлены тесты для валидации сценария создания.
22. Реализована публичная страница участника по `publicSlug`.
23. Добавлена форма отправки поздравления.
24. Реализована серверная валидация поздравления.
25. Добавлено локальное сохранение поздравлений.
26. Реализован API-обработчик добавления поздравления.
27. Добавлены тесты для валидации поздравлений.
28. Ужесточена проверка слишком пустых поздравлений.
29. Добавлен AI-помощник для черновиков поздравления.
30. Реализован AI API-обработчик с лимитами на открытку.
31. Добавлено логирование AI-генераций.
32. Добавлены тесты для AI-валидации и AI-сервиса.
33. Улучшена естественность AI-черновиков и очищены грубые подстановки.
34. Реализована секретная страница организатора по `manageToken`.
35. Добавлено управление статусами поздравлений: показать, скрыть, удалить.
36. Добавлен базовый предпросмотр открытки для организатора.
37. Добавлен текст напоминания для чата организатора.
38. Доработан AI-генератор с учетом замечаний по роли участника и неестественным вставкам.
39. Добавлена фильтрация сомнительных личных деталей в AI-черновиках.
40. Добавлены тесты на естественность AI-ответа.
41. Добавлена вариативность повторных AI-генераций по одной открытке.
42. Добавлена защита от слепого переноса роли получателя в текст поздравления.
43. Исправлены неестественные конструкции вроде `спасибо за доброта`.
44. Зафиксирована архитектура визуальных блоков финальной открытки.
45. Добавлен технический скелет block-based системы шаблонов в коде.
46. Добавлены тесты для планировщика блоков финальной открытки.
47. Собран первый настоящий финальный экран на block-based архитектуре.
48. Добавлен view-model слой для финальной открытки.
49. Реализован маршрут `/gift/[finalSlug]`.
50. Добавлены тесты для сборки финального view-model.
51. Убран жесткий сценарий создания через справочник `учитель / воспитатель / коллега`.
52. Добавлено поле живого повода `occasionText` в создании открытки.
53. Пересобран путь создания: создание -> ссылка участника -> ссылка организатора -> финальный экран.
54. AI-помощник переведен на контекст открытки, а не на жесткую роль получателя.
55. В админке и финальном экране теперь показывается реальный повод открытки.
56. Упрощен AI-помощник участника: вместо роли и чекбоксов оставлено одно поле мыслей своими словами.
57. На странице организатора зафиксировано место будущего выбора блоков финального экрана.
58. Убран ряд грубых ошибок шаблонного AI вроде ломаных пожеланий и неудачных связок с поводом.
59. Добавлено редактирование текста поздравлений на странице организатора.
60. Добавлен выбор необязательных блоков финального экрана на странице организатора.
61. Настройки блоков теперь сохраняются в данных открытки и влияют на `/gift/[finalSlug]`.
62. Усилен визуальный стиль финального экрана: обложка, карточки поздравлений, цитаты и финальный блок стали заметно выразительнее.

## Отложено

### 2026-06-13

1. PDF-экспорт.
2. Реакции на поздравления.
3. Итоговый сводный текст “от всех”.
4. Фото в каждом поздравлении.
5. Несколько тарифов.
6. Большая SEO-сетка.
7. Полноценная бизнес-логика создания открытки.
8. Переход от локального хранения к полноценной базе данных.
9. AI-помощник поздравлений.
10. Замена внутреннего AI-генератора на внешнюю модель.
11. Оплата и публикация.
12. Полноценная модерация и управление статусами поздравлений.
13. Улучшение качества AI-черновиков на внешней модели.
14. Настройка действительно сильных AI-промптов после подключения внешней модели.
15. Реальная сборка финального экрана из новой block-based архитектуры.
16. Визуальная полировка и усложнение block-based экранов под сильные демо-сценарии.

## Новые идеи и хотелки

### 2026-06-13

1. Сохранить возможность печати и размещения открытки в рамке через будущий PDF-экспорт.
2. Рассмотреть аватары-шаблоны или инициалы вместо обязательных фото участников.
3. Не акцентировать маркетинг на AI-резюме, даже если такая функция будет добавлена рано.
4. Давать более подробные объяснения по терминалу, Git и инфраструктурным шагам, с расчетом на новичка.

## Открытые вопросы

### 2026-06-13

1. Какой стек будет выбран для реализации первой версии.
2. Какой точный прайс стартового тарифа выбрать: `399 ₽` или `490 ₽`.
3. Какой точный сценарий оплаты делаем первым: фиксация тарифа, экран оплаты или сначала только статус-заглушка.
## Update 2026-06-14

1. The landing page now supports the showcase-first product direction.
2. The visible `personal / team / celebration` selector was removed from the manage basics UI.
3. Blank manage drafts now include softer guided empty states.
4. AI generation now relies on `occasionText` plus template choice instead of an active `occasion` branch.
5. `Состав открытки` was rebuilt into a card-based block constructor with remove/restore behavior and inline message-layout controls.
6. `Состав открытки` was cleaned up into a single composition list with fixed `Обложка` and `Финал`.
7. Block reordering now uses clearer drag feedback with visible drop targets instead of a bare browser drag.
8. The `Оформление открытки` tab was rebuilt into a two-column studio with a richer hero, current-template card, and sticky preview rail.
9. The design tab was pushed closer to the target reference: template selection moved to the top card and composition blocks now use toggles plus expandable details.
10. The manage design screen was reworked again against the exact reference: compact stepper, cleaner template card, richer composition rows, and a more editorial sticky preview.
11. The `Поздравления и фото` tab was rebuilt toward the target layout:
    - a compact status strip now summarizes message and photo readiness;
    - congratulations are shown as cleaner accordion cards with visibility toggles and inline editing;
    - the right rail now uses a lighter preview card, a focused photo card, and product tips instead of technical utility panels.
12. Contribution ordering inside `Поздравления и фото` now uses drag-and-drop:
    - cards move by dragging the left handle instead of `up/down` buttons;
    - the dragged card gets a softer floating state;
    - the insertion point is highlighted so the new position is readable before drop.
 
## Update 2026-06-15

1. The organizer manage page is now treated as the main editor, split into two primary tabs:
   - `Оформление открытки` for basis, template, composition, message layout, and preview;
   - `Поздравления и фото` for message moderation, text editing, visibility, ordering, and media.
2. The old separate creation-step mental model is no longer the target flow: creation starts from the showcase landing page, then continues in the manage editor.
3. Contribution visibility now has explicit categories:
   - `Активные`;
   - `Скрытые`;
   - visual green/red badges inside each contribution card.
4. Changing a contribution status also changes its position:
   - active -> hidden moves the card to the end of the list;
   - hidden -> active moves the card to the end of the active group, before hidden cards.
5. Contribution cards collapse before status-based movement, so the list does not jump with a large expanded editor.
6. Drag-and-drop was refined in both tabs:
   - contribution cards are grabbed from the handle instead of feeling attached to the card center;
   - composition blocks in `Оформление открытки` use the same handle-based drag feel.
7. Current known local-only data caveat: `data/media-assets.json` may remain dirty during visual/media experiments and should not be included in unrelated commits.

## Next Product Candidates

1. Polish the right-side previews so both tabs feel like real card previews rather than admin summaries.
2. Implement the AI-generated common greeting from the team, tied to the optional `Общее поздравление` block.
3. Add stronger empty states for a brand-new draft with no contributions and no uploaded photos.
4. Add manual visual QA scenarios for status changes, drag ordering, and preview updates before moving to payment/publish flow.

## Update 2026-06-15 Preview Pass

1. The `Поздравления и фото` right rail preview now shows a mini card sequence instead of a single technical message card:
   - cover;
   - selected contribution;
   - closing block;
   - full preview link.
2. The `Оформление открытки` preview received a softer paper-like card treatment so both tabs feel closer to the final gift.
3. Remaining visual QA item: check the preview in the browser at real viewport sizes and tune spacing if needed.

## Update 2026-06-15 Manual Contribution Entry

1. The `Добавить вручную` button in `Поздравления и фото` now opens an organizer form for adding a message on behalf of someone who cannot use the participant page.
2. Manual entries use the same contribution validation rules as participant-submitted messages.
3. The overflow menu next to the button now has two practical organizer actions:
   - copy participant link;
   - copy invitation text.
4. Future menu candidates remain export, bulk actions, and filter reset, but they are intentionally not added until there is a clear need.
5. Manual entries now close the form after a successful submit and are placed at the end of the active contribution group, before hidden cards.

## Update 2026-06-15 Full Preview Tab

1. Added a third organizer tab: `Предпросмотр`.
2. The new tab embeds the real public `/gift/[finalSlug]` card instead of showing a mockup.
3. The preview tab includes:
   - the live public card inside the organizer workspace;
   - a readiness summary;
   - active block list;
   - warnings for long messages, missing media in media layout, and hidden contributions;
   - links to the public final version and back to editing.
4. Side previews remain as quick orientation helpers, while the `Предпросмотр` tab is the main final review surface.

## Update 2026-06-15 Media And Memories Flow

1. Moved final preview readiness/check sections above the embedded public card so the card has full width for review.
2. Stopped using uploaded media in the public card cover to avoid duplicated photos.
3. Restored `memories` as an optional organizer-controlled block in every final-card template.
4. Split uploaded media intent into message media slots and `Наши воспоминания` slots.
5. The content tab now prioritizes photo upload/management in the right rail instead of the narrow congratulations preview.
6. Memory photo captions are constrained to one line to keep the public section compact.

## Update 2026-06-15 Compact Photo Library

1. Replaced per-slot photo cards with two compact library groups: horizontal photos and vertical photos.
2. Added need/added counters to each photo group so the organizer sees how many images are still missing.
3. Kept existing slot storage underneath, but made the UI behave like a shared photo library for future block-level selection.
4. Tightened right-rail form styles so inputs and file controls stay inside the page bounds.

## Update 2026-06-15 Block Photo Selection

1. Added block-level photo selection inside `Оформление открытки`.
2. The `Поздравления` block now lets the organizer choose which uploaded photos appear in the media layout and in what order.
3. The `Наши воспоминания` block now has its own shared caption text and ordered photo selection.
4. Final card rendering now uses the selected photo order instead of fixed slot order.

## Update 2026-06-15 Asset-Based Photo Selection

1. Replaced block photo selection by fixed media slots with selection by concrete uploaded photo IDs.
2. Kept legacy slot-based settings as a fallback so existing drafts continue to render.
3. The `Поздравления` media block now selects photos from the matching uploaded library and preserves their order.
4. The `Наши воспоминания` block now selects up to three horizontal photos from the shared photo library and preserves their order.
5. Final card rendering now prefers selected asset IDs before falling back to old slot order.

## Update 2026-06-15 Memories Strip And Paper Birthday Template

1. Reworked the public `Наши воспоминания` block into a horizontal strip: text card on the left, selected photos on the right.
2. Added organizer control for memory photo count: 2 or 3 selected photos.
3. Final rendering now trims memory photos to the selected count.
4. Added the `paper-birthday` final-card template with warm paper, confetti, taped-photo and handwritten-style visual direction.
5. Registered the new template in card template selection and final-card layout planning.

## Update 2026-06-16 Paper Birthday Visual Pass

1. Fixed `3 horizontal photos` in the congratulations media block so all three selected images render.
2. Kept horizontal media in a wide 16:9 photo format instead of square-like cropping.
3. Moved the `paper-birthday` template closer to the reference with hero polaroids, taped photo cards, handwritten headings, and softer paper-style message cards.

## Update 2026-06-16 Paper Birthday Reference Details

1. Added a stronger decorative layer to the `paper-birthday` public card: heart marks, branch-like ornaments, side hero accents, and lightweight cake/bouquet-style objects.
2. Reworked the `Кристина глазами группы` summary into a shorter paper strip with a torn bottom edge, closer to the reference composition.
3. Reworked the `Какая ты для нас` qualities into separate tilted paper labels with varied warm colors and wider spacing.
4. Added extra paper/handmade accents around messages, memories, and quote sections so the template feels less like a clean admin layout and more like a crafted birthday card.
5. Remaining polish candidate: replace CSS-only decorative objects with real SVG/illustration assets for the cake, bouquet, branches, hearts, and handwritten notes if we want near-reference fidelity.

## Update 2026-06-16 Paper Birthday Decorative Layers

1. Added a dedicated decorative layer for the `paper-birthday` template instead of relying on one background image.
2. Split the visual language into reusable decorative objects: top confetti, sticker hearts, a sticky note, right-side confetti, dried-flower accents, and bottom corner ornaments.
3. Kept the public card block order intact; `Наши воспоминания` stays as a lower horizontal ribbon rather than moving into a side column.
4. Strengthened the reference look with a torn hero paper shape, polaroid-style hero accents, colored quality paper tags, greeting paper cards, camera/star title accents, and paper-like action buttons.
5. Added mobile safeguards so decorative elements are reduced or hidden when they could interfere with reading.

## Update 2026-06-16 Paper Birthday Layout Repair And Slots

1. Restored the `Поздравления` column-media layout so the block again shows four greetings in the left scroll column and three selected photos in the right rail.
2. Added explicit decorative photo-slot objects for the hero: a left cake polaroid and a right flower polaroid.
3. Moved decorative hero objects behind the meaningful title/content layer so the card stays readable while keeping the scrapbook look.

## Update 2026-06-16 Scrapbook Asset Integration

1. Added the available scrapbook PNG assets to the public template asset pipeline so the final card can use real decorative resources instead of one flattened image.
2. Generated clean public asset copies with the baked checkerboard background removed from frame/paper assets.
3. Connected real paper texture, torn-paper sections, sticky note, and polaroid frame assets to the `paper-birthday` template while keeping names, texts, photos, greetings, captions, and buttons as live HTML content.
4. Kept the existing section structure intact: the scrapbook assets only decorate the template and do not replace dynamic content or rearrange organizer-selected blocks.
5. Remaining visual polish: replace or adjust the current polaroid-frame assets if we want larger visible photo areas closer to the reference.

## Update 2026-06-16 Additional Scrapbook Assets

1. Processed the newly added scrapbook assets with baked checkerboard backgrounds into clean public PNGs.
2. Connected real dried-flower assets to the decorative layer and section accents.
3. Connected paper tag assets to the `Какая ты для нас` quality labels.
4. Connected greeting-card and quote-card assets to the live congratulations and best-phrase cards without replacing text content.
5. Kept the existing polaroid layout unchanged while evaluating the new assets in the public final card.

## Update 2026-06-16 Expanded Scrapbook Asset Set

1. Added the remaining scrapbook decorative assets to the `paper-birthday` public template: puffy hearts, taped strips, watercolor stains, hero cake/bouquet polaroids, extra quote-card papers, and the footer floral cluster.
2. Kept all meaningful content live in HTML: recipient name, organizer text, greetings, media photos, memory captions, and action buttons are not flattened into a single background image.
3. Replaced CSS-only hero/photo decorations where real assets are now available, while preserving the current polaroid and memory-strip layout for further visual tuning.
4. Removed accidental utility-only generated files from the public clean asset set so only usable template resources are shipped.
5. Remaining polish candidate: tune asset scale, density, and exact placement against the reference after reviewing the full card visually.

## Update 2026-06-16 Paper Birthday Hero Scale Pass

1. Reworked the `paper-birthday` hero title into a two-line live heading: recipient name first, occasion/context as a handwritten second line.
2. Increased the hero stage height and decorative photo scale so the top block feels closer to the reference poster instead of a compact banner.
3. Added small heart/ray doodles around the title and softened the hero meta pills to better match the handmade scrapbook direction.
4. Kept the title and occasion editable through existing card data; no static title image was introduced.

## Update 2026-06-16 Paper Birthday Hero Screenshot Fix

1. Adjusted the hero decorative polaroids after visual review so the left cake photo no longer covers the first letter of the recipient name.
2. Reduced the hero height, service note, and right-side info card scale so the top block feels less cramped and more balanced.
3. Kept the handmade title treatment from the previous pass while making the composition safer for real recipient names and longer occasions.

## Update 2026-06-16 Paper Birthday Hero CTA Pass

1. Removed the temporary right-side `Собрано для тебя` and `Повод` cards from the hero so the header no longer feels like an admin panel.
2. Recentered the live heading on the paper sheet, increased the torn-paper backdrop scale, and removed the conflicting abstract square decoration near the title.
3. Replaced the old pills under the description with a reference-style participants block and a red `Открыть поздравления` button that links to the congratulations section.

## Update 2026-06-16 Paper Birthday Hero Density Pass

1. Removed the top `Открытка от всей группы` line from the hero to free up vertical space.
2. Pulled the hero content and the next summary block higher so the first screen uses the paper sheet area more efficiently.
3. Tightened the participants block typography and reduced the red CTA button height so both controls sit more naturally inside the hero paper composition.

## Update 2026-06-16 Paper Birthday Hero Paper Coverage

1. Reduced the live hero title scale slightly so long recipient names and occasion lines breathe more naturally.
2. Extended the torn-paper coverage lower in the hero so the description and CTA row visually stay inside the same paper block.
3. Forced the red CTA button into strict flex centering so `Открыть поздравления` stays centered both vertically and horizontally.

## Update 2026-06-16 Paper Birthday Hero Single-Line CTA

1. Removed the residual side offset from the live hero title lines so the recipient name and occasion sit more symmetrically in the center.
2. Added a dedicated torn-paper layer to `heroMain`, so the subtitle and CTA row visually belong to the same paper block as the heading.
3. Locked the participants block and the red CTA button into a single desktop row, with a mobile-only wrap fallback.

## Update 2026-06-16 Paper Birthday Hero Single Paper Fix

1. Removed the extra torn-paper background from `heroMain` after visual review showed a duplicated paper sheet.
2. Extended the main hero torn-paper layer lower so the subtitle and CTA row remain inside the same visible paper block.

## Update 2026-06-16 Paper Birthday Hero Paper Scale

1. Expanded the main torn-paper layer vertically so it better matches the intended full sketch-paper silhouette behind the hero content.

## Update 2026-06-16 Paper Birthday Hero Adaptive Paper

1. Added hero paper sizing modes tied to recipient-name shape so short one-line names use a more compact sheet while longer names keep a larger paper backdrop.
2. Increased the default and expanded paper sizes so the hero torn-paper layer better matches the intended sketch outline.

## Update 2026-06-16 Paper Birthday Hero Background Cleanup

1. Removed the old beige hero underlay so only the torn-paper asset remains visible behind the hero content.
2. Started the middle-section polish by widening the summary paper strip and spreading the quality tags more evenly across the available width.

## Update 2026-06-16 Scrapbook Torn Paper Swap

1. Swapped the hero torn-paper asset to `torn-paper-section1.png` to try a cleaner paper silhouette for the scrapbook template.

## Update 2026-06-16 Scrapbook Middle Section Polish

1. Expanded the `РіР»Р°Р·Р°РјРё РіСЂСѓРїРїС‹` torn-paper strip so the title and summary text have more horizontal breathing room.
2. Removed the extra dried-flower accent from the summary strip to keep the paper edges cleaner and closer to the reference.
3. Reworked the `РљР°РєР°СЏ С‚С‹ РґР»СЏ РЅР°СЃ` paper tags from equal-width columns into intrinsic paper labels so they no longer feel stretched across the row.
4. Increased spacing and card height in `Р›СѓС‡С€РёРµ С„СЂР°Р·С‹` so the three quote cards read more like separate scrapbook notes instead of compressed tiles.

## Update 2026-06-16 Scrapbook Asset Cleanup Pass

1. Removed the extra color underlay from the `РіР»Р°Р·Р°РјРё РіСЂСѓРїРїС‹` strip and let the torn-paper asset carry the shape by itself.
2. Switched the `РљР°РєР°СЏ С‚С‹ РґР»СЏ РЅР°СЃ` labels from the tag-with-hole asset to the shorter torn-paper strip asset, which fits the reference better.
3. Removed the extra gradient fills from `Р›СѓС‡С€РёРµ С„СЂР°Р·С‹` so the quote-paper assets render directly without muddy underlayers.
4. Replaced the broken public pink quote asset copy with the original transparent source to eliminate the dark background bleed.

## Update 2026-06-16 Scrapbook Midsection Scale Pass

1. Enlarged the `РіР»Р°Р·Р°РјРё РіСЂСѓРїРїС‹` torn-paper asset and explicitly removed the inherited card border/radius so the leftover contour no longer fights the paper edge.
2. Connected the new `paper-tag-short1/2/3` assets to `РљР°РєР°СЏ С‚С‹ РґР»СЏ РЅР°СЃ`, including a repeated use of `paper-tag-short1`, and increased both tag scale and label typography.
3. Replaced the pink quote card public copy with the new source asset and increased background scale for all three quote cards so the paper artwork reads larger and cleaner.

## Update 2026-06-16 Scrapbook Midsection Uniformity Pass

1. Moved the small heart on the `РіР»Р°Р·Р°РјРё РіСЂСѓРїРїС‹` strip inward so it now sits on the paper near the live heading instead of hanging off the edge.
2. Locked the `РљР°РєР°СЏ С‚С‹ РґР»СЏ РЅР°СЃ` labels to one shared size with larger height and typography, so the whole row uses the available space more evenly.
3. Switched the pink quote card to a versioned public file path to break browser cache and enlarged all quote-paper backgrounds to one larger shared scale.

## Update 2026-06-16 Scrapbook Debug Assets Panel

1. Moved scrapbook decorative floating assets into a shared config file with explicit position, size, rotation, opacity, z-index, visibility, and mobile override fields.
2. Replaced the hardcoded `paperDecor` span list with config-driven rendering through a dedicated scrapbook decor layer component.
3. Added a development-only `?debugAssets=1` panel on the public gift page so decorative assets can be tuned live in the browser without editing CSS.
4. Added `Copy config` support that copies the current in-browser asset JSON, making it easy to send back final tuned values.
5. Switched confetti decorations to versioned public SVG assets so copied config stays readable instead of embedding large data URLs.

## Update 2026-06-17 Universal Visual Tuning Phase 1

1. Promoted the scrapbook debug-assets tooling into the first reusable layer for future final-card themes: config-driven floating visuals, live browser editing, desktop/mobile overrides, and JSON export.
2. Kept all meaningful content live in HTML while moving only visual scrapbook decoration into the debugged asset layer, so the same approach can be extended to other templates later.
3. Locked the debug panel behind development mode plus `?debugAssets=1`, making it safe for production while still usable for visual calibration.
4. Left section-anchored assets and component-background tuning for the next phase, so the current base remains small, testable, and easy to extend.

## Update 2026-06-17 Universal Visual Tuning Phase 2

1. Added section anchors for scrapbook floating assets: `templateRoot`, `hero`, `summary`, `qualities`, `greetings`, `memories`, `bestPhrases`, and `footer`.
2. Reworked scrapbook debug rendering into a shared provider so multiple decor layers can read one live config and still update instantly from a single panel.
3. Attached decor layers directly to the corresponding content sections, so visual elements now move with their block when the layout height changes.
4. Added asset grouping plus live `anchor` reassignment inside the debug panel, making the tuning flow noticeably closer to a universal template-adjustment tool.
5. Kept this phase limited to floating visuals only; component backgrounds, paper sheets, frames, and per-block inset tuning remain the next extension point.

## Update 2026-06-17 Universal Visual Tuning Phase 3

1. Added the first reusable component-asset layer for scrapbook sections in addition to floating decor.
2. The public `paper-birthday` card can now tune live paper assets for:
   - hero paper;
   - summary paper;
   - qualities title strip;
   - quality tags;
   - quote cards.
3. Component assets now have live debug controls for background size, position, opacity, inner paddings, and minimum height, with mobile overrides included.
4. Rebuilt those scrapbook surfaces to render as live HTML content inside configurable paper frames instead of depending only on hardcoded CSS backgrounds.
5. The debug panel still remains dev-only and now works as a side dock, so visual tuning is practical while the card stays visible.

## Update 2026-06-18 Scrapbook Paper Layer Fix

1. Fixed component paper layers that disappeared when debug config used `auto` or tiny placeholder values for paper width and height.
2. Paper-layer `auto` sizing now renders as full-frame sizing, so Hero Paper, Summary Paper, and AI Summary Paper stay visible while still accepting live debug tuning.

## Update 2026-06-18 Scrapbook Asset Cleanup

1. Restored `paperRight` tuning for component paper layers by letting `auto` paper sizes stretch between the configured paper offsets.
2. Cleaned generated public scrapbook paper assets so checkerboard backgrounds around torn sheets, tags, quote cards, and greeting cards render as transparent pixels.

## Update 2026-06-18 Scrapbook Paper Config Import

1. Applied the tuned Hero Paper debug values to the source scrapbook visual config.
2. Gave Summary Paper and AI Summary Paper explicit paper-layer sizes and offsets so their torn-paper sheets render reliably like Hero Paper.
3. Added a small debug-config migration so older locally saved `auto` paper sizes are restored to the current sized defaults on load.

## Update 2026-06-18 Scrapbook Paper Layer Stabilization

1. Made every scrapbook component asset frame its own isolated stacking layer so paper backgrounds stay visible behind live text.
2. Added explicit Closing Paper layer sizing and offsets, matching the same paper-layer model used by Hero, Summary, and AI Summary.
3. Extended debug-config migration to repair old broken paper offsets such as oversized `paperRight` values that pushed paper sheets away from their content.

## Update 2026-06-22 MVP-flow Kickoff

1. Froze the current scrapbook design direction as the baseline for the next product phase.
2. Added card lifecycle statuses: `draft`, `collecting`, `ready`, and `closed`.
3. Added organizer controls for status switching and the three core links:
   - participant link;
   - manage link;
   - final gift link.
4. Added copy buttons for those links in the organizer screen.
5. Made the participant API reject new contributions when the card is `closed`.
6. Added a closed-state message on the participant page.
7. Turned the final-card bottom buttons into MVP actions:
   - “Спасибо” shows a local confirmation;
   - “Сохранить открытку” opens browser print/save;
   - “Создать такую же открытку” goes to creation.
8. Kept AI, payment, registration, service admin, and persistent production storage out of the immediate MVP-flow.

## Update 2026-06-23 MVP Storage And Draft Clarity

1. Prepared PostgreSQL as the production-ready data path while preserving JSON storage for local development without `DATABASE_URL`.
2. Added the first SQL migration plus `npm run db:migrate`.
3. Limited each card to 6 uploaded photos and documented the split between greeting photos and the “Моменты” block.
4. Added `.env.example` for the current environment contract.
5. Fixed the new-card manage screen so empty drafts no longer look like the old filled demo card.

## Update 2026-06-23 Local Uploads Storage Layer

1. Moved card photo file writes into `src/lib/media/local-card-media-storage.ts`.
2. Kept the first VPS storage target as `public/uploads/cards`.
3. Limited physical file deletion to the uploads root for safer metadata cleanup.
4. Kept media metadata in the active repository mode: JSON locally or PostgreSQL with `DATABASE_URL`.
5. Documented uploads backup and manual verification steps for the VPS path.

## Update 2026-06-23 Single Domain MVP Routes

1. Accepted one-domain MVP routing with `darislova.ru` as the production base URL.
2. Added route helpers for join, manage, preview, and gift links.
3. Added `/join/[slug]` as the participant route and kept `/card/[slug]` as a compatibility redirect.
4. Added `/preview/[manageToken]` as an organizer preview redirect.
5. Restored `/create` as the explicit creation screen and moved the landing CTA there.

## Update 2026-06-23 Production Compose Prep

1. Added `Dockerfile.prod` for a Next.js production container.
2. Added `docker-compose.prod.yml` with separate `web` and `postgres` services under project name `capsule`.
3. Added `.env.production.example` for VPS deployment.
4. Added `.dockerignore` to keep local build artifacts, JSON data, uploads, and secrets out of Docker build context.
5. Documented how this stack should live beside Prognozist without taking over ports `80/443`.

## Update 2026-06-23 Production Operations Prep

1. Added PostgreSQL backup script.
2. Added uploads backup script for `public/uploads/cards`.
3. Added nightly backup wrapper with checksums and latest symlinks.
4. Added old-backup cleanup script.
5. Added production smoke-check script for `/` and `/create`.

## Update 2026-06-29 GigaChat Greeting Provider

1. Added the backend-only `mock | gigachat` provider switch and `/api/ai/generate-greeting` endpoint.
2. Connected GigaChat OAuth with token caching, timeout handling and verified Ministry of Digital Development TLS certificate.
3. Moved AI usage accounting to PostgreSQL with atomic per-card reservation.
4. Added free/paid limits of 5/30 actions, where the paid limit depends on a paid order.
5. Made generated message length follow the selected card-grid limit.
6. Added draft validation, provider-response validation and duplicate checks against visible greetings.
7. Added temporary draft/variant storage that is cleared after the greeting is submitted while usage metadata remains.
8. Verified OAuth, a real chat request, the application endpoint, paid-limit switching and draft cleanup locally.
9. Added deployment and verification notes in `docs/AI_GIGACHAT_2026-06-29.md`.

## Update 2026-07-04 Join Page Final Polish

1. Reduced heading font sizes in the `/join` value-preview and reminder blocks so the lower CTA section no longer shouts.
2. Removed the recipient name from the example preview card; added a gold puffy-heart seal so the mini-card reads as a polished gift preview rather than a specific person.
3. Enriched the example preview visual with a floral footer accent and cleaner composition while keeping it lightweight.
4. Used the envelope asset from `docs/для анимации.png` as a soft decorative object inside the reminder block.
5. Simplified the reminder form to four fields (`Кого поздравить?`, `Повод`, `Дата`, `Email`) and removed the single-option channel selector.
6. Added helper text under the reminder form: "Пришлём письмо заранее, чтобы вы успели собрать открытку от всех."
7. Verified desktop and mobile layouts with `scripts/capture-gift-screenshots.mjs`; no horizontal scroll, no clipped preview.
8. `npm run build` passes.

## Update 2026-07-03 Participant Value Preview And Event Reminders

1. Added `/example` with a complete static birthday card assembled from six demo photos.
2. Added the participant value-preview block linking to the example card.
3. Added the optional "Есть повод скоро?" form with consent, validation, rate limiting and duplicate protection.
4. Added PostgreSQL migrations `0008_event_reminders.sql` and `0009_event_reminder_sending.sql`.
5. Added atomic daily reminder processing and Resend delivery with idempotency protection.
6. Added protected `POST /api/internal/reminders/send`; it requires `Authorization: Bearer $CRON_SECRET`.
7. Added `infra/scripts/send-event-reminders.sh` for the future VPS cron job.
8. Deployment is intentionally postponed. Before enabling reminders, set `CRON_SECRET`, run migrations, rebuild the web container and then schedule the script once a day.

## Update 2026-07-06 Privacy-Safe Analytics And Error Monitoring

1. Added seven allowlisted `funnel.*` events covering creation, invitation, participant submission, publication and gift opening.
2. Added critical error categories for database, publication, media, email, AI and browser failures with searchable `errorId` values.
3. Added server/client telemetry collection without names, email addresses, greeting text, tokens or secret links.
4. Removed raw GigaChat response content and organizer one-time links from structured logs.
5. Added PostgreSQL migration `0010_telemetry_events.sql` and a local ignored JSON fallback.
6. Added the admin-only `/admin/analytics` screen with 7/30-day funnel metrics and recent critical errors.
7. Verified 245 tests and the production build; targeted analytics files pass ESLint.
8. Applied the migration locally and committed the implementation as `2b9a5b4`.
9. Production deploy, production migration and payment integration were not performed.

## Update 2026-07-06 Production-Ready Event Reminder Flow

1. Added three schedules: seven days before for distant events, next morning for events in 3–7 days, and confirmation-only for events in 1–2 days.
2. Added immediate confirmation email, scenario-specific success states and an urgent create-card CTA for close events.
3. Added cancellation via a stable HMAC token while storing only its SHA-256 hash.
4. Added a public cancellation page with cancelled, already cancelled, already sent and invalid-link states.
5. Added delivery leases, stale `sending` recovery, stable Resend idempotency keys and a five-attempt limit.
6. Hardened the VPS script with a process lock, timeouts, retries, canonical URL and timestamped logs; documented the `04:00 UTC` daily cron.
7. Applied migrations `0011`–`0014` locally and verified 260 tests plus the production build.
8. Sent two live emails through Resend and fixed UTF-8 loading for the sender name `Дари слова`.
9. Committed the implementation as `61c8ecf`. Production deploy, production migrations and cron installation were not performed.

## Update 2026-07-06 Manage Polish Before Payment Preparation

1. Normalized dirty-state comparison so trailing spaces no longer leave the basics form falsely unsaved.
2. Kept the basics save button aligned right on desktop in every state.
3. Removed the mobile block drag handle and stacked the accessible move buttons vertically.
4. Made `Бумажный классический` the default template for new cards.
5. Removed the nested AI form that caused manual greeting generation to reload `/manage` and reset the active tab.
6. Completed organizer access copy, conditional email delivery, explicit resend and success/error states.
7. Verified 260 tests, targeted ESLint and the production build.
8. Updated `docs/plan.md` and the pre-payment readiness checklist. Production deploy was not performed.

## Update 2026-07-06 Local Pre-Deploy Stage A

1. Removed all manager `set-state-in-effect` lint errors and documented intentional raw-image exceptions; full ESLint now passes without warnings.
2. Added regression tests for whitespace normalization, nested AI forms, admin roles and strict role-token validation.
3. Added `npm run preflight`: lint, 268 tests, production build, full local card smoke and admin auth smoke.
4. Automated card creation, contribution, photo upload, free publication, gift verification and desktop/mobile overflow checks with cleanup of generated data and files.
5. Automated invalid/valid admin login, protected route and logout with a temporary PostgreSQL admin user that is removed after the check.
6. Verified migrations `0001`–`0014` from an empty database and on a repeated run.
7. Restored a real local PostgreSQL dump into an isolated database and verified all 14 migrations and core tables.
8. Added a production backup-restore verification script and a deployment/rollback runbook.
9. Added product recommendations and a checklist of legal inputs still required from the owner.
10. Production deploy and real payment integration were not performed.

## Product Decisions 2026-07-06

1. First paid tariff: 399 ₽ as a one-time purchase.
2. Initial paid product uses only `Бумажный классический`.
3. After payment integration and overall polish, expand to 4–5 universal templates, then event-specific templates.
4. Drafts expire 90 days after last activity.
5. Published cards are retained for at least 12 months.
6. Deletion hides public access immediately, allows recovery for 30 days and then permanently removes data and files.
7. A card accepts up to 100 greetings.
8. Creation, setup, participant collection, moderation, preview and limited AI remain free.
9. The 399 ₽ payment unlocks final publication, recipient link, opening animation, watermark-free gift, at least 12 months of access, increased AI allowance and the full `/gift/{slug}`.

## Update 2026-07-06 Contribution Limit And Card Retention

1. Enforced a 100-greeting limit under a PostgreSQL card lock and in JSON fallback mode; deleted greetings no longer consume a slot.
2. Added a clear full-card state on `/join` and matching errors for participant and organizer submissions.
3. Added migration `0015_card_retention.sql` with `deleted_at`, `purge_after` and retention indexes.
4. Added organizer soft-delete and 30-day restore actions in `/account`.
5. Deleted cards immediately disappear from join, manage, gift, messages and direct media routes.
6. Added permanent cleanup for expired deletions and unpublished cards inactive for more than 90 days, including related database rows and files.
7. Added protected retention endpoint, VPS cron helper and structured audit logs without personal content.
8. Extended local smoke to verify delete, public 404, restore and retention purge of both expired deletions and inactive drafts.
## Update 2026-07-22 Join Post-Submit Vote Flow

1. Consolidated the `/join` confirmation and optional gift poll into one post-submit path, so the greeting-success heading is not repeated.
2. Made the participant-facing question neutral and independent of the recipient name or poll mode.
3. Reworked poll option interaction: the card selects a choice, while a product link opens independently in a new tab.
4. Added distinct selected, disabled, loading, error and completion states; a failed vote retains the selected option.
5. Kept the existing ability to change a submitted choice while the poll is open.
6. Tightened mobile option cards and made the skip action a lower-emphasis text action.
7. Added project-palette WebKit autofill styling for the join form.
# 2026-07-22 — Join: карусель «Уже добавили»

- Переработан существующий `ContributionsStrip` на `/join/[slug]`: нативный горизонтальный carousel со snap-позициями, стрелками и циклическим продолжением через скрытые клоны.
- В carousel передаются все видимые поздравления, а не только первые шесть; после отправки `router.refresh()` актуализирует счётчик и состав списка без полной перезагрузки документа.
- Autoplay делает один шаг раз в 5 секунд только при избытке карточек и останавливается при наведении, фокусе, touch, скрытой вкладке, выходе блока из viewport, `prefers-reduced-motion` и навсегда после первого ручного действия до обновления страницы.
- Системный horizontal scrollbar скрыт; mobile использует swipe и `scroll-snap` с видимым краем следующей карточки.

# 2026-07-22 — Join: компактная mobile-карусель

- Обычная прокрутка страницы колесом мыши больше не считается ручным действием с carousel и не отключает autoplay.
- На mobile уплотнены шапка и вертикальные отступы, карточка занимает 84% viewport, а стрелки собраны в компактную центральную группу с доступной областью нажатия 44 px.
- Добавлены `scroll-snap-align` и приоритетное сокращение подписи перед именем; desktop-композиция и согласованные условия autoplay сохранены.

# 2026-07-22 — Join: сетка вариантов подарка

- Сетка post-submit голосования стала count-aware для 2–6 вариантов: на desktop 2/3/4 варианта выстраиваются в равные колонки, 5 — 3+2 с центрированным нижним рядом, 6 — 3×2.
- На tablet используется две колонки, на mobile — одна; все карточки сохраняют одинаковую минимальную высоту и существующие состояния radio.
- Счётчик поздравлений переведён в терракотово-оранжевый акцент без изменения основного текста блока.

# 2026-07-22 — Join: карточки карусели «Уже добавили»

- Имя, подпись и фрагмент поздравления разделены на три строки; подпись показывается в сохранённом виде, без автоматического префикса.
- Desktop-карточки получили боковые gutters для стрелок, mobile показывает одну полную карточку и около 10% следующей без отдельной строки управления.
- Иконка блока уточнена до двух силуэтов; сохранены терракотовый акцент интерактивных деталей, swipe и autoplay.

# 2026-07-22 — Join: carousel gesture recovery

- Restored native horizontal swipe by allowing horizontal panning inside the carousel viewport.
- Vertical touches no longer stop autoplay; autoplay pauses only while a touch gesture is active.
- Moved desktop arrows into fixed 48px grid gutters, keeping four full cards inside the viewport and hiding arrows on mobile.

# 2026-07-22 — Join: seamless carousel loop and people icon

- Added leading and trailing hidden clones, so swiping in either direction and autoplay continue through the first and last greeting without a visible end.
- Autoplay pauses only while a touch gesture is active and resumes when it ends.
- Replaced the CSS pseudo-icon with a dedicated two-person SVG mark for a clear, stable silhouette on desktop and mobile.

# 2026-07-22 — Join: stable carousel looping

- The loop reset now occurs only after scroll snap has finished, eliminating the visible mid-scroll jump at the first and last cards.
- Autoplay no longer depends on the viewport observer and runs after reload on mobile and desktop; reduced-motion mode uses an instant step instead of a smooth transition.
- Mobile loop detection uses the viewport's actual scroll boundary, so the next swipe remains available after the final greeting.
