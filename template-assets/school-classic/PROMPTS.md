# «Школьный классический» — источники и ImageGen-промпты

Новый шаблон создан для семьи `universal-v1`. `school-scrapbook` использован только как принятый архитектурный образец: семь секций, отдельные mobile-подложки, экспортные карточки качеств, decor-слои и единый renderer. Его художественные файлы не копировались.

Встроенный ImageGen использован для мастер-фона, предметных композиций второго художественного круга и четырёх демонстрационных фотографий вымышленной Анны Сергеевны. Exact-size поверхности, золотые фотоуголки, эмалевые таблички и адаптивный декор воспроизводимо собираются `scripts/build-school-classic-source-assets.mjs`.

## Второй художественный круг

Для desktop были созданы самостоятельные сцены, а не варианты одной подложки:

- `hero-balanced-master-v2.png` — доска и журнал слева, книги, букет, ручка и звонок справа, чистый центр;
- `summary-letter-master-v2.png` — отдельный лист письма с журналом, скрепкой и гербарием;
- `qualities-board-master-v2.png` — меловая панель в синей льняной раме;
- `messages-ledger-master-v2.png` — раскрытый классный журнал;
- `memories-album-master-v2.png` — тёмно-синий фотоальбом без нарисованных фотомест;
- `quotes-paper-master-v2.png` — шалфейная бумага с декольными краями;
- `closing-gift-master-v2.png` — финальная композиция с букетом, книгами и перьевой ручкой.

Общий производственный промпт для этих сцен:

```text
Use case: stylized-concept
Asset type: section underlay for a premium teacher greeting card
Input image: strict material, lighting and ivory/navy/chalkboard-green/antique-gold palette reference
Primary request: create a distinct handcrafted stationery composition for the named semantic section
Style/medium: photorealistic premium editorial paper collage with tactile linen, archival paper, brass and natural soft shadows
Composition/framing: reserve the declared central live-text area; keep objects at the outer edges
Constraints: no readable writing, people, globe, apple, ruler, triangle, logos, watermark or drawn UI controls
Avoid: flat vector mockup, technical wireframe, childish clipart, brown-dominant or sepia palette, repeated outer frame
```

Для bare-шапки по правилам `universal-v1` из hero-сцены двумя отдельными вызовами `background-extraction` получены `decor-hero-left-master-v2.png` и `decor-hero-right-master-v2.png`. У них сохранён настоящий alpha-канал; exact-size версии `224 × 300` собираются скриптом. Мобильная hero-композиция была сгенерирована отдельно как `hero-balanced-mobile-master-v2.png`, но live-render использует те же два прозрачных decor-слоя, как и архитектурный образец `school-scrapbook`.

## Мастер-фон

```text
Use case: stylized-concept
Asset type: reusable master paper texture for the «Школьный классический» digital greeting-card template
Input images: approved example is a visual direction reference only; do not copy its text, photographs, exact objects, layout, or branding
Primary request: create an original refined classical school archive paper surface for a teacher greeting card
Style/medium: tactile layered stationery, clean ivory laid paper, subtle pale blue notebook ruling and faint grid fragments, delicate navy ink lines, muted chalkboard-green paper accents, restrained antique-gold foil details and realistic neutral shadows; elegant contemporary craft, not childish and not heavily vintage
Composition/framing: landscape 3:2 full bleed; continuous paper surface; calm low-contrast central 76 percent for dynamic text; decorative interest limited to outer edges and corners; no inset white rectangle and no frame-within-frame
Color palette: clean ivory, deep navy, chalkboard green, muted gold, tiny cool burgundy accents; neutral rather than yellowed
Constraints: no words, letters, numbers, quotation marks, logos, watermark, UI controls, photographs, people, faces; no globe, backpack, apple, bell, schoolchildren, ruler triangle, pencils cluster; no brown, coffee, sepia or terracotta cast
```

## Главный портрет

```text
Use case: photorealistic-natural
Asset type: vertical demo photograph
Primary request: a warm candid portrait of a fictional Russian female teacher named Anna Sergeevna, alone in a bright contemporary school classroom
Scene/backdrop: beside a teacher's desk and a clean dark-green chalkboard; books, notebooks and a small autumn bouquet in soft focus
Subject: woman around 38–45, kind intelligent expression, dark-blond shoulder-length hair, deep-navy blazer over an ivory blouse
Style/medium: photorealistic natural editorial photography, authentic classroom, real skin and fabric texture
Constraints: fictional person; no text, letters, numbers, logos, watermark; chalkboard has no writing; no heavy retouching
```

## Три фотографии «Моментов»

Во всех трёх вызовах главный портрет передавался как identity anchor. Сохранялись лицо, возраст, волосы, пропорции, тёмно-синий жакет и светлая блузка.

```text
Use case: identity-preserve
Primary request: the same teacher explains a lesson at a clean dark-green chalkboard; students are visible partly from the back or side and one child raises a hand
Style/medium: photorealistic candid documentary school photography
Constraints: preserve identity; no readable writing, logos or watermark; natural anatomy and hands
```

```text
Use case: identity-preserve
Primary request: the same teacher in the school courtyard at the beginning of the academic year, naturally talking with four students holding small bouquets
Style/medium: photorealistic candid documentary photography, early autumn daylight
Constraints: preserve identity; fictional people; no readable signs, logos or watermark; no rigid formal row
```

```text
Use case: identity-preserve
Primary request: the same teacher in a spontaneous moment with a small group of students after a class event; one laughs and another tells her something
Style/medium: photorealistic candid documentary photography
Constraints: preserve identity; fictional people; no readable signs, logos or watermark; no formal group portrait
```

## Производственная обработка

- `page-master-v1.png` используется как новый художественный мастер и не подключается напрямую в продукт.
- Все динамические слова, имена, подписи и кавычки рендерит приложение; в растровых ассетах текста нет.
- Фотоуголки находятся в прозрачных `photo-frame-*-overlay`, поэтому фотографии остаются заменяемыми и кадрируемыми.
- Плашки качеств имеют отдельные Web `480 × 258` и Export `720 × 180` композиции.
- Интерфейсный accent профиля остаётся фирменным оранжевым `#e9652f`; синий, зелёный и золото живут только внутри художественной открытки.

## Третий художественный круг: переработка по аудиту 23.08.2026

Финальные v3-мастера созданы встроенным ImageGen отдельными вызовами и сохранены в `template-assets/school-classic/source/`. Во всех вызовах использовались общие ограничения: фотореалистичная предметная съёмка, чистая молочная бумага, тёмно-синий текстиль, зелёная доска, приглушённая латунь, нейтральные тени; без текста, логотипов, водяных знаков, глобуса, яблока, детского клипарта, коричневого, сепии и терракоты.

### Шапка

- `decor-hero-left-master-v3.png`: `background-extraction`, крупная отдельно стоящая зелёная доска в синей текстильной раме, два мелка и ветвь оливы, прозрачный фон, плотно обрезанный силуэт.
- `decor-hero-right-master-v3.png`: `background-extraction`, ровно три крупных предмета — учительский букет, закрытый синий журнал и перьевая ручка, прозрачный фон, вес композиции сопоставим с доской.

### Главное поздравление

- `summary-letter-desktop-master-v4.png`: `precise-object-edit`, сверхширокое письмо с журналом слева, скрепкой и гербарием внутри центральной вертикальной полосы, спокойная текстовая зона 72–76%.
- `summary-letter-mobile-master-v3.png`: `stylized-concept`, самостоятельный портретный мастер 3:4 с теми же материалами и отдельной mobile-safe-area.

### Поздравления

- `greeting-card-1-master-v3.png`: лист учительского блокнота, латунная скрепка и загнутый угол.
- `greeting-card-2-master-v3.png`: страница классного журнала с зелёным тканевым корешком и двумя латунными креплениями.
- `greeting-card-3-master-v3.png`: письмо на плотной бумаге с бордовой лентой и ботаническим уголком.
- `greeting-card-4-master-v3.png`: архивная карточка с голубой бумажной лентой и золотой индексной вкладкой.

Каждый мастер создавался как отдельный `background-extraction`-вызов с прозрачным фоном и 70–80% спокойной площади под short/normal/limit текст.

### Качества

Пять отдельных `background-extraction`-вызовов создали `quality-card-1-master-v3.png` … `quality-card-5-master-v3.png`: синяя эмаль, зелёный текстиль, бордовая эмаль, золотисто-оливковый жаккард и молочная эмаль. Общий мотив — натуральное латунное обрамление и угловые зажимы; запрещены винты, плюсы, отверстия и UI-символы.

### Нижняя половина

- `memories-album-master-v3.png`: `precise-object-edit`, единый тёмно-синий фотоальбом без белого градиента, со встроенной светлой бумажной табличкой под заголовок.
- `quote-card-1-master-v3.png` … `quote-card-3-master-v3.png`: три отдельных прозрачных мастера с синим корешком, зелёной вкладкой и молочно-золотым основанием; крупные кавычки и натуральные зажимы входят в сам предмет.
- `closing-desk-desktop-master-v3.png` и `closing-desk-mobile-master-v3.png`: отдельные desktop/mobile сцены с очками, перьевой ручкой, линейкой и ветвью рябины; без самолётика, книг, журнала, колокольчика и букета из hero.

### Фоторамки

- `photo-corner-brass-master-v2.png`: `background-extraction`, один крупный Г-образный объёмный латунный держатель фотографии. Сборочный скрипт зеркалит его в четыре угла portrait/landscape overlay.
- Молочное паспарту, внутренняя золотая линия, бумажная полоса подписи и нейтральная тень собираются воспроизводимо в `scripts/build-school-classic-source-assets.mjs`; фотография остаётся динамической и использует штатные safe crop windows `portrait-polaroid` и `landscape-polaroid`.

Полноразмерные ассеты `hero`, `qualities` и `quotes` удалены из финального manifest: эти секции являются bare в `universal-v1` и не рендерят underlay. В runtime остаются только реально используемые поверхности и предметные слои.

## Четвёртый художественный круг: правки владельца 23.08.2026

Все новые мастера созданы встроенным ImageGen в режиме редактирования существующих локальных изображений. Текущие настройки размеров и позиций hero из экспортированного профиля владельца перенесены в `src/templates/school-classic/profile.ts` без переосмысления.

### Доска

- `decor-hero-left-master-v4.png`: `precise-object-edit` исходной v3-доски; полностью удалены ножки, боковые опоры и механизм мольберта, сохранены зелёная поверхность, синяя текстильная рама, мел и оливковая ветвь.
- Статическая надпись `Спасибо за знания, терпение и поддержку!` и меловое сердце добавляются детерминированно в `scripts/build-school-classic-source-assets.mjs`, чтобы гарантировать точную кириллицу и пунктуацию.

### Главное поздравление

- `summary-letter-desktop-master-v5.png` и `summary-letter-mobile-master-v4.png`: `precise-object-edit`; полностью удалён левый синий журнал/клин, восстановлены цельный лист и нейтральный фон. Правая скрепка и ботаническая ветвь сохранены.

### Поздравления

`greeting-card-1-master-v4.png` … `greeting-card-4-master-v4.png` созданы отдельными `precise-object-edit`-вызовами из одной журнальной карточки-референса. Во всех версиях совпадают форма бумаги, разлиновка, ширина тканевого корешка, две латунные кнопки, свет и тень; меняется только цвет корешка: тёмно-синий, зелёный, бордовый и холодный серо-голубой. В prompt отдельно зафиксировано 75–80% спокойной зоны текста и запрет дополнительного декора.

### Цитаты

`quote-card-1-master-v4.png` … `quote-card-3-master-v4.png` созданы из одной карточки-референса. Совпадают силуэт рваной бумаги, верхняя вкладка, положение латунного зажима и кавычек; меняется только цвет вкладки и кавычек: синий, зелёный и бордовый. Для первых двух результатов дополнительно применён `background-extraction`, потому что первичная генерация нарисовала шахматную имитацию прозрачности; финальные файлы имеют настоящий alpha-канал.

## Пятый художественный круг: ёмкость текста, альбом и подвал

- Главное поздравление больше не кадрируется стандартным `cover`: сборочный скрипт берёт нормализованную полосу мастера `summary-letter-desktop-master-v5.png`, где лист занимает почти всю высоту. Safe area увеличена по вертикали до 84%, поэтому основной текст и подпись остаются на бумаге.
- Фон всего блока «Поздравления» снова использует отдельный `messages-ledger-master-v2.png` — раскрытый журнал с кольцами. Индивидуальные `greeting-card-*-v4` не изменялись.
- `closing-desk-desktop-master-v4.png` и `closing-desk-mobile-master-v4.png` созданы встроенным ImageGen в режиме `precise-object-edit`: в левый нижний угол добавлены два смещённых листа в клетку с синими отметками, холодный бордовый учительский карандаш и латунная скрепка. Правая композиция и свободная центральная зона сохранены без изменений.
- Для mobile из того же прозрачного мастера доски детерминированно собирается отдельный `decor-hero-left-mobile-v5.png`: фраза разбита на три строки — `Спасибо за знания,` / `терпение` / `и поддержку!`. Desktop сохраняет двухстрочную композицию.

## Шестой круг: экспортная читаемость

- Из `page-master-v1.png` детерминированно собирается `page-v2.png`: верхняя тёмная линейка с ромбом заменена чистой бумажной фактурой, остальные края и предметная композиция сохранены.
- Мобильная доска сдвинута вправо, чтобы трёхстрочная надпись целиком оставалась в кадре.
- В Story, Post и A4 описание шапки ограничено центральной колонкой между доской и букетом.
- Экспортные цитатные карточки сохраняют целую область встроенных кавычек при nine-slice-масштабировании; текст использует явный шрифт и увеличенный интерлиньяж, чтобы запятые не обрезались при растрировании.

## Седьмой круг: независимая экспортная композиция

- Положение мобильной доски сохранено по конфигу владельца; только три строки меловой надписи сдвинуты вправо внутри нового `decor-hero-left-mobile-v6.png`.
- Для обоих hero-ассетов добавлены независимые `exportVariants` для Story, Post и A4. В Post и A4 высота композиционных областей увеличена до `1.45`, поэтому доска и букет могут продолжаться ниже шапки и заполнять свободные края блока качеств.
- Экспортная шапка разрешает `overflow: visible`, но корневой холст по-прежнему обрезает всё строго по размерам скачиваемого файла.

## Восьмой круг: подвал и счётчики

- Подвал в Story, Post и A4 использует `horizontal-slice` с защищёнными краями по 46% исходника: левая стопка листов и правая композиция с ручкой, очками, линейкой и ветвями масштабируются пропорционально, а расширяется только чистая бумага в центре.
- Текст подвала остаётся непосредственно на бумажной сцене без отдельной белой карточки, рамки и скруглений. В Post и A4 центральная колонка расширена до 70%, заголовок фиксируется одной строкой, а логотип со слоганом подняты над тёмной нижней полосой.
- Счётчики и в самой открытке, и в Story/Post/A4 используют профильный preset `classic-label`: молочную и холодно-зелёную бумагу, тёмно-синий/зелёный текст, тонкие золотой и зелёный контуры и уменьшенный оптический наклон без оранжевой тени.
- Контракт ателье требует `exportVariants.story/post/a4` для каждого слоя, который показывается в экспорте; новые слои получают все три варианта автоматически.
