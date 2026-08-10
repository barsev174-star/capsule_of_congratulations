# Как тестировать текущую версию

## Проверка сводного этапа P0–P2 — 2026-08-10

1. В меню фотографии убедиться, что кнопка имеет доступное имя «Меню фотографии», а в подсказке используется та же SVG-иконка. Открыть меню клавиатурой и проверить `Arrow Up/Down`, `Home`, `End`, `Escape`, иконки у всех пунктов и оранжевое опасное действие.
2. В редакторе поздравлений проверить переключатели во включённом, выключенном и заблокированном состояниях. Для блокировки должны быть видны замок и причина; на ширине `390 px` подписи не должны обрезаться или создавать горизонтальную прокрутку.
3. Вызвать ошибки валидации в форме и убедиться, что соседние поля и кнопки не сдвигаются. На мобильной ширине поля должны оставаться в одну колонку.
4. В AI-помощнике создать варианты, запустить повторную генерацию и проверить, что предыдущий результат сохраняется до получения нового. Отредактировать текущий текст и вернуть исходный вариант.
5. Загрузить фотографию размером больше 6 МБ и проверить прогресс оптимизации, успешное добавление и понятную ошибку для неподдерживаемого файла.
6. Включить выбор подарка: без перезагрузки должны открыться настройки. На странице участника проверить мобильный счётчик голосов, закрытое голосование и объяснение недоступного результата.
7. Проверить страницы на `1280×720`, `1366×768`, `1440×900`, `1920×1080` при масштабе браузера 100%: горизонтальной прокрутки быть не должно.
8. Автоматическая приёмка этапа: `npm test` — 533 теста прошли, 9 пропущены; `npm run build` и `npm run ui:colors` успешны; `npm run lint` — 0 ошибок и 3 прежних предупреждения `<img>`.
9. Физическую проверку на реальном телефоне по `P0-05` выполнить отдельно перед production-развёртыванием.

## Проверка выключенного голосования — 2026-08-02

1. На desktop блок «Что станет доступно» раскрыт по умолчанию, на mobile — свёрнут; вся строка управляется кнопкой с `aria-expanded`.
2. Третий шаг явно сообщает, что участники голосуют после отправки поздравления; «Как это работает» не переносится на desktop.
3. Модальное окно удерживает фокус, блокирует фон, закрывается по Escape и browser back и возвращает фокус на исходную кнопку.
4. Активация использует серверное действие, блокирует повторную отправку, показывает loading/error inline и обновляет серверные данные без reload документа.
5. Последняя полная проверка: 437 тестов прошли, 9 пропущены; production build успешен; ESLint — 0 ошибок и 3 прежних предупреждения вне вкладки.

## Проверка шаблона «Маршрут» и manager — 2026-07-19

1. В manager выбрать вариант «С фото» и по очереди включить одно вертикальное, два горизонтальных и три горизонтальных фото. В мини-схеме вертикального варианта должны быть три сообщения слева и одно фото справа.
2. В preview `/preview/[manageToken]` проверить: при вертикальном фото видны три карточки поздравлений, остальные открываются прокруткой; при двух и трёх горизонтальных фото видны четыре карточки.
3. В схемах «В один ряд» и «В два ряда» проверить карточки с голубым и дымчатым фоном: декоративный ассет не должен обрезаться.
4. В разделе «Фото открытки» задать подпись длиной до 45 символов, поменять блок использования и убедиться, что тип фото находится под селектором. Открыть «⋮» и закрыть меню кликом вне него или клавишей Escape.
5. Удалить одну фотографию из меню «⋮» и убедиться, что она исчезла из списка и из предпросмотра после обновления.

## Проверка подписей и полароидов перед общим деплоем — 2026-07-07

1. В manager задать трём фотографиям одинаково длинные подписи с разными номерами, дождаться статуса сохранения и обновить страницу.
2. Убедиться, что после reload все подписи сохранились полностью, включая последние введённые символы.
3. Открыть `/example` и `/gift/[finalSlug]` на desktop: длинная подпись переносится и не расширяет последнюю карточку относительно остальных полароидов.
4. Открыть `/gift/[finalSlug]` на ширине 390–430 px: один большой и два малых полароида остаются внутри бумажной подложки, рамки находятся поверх фото, двухстрочные подписи помещаются в нижнюю область рамки.
5. Проверить hero с именем в одну и две строки, строку «Поздравления + счётчик», кнопку дозагрузки и отсутствие мобильной ссылки «Смотреть все поздравления».

Актуальная точка входа для нового чата и текущего статуса: `docs/PROJECT_HANDOFF_2026-06-23.md`.

## Что уже можно тестировать

После `Блока 3` можно вручную проверить:

1. Главную страницу.
2. Экран создания открытки.
3. Валидацию формы.
4. Выбор шаблона.
5. Создание черновика.
6. Появление ссылки для участников.
7. Появление ссылки управления.
8. Генерацию текста для чата.
9. Открытие ссылки участника.
10. Отправку поздравления.
11. Появление поздравления в списке на странице участника.
12. Работу AI-помощника для черновика поздравления.
13. Секретную страницу организатора.
14. Скрытие и удаление поздравлений.

## Как запустить проект

В PowerShell:

```powershell
cd "C:\Project\Поздравления"
npm.cmd run dev
```

После запуска открыть в браузере:

`http://localhost:3000`

## Что проверить руками

1. На главной есть переход к созданию открытки.
2. Форма понятна без объяснений.
3. Если отправить пустую форму, показываются понятные ошибки.
4. Если заполнить форму корректно, появляется блок с результатом.
5. После создания видны:
   - ссылка участника;
   - ссылка управления;
   - выбранный шаблон;
   - текст для отправки в чат.
6. Если открыть ссылку участника, отображается экран сбора поздравлений.
7. Если отправить пустое или слишком короткое поздравление, показываются ошибки.
8. Если отправить корректное поздравление, появляется сообщение об успехе.
9. После обновления страницы отправленное поздравление видно в списке.
10. Если ввести слишком пустой текст вроде `Поздравляю!`, форма теперь должна ругаться.
11. Если открыть AI-помощника, заполнить поля и нажать генерацию, должны появиться 3 варианта текста.
12. Если выбрать один из вариантов, он должен подставиться в поле поздравления.
13. Если открыть ссылку управления, должен появиться список поздравлений.
14. Если скрыть поздравление, оно должно исчезнуть с публичной страницы участника.
15. Если вернуть поздравление в `visible`, оно снова должно появиться на публичной странице.
16. Если удалить поздравление, оно должно остаться только как удаленное в управлении и пропасть из публичного списка.

## Что пока ожидаемо не готово

1. AI пока не является частью обязательного MVP-flow.
2. Оплата и публикация по тарифу еще не реализованы.
3. Регистрация и полноценная админка сервиса еще не реализованы.
4. Хранение пока локальное, не в базе данных.
5. “Спасибо” на финальной открытке пока локальная реакция, без отправки организатору.
## Update 2026-06-14

Check the new manage flow:

1. The landing page clearly leads into card creation.
2. Starting creation opens the manage page directly.
3. `Основа открытки` can be filled and corrected without going back.
4. Optional blocks can be removed from their cards.
5. Removed blocks appear in a restore zone below.
6. The `Поздравления` card changes the grid and updates the preview scheme.
7. Template selection happens after structure, not before it.
8. Participant AI still uses `occasionText` rather than a visible legacy category.
 
## Update 2026-06-15

Manual checks for the current manage editor:

1. Open the organizer manage page and switch between `Оформление открытки` and `Поздравления и фото`.
2. In `Оформление открытки`, drag a non-fixed composition block by its handle:
   - the block should feel attached to the handle;
   - `Обложка` and `Финал` should not be draggable;
   - the insertion line should show where the block will land.
3. In `Поздравления и фото`, expand a contribution and toggle it from active to hidden:
   - the card should collapse;
   - the card should move to the end of the list;
   - the badge should become red `Скрыто`;
   - after refresh, the card should still be hidden and stay in the hidden group.
4. Toggle a hidden contribution back to active:
   - the card should collapse if it was open;
   - it should move to the end of the active group, before hidden cards;
   - the badge should become green `Активно`;
   - after refresh, the order should remain the same.
5. Use the category filters:
   - `Все` shows all cards;
   - `Активные` shows active cards only;
   - `Скрытые` shows hidden cards only;
   - `Слишком длинные` shows cards above the current character limit;
   - `Без роли` shows cards without participant role.
6. Drag a contribution by its handle:
   - the card should feel attached to the handle, not to the center;
   - the insertion point should be visible before drop;
   - saving the order should keep it after refresh.
7. Confirm that hidden contributions do not appear on participant/public visible surfaces.
8. Click `Добавить вручную`, add a valid author and message, and confirm the new contribution appears in the moderation list after submit.
9. Open the overflow menu next to `Добавить вручную` and confirm participant link and invitation text can be copied.

## Update 2026-06-22 MVP-flow checks

Manual checks for the current MVP-flow:

1. Open the organizer manage page.
2. Confirm the hero panel shows:
   - current lifecycle status;
   - participant link;
   - organizer link;
   - recipient/final link.
3. Copy each link and confirm the copied value opens from the browser address bar.
4. Change status to `Сбор закрыт`.
5. Open the participant link and confirm the form is replaced by the closed-state message.
6. Try posting to `/api/contributions` for the closed card and confirm it returns an error.
7. Change status back to `Сбор поздравлений` and confirm the participant form is visible again.
8. Open the final gift link.
9. Click `Спасибо, очень приятно!` and confirm a local confirmation message appears.
10. Click `Сохранить открытку` and confirm the browser print/save dialog opens.
11. Click `Создать такую же открытку` and confirm it navigates to `/create`.
12. Upload up to 7 photos and confirm the next new upload is rejected with a clear limit message.
13. Replace an existing photo after the 6-photo limit and confirm replacement still works.

## Update 2026-06-23 Postgres and new draft checks

Manual checks added after the storage preparation pass:

1. Open `/` and click `Создать открытку`.
2. Confirm the opened manage page is a new empty draft and does not show demo values like `Кристина` or `Евсей`.
3. Fill the basics form and confirm the manage header, participant page, and final preview use the saved values.
4. Without `DATABASE_URL`, confirm local JSON storage still works.

## Update 2026-06-23 Landing CTA regression

Manual check after the latest fix:

1. Open `http://localhost:3000/`.
2. Click `Создать открытку`.
3. Confirm the browser does not navigate to `/create`.
4. Confirm a new URL like `/manage/[manageToken]` opens.
5. Confirm the opened draft is empty and ready for organizer setup.
6. Current verified example: `http://localhost:3000/manage/79bbe39fe81322660ebbdb58c36055d3`.

Build check:

```powershell
npm.cmd run build
```

Result on 2026-06-23: passed.
5. With `DATABASE_URL`, run `npm run db:migrate` and repeat the same create/manage/participant/final flow on PostgreSQL.

## Update 2026-06-23 Local uploads storage checks

Manual checks for the current local uploads layer:

1. Upload a photo in the organizer media manager.
2. Confirm the image appears in the editor preview and final card.
3. Confirm the file exists under `public/uploads/cards/<cardId>/`.
4. Replace a photo in the same slot and confirm the old file is removed from `public/uploads/cards`.
5. Delete a photo and confirm the file disappears from `public/uploads/cards`.
6. Repeat the same checks with `DATABASE_URL` enabled, because metadata then lives in PostgreSQL while files still live on disk.

## Update 2026-06-23 Single-domain route checks

Manual checks for the current MVP URL structure:

1. Open `/` and confirm the main CTA goes to `/create`.
2. Create a card from `/create` and confirm generated participant links use `/join/[slug]`.
3. Open old `/card/[slug]` and confirm it redirects to `/join/[slug]`.
4. Open `/preview/[manageToken]` and confirm it lands on the organizer preview tab.
5. Set `NEXT_PUBLIC_SITE_URL=https://darislova.ru` and confirm copied/generated links use `https://darislova.ru/...`.

## Update 2026-06-23 Production compose checks

Before touching the VPS, validate locally:

1. Run `PROD_ENV_FILE=.env.production.example docker compose -f docker-compose.prod.yml --env-file .env.production.example config`.
2. Confirm the project name is `capsule`.
3. Confirm public host binding is `127.0.0.1:3100:3000`.
4. Confirm uploads are mounted from `./public/uploads` to `/app/public/uploads`.
5. If doing a full local compose run, copy `.env.production.example` to `.env.production`, set a safe password, build, run migrations, then create a test card.

## Update 2026-06-23 Production operations checks

On a Linux/VPS shell after the stack is running:

1. Run `bash infra/scripts/backup-postgres.sh` and confirm `backups/postgres-*.sql.gz` appears.
2. Run `bash infra/scripts/backup-uploads.sh` and confirm `backups/uploads-*.tar.gz` appears.
3. Run `bash infra/scripts/run-nightly-backup.sh` and confirm checksum files and latest symlinks appear.
4. Run `BASE_URL=https://darislova.ru bash infra/scripts/check-production-health.sh`.
5. Do not store `.env.production` in git.

## Production verification — 2026-06-24

Production MVP на `https://darislova.ru` проверен после первого VPS-запуска.

Проверено:

1. `curl -I https://darislova.ru` возвращает `HTTP/2 200`.
2. `curl -I https://www.darislova.ru` возвращает `HTTP/2 200`.
3. `capsule-postgres-1` healthy.
4. `capsule-web-1` healthy.
5. Landing page создает новую открытку и открывает `/manage/[manageToken]`.
6. `/join/[slug]` открывается.
7. PostgreSQL migration завершилась сообщением `migrations complete`.
8. Ручной backup `bash infra/scripts/run-nightly-backup.sh` завершился успешно.
9. Root cron backup добавлен на `03:35`.
10. `BASE_URL=https://darislova.ru bash infra/scripts/check-production-health.sh` завершился сообщением `Production health checks passed`.

Следующая обязательная ручная проверка перед активным использованием: пройти полный flow с тестовым фото и финальной `/gift/[slug]`.

## Update 2026-07-06 Pre-deploy preflight

Единая локальная проверка:

```powershell
npm.cmd run preflight
```

Она последовательно запускает:

1. полный ESLint без предупреждений;
2. 272 автоматических теста;
3. production build и TypeScript;
4. пользовательский smoke: создание, участник, фото, публикация, desktop/mobile, удаление и восстановление;
5. admin smoke: неверный/верный пароль, защищённый маршрут и logout;
6. retention smoke: 30-дневное окончательное удаление, 90-дневный неактивный черновик и защита черновика со свежей активностью.

Перед smoke должны быть доступны локальная PostgreSQL с migration `0015` и приложение на `http://localhost:3000`. Smoke-данные и тестовые файлы удаляются после проверки.

## Update 2026-07-31 Content tab rework

Для `/manage/[manageToken]?tab=content` проверить:

1. «Поздравления» и «Фотографии» меняют `section` в URL; reload, back/forward и прямые ссылки восстанавливают подраздел.
2. Стрелки в tablist меняют выбранный подраздел и переносят клавиатурный фокус.
3. В каждый момент смонтирован только один редактор материалов.
4. Поиск находит имя, роль и текст; фильтры корректно сочетаются с поиском, а изменение порядка доступно только на полном списке.
5. «Изменить» в главном поздравлении раскрывает соответствующую карточку и фокусирует выбор главного.
6. На ширинах 360, 390, 430, 768, 1024, 1280, 1440 и 1920 px отсутствует горизонтальное переполнение.
7. Исторический сценарий автоматического первого свободного слота больше не применяется: новая фотография загружается непосредственно в выбранную позицию; перенос и обмен сохраняются.

## Update 2026-07-31 Unified editor layout

Для «Оформления» и «Поздравлений и фото» проверить:

1. На 1280, 1440 и 1920 px совпадают левая/правая границы workspace, основная колонка, sidebar 380 px и gap 24 px.
2. На 360, 390, 430, 768 и 1024 px обе вкладки переходят в одну колонку без горизонтального переполнения.
3. В свёрнутой desktop-подготовке видны два завершённых этапа, текущий и следующий; на mobile — только текущий.
4. После раскрытия видны все шесть этапов, а состояние сохраняется при переходе между вкладками.
5. Карточка ссылки для участников имеет одинаковую разметку и действия в обеих вкладках.
6. Фокус в поле скрывает mobile sticky CTA; после выхода из поля CTA возвращается.
7. Ручная форма и редактирование поздравления взаимоисключаются, при этом введённый черновик ручной формы восстанавливается.

## Update 2026-07-31 Stable editor frame

Для всех трёх вкладок редактора проверить:

1. На 1280 и 1440 px логотип, подпись «Редактор открытки» и верх правой колонки начинаются на согласованных линиях; переключение вкладок не сдвигает шапку.
2. «Подготовка открытки» является первой карточкой sidebar на вкладках оформления, материалов и подарка.
3. На 1024, 768, 430, 390, 360 и 320 px подготовка находится перед рабочим содержимым, а горизонтальный скролл всей страницы отсутствует.
4. На mobile в оформлении соблюдается порядок: подготовка, основа, шаблон, состав.
5. Во вкладке материалов внутренний переключатель закрепляется под основной навигацией; строка показателей остаётся обычным горизонтально прокручиваемым блоком.
6. Во вкладке поздравлений порядок элементов: «Все поздравления», действие и пояснение, главное поздравление, поиск и фильтры, список.
7. «Изменить» у главного поздравления по-прежнему раскрывает нужную карточку и переводит фокус к выбору главного.

## Update 2026-07-31 Four editor sections

Для `/manage/[manageToken]` проверить:

1. Навигация содержит четыре прямые ссылки: `tab=design`, `tab=congratulations`, `tab=photos`, `tab=gift`.
2. Старые ссылки `tab=content&section=congratulations|photos` открывают соответствующий новый экран.
3. Reload, Назад и Вперёд сохраняют выбранный раздел; поздравления и фотографии не переключаются друг в друга автоматически.
4. Вложенного tablist и общей строки показателей материалов в DOM нет.
5. На 1440 и 1280 px рабочая колонка и «Подготовка открытки» начинаются на одинаковой высоте во всех четырёх разделах.
6. На 768, 430, 390, 360 и 320 px навигация состоит из четырёх равных ячеек без горизонтального скролла, переноса и обрезки подписей.
7. На mobile видны подписи «Открытка», «Поздравления», «Фото», «Подарок»; количества поздравлений и фотографий находятся в badge, а не в шапке.
8. В фотографиях отображаются показатели для поздравлений, моментов и общего числа фотографий; загрузка, подписи, слоты, замена и удаление работают как раньше.
## Update 2026-08-01 Photos tab slot editor

Для `/manage/[manageToken]?tab=photos` проверить:

1. Переключаются и сохраняются три схемы поздравлений: 1 вертикальная, 2 горизонтальных и 3 горизонтальных.
2. Нажатие пустой позиции открывает выбор файла именно для этой позиции; JPG, PNG и WebP до 6 МБ проходят клиентскую и серверную проверку.
3. Вертикальное фото можно поместить в горизонтальную позицию и наоборот: редактор позволяет выбрать область перетаскиванием и масштабом, а финальная открытка повторяет этот кадр.
4. Меню заполненной позиции позволяет изменить подпись, заменить, переместить и удалить фото.
5. Перенос в свободную позицию и обмен двух занятых позиций сохраняются после reload; на desktop фото переносится drag-and-drop, на mobile — через пункт «Переместить в другой слот» в меню троеточия.
6. Переключение схемы не удаляет фото неактивной схемы; после возврата они снова видны.
7. Диалоги удерживают фокус, закрываются по Escape и возвращают фокус к вызвавшему элементу.
8. На 390 и 1280 px отсутствует горизонтальное переполнение; мобильные слоты и редактор образуют одну колонку.
9. Старая открытка без `crop_*` отображает фото по центру с масштабом 100%.
10. После изменения масштаба простое наведение не двигает кадр; кадр следует за указателем только при удержании и останавливается сразу после отпускания, включая отпускание вне рамки.
11. После «Отмена» `body` не остаётся с `overflow: hidden`: колесо мыши и touch-прокрутка работают без reload.
12. При pointer-переносе на desktop движется preview всей фотокарточки, целевой слот подсвечивается, а визуальный порядок перестраивается ещё до отпускания: фото из занятой позиции сразу занимает исходный слот, призрак перетаскиваемого фото переходит в целевой. Свободная позиция принимает фото, занятая обменивается с исходной. Нативное перетаскивание изображения не перехватывает жест, после короткой или отменённой попытки меню троеточия остаётся рабочим. Поведение одинаково в блоках «Поздравления» и «Моменты».
13. Меню троеточия закрывается повторным нажатием на кнопку, выбором действия, клавишей Escape и любым нажатием вне меню.

## Update 2026-08-01 Photos composition synchronization

Для переходов между `tab=design` и `tab=photos` проверить:

1. Схема выбирается только в «Оформлении»; во вкладке фотографий переключателей нет.
2. `2 горизонтальных → 3 горизонтальных` сохраняет первые два фото и показывает третью позицию; обратный переход скрывает, но не удаляет третье фото.
3. «Без фото» скрывает слоты поздравлений, выводит информационное состояние и не учитывает сохранённые назначения в показателях.
4. Отключённые «Моменты» не показывают слоты и фото; включение из вкладки фотографий происходит только после успешного ответа backend.
5. После возврата в «Оформление» блок «Моменты» включён, а переход «Изменить оформление» раскрывает выбор вида поздравлений и устанавливает фокус.
6. Показатели используют «Используется N фото» и считают только заполненные активные слоты.
7. При отсутствии фототребований отображается нейтральный текст «Фото не используются в текущем оформлении».
8. Окно перемещения содержит только активные слоты текущей композиции.
9. После ошибки сохранения композиции или включения «Моментов» интерфейс сохраняет последнее подтверждённое состояние.
10. На mobile «Подготовка открытки» остаётся перед фотоблоком, все действия имеют высоту не менее 44 px, модальные окна и нижняя CTA не перекрываются.

## Update 2026-08-01 Photos interaction polish

Для `/manage/[manageToken]?tab=photos` дополнительно проверить:

1. Обычный клик по заполненной карточке открывает «Настроить фото» и не запускает перенос; desktop-перенос начинается только после движения с зажатой кнопкой.
2. Открытое меню троеточия перекрывает кнопки соседних карточек и закрывается по клику вне меню, Escape и выбору действия.
3. На touch-устройствах карточка не переносится удержанием; команда доступна только через «Переместить в другой слот».
4. В окне перемещения видны исходное фото, текущая позиция и подпись; занятые позиции подписаны «Поменять местами», а несовпадающая ориентация — «Переместить и настроить».
5. После изменения подписи, масштаба или кадра X, «Отмена», Escape и системная кнопка «Назад» показывают подтверждение «Изменения не сохранены».
6. Подпись длиннее 45 символов показывает локальную ошибку и причину блокировки кнопки сохранения.
7. Добавление, редактирование, перенос, обмен и удаление обновляют слоты и показатели без перезагрузки страницы, сохраняют прокрутку и показывают точное уведомление.
8. После ошибки серверного действия локальное состояние откатывается без дублирования слотов, а редактор остаётся заполненным.
