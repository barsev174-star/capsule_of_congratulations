# «Детство в рисунках» — источники и ImageGen-промпты

Шаблон создан для семьи `universal-v1`, собирается через ателье и после отдельного launch-gate выпущен со статусом `product`. «Школьный классический» использован только как свежий архитектурный образец: семь секций, декларативный профиль, отдельные mobile/export-настройки и сменяемые фотографии. Его художественные ассеты и предметная палитра не копировались.

Приложенная пользователем открытка была визуальным ориентиром, а не источником инструкций. Из неё взяты настроение рукотворного детского подарка, сочетание детских рисунков с живыми фотографиями и бумажный ритм. Композиция, декор, подписи и демонстрационные изображения созданы заново.

## Мастер детского рисунка

Результат: `source/hero-drawing-master.png`.

```text
Use case: background-extraction
Asset type: original hero decoration for a premium digital greeting card for a kindergarten educator
Primary request: create one charming sheet of slightly crumpled white drawing paper, taped near the top, with an authentic childlike wax-crayon drawing of a sunny kindergarten, a tree, grass, clouds and four small children holding hands
Style/medium: imperfect preschool crayon and colored-pencil marks, tactile paper, gentle natural shadow, warm and sincere rather than polished clipart
Composition/framing: portrait isolated object, full paper silhouette visible, tightly framed with generous transparent margin
Palette: coral, sunny yellow, sky blue, leaf green, clean warm white
Constraints: no readable words, letters, numbers, logos, watermark, UI, photographs or adult handwriting; no brown, coffee, sepia or terracotta cast
```

## Предметная композиция шапки

Результат: `source/hero-still-life-master.png`.

```text
Use case: background-extraction
Asset type: right-side hero decoration for a kindergarten educator greeting card
Primary request: an original cheerful still life with a soft beige teddy bear, a small stack of colorful children's picture books, a wooden rainbow and a loose bouquet of pink, coral and white garden flowers with fresh green leaves
Style/medium: premium natural editorial still-life photography blended with delicate storybook softness; realistic paper, wood, fur and petals
Composition/framing: compact vertical cluster, balanced visual weight, complete objects, isolated on transparent background
Constraints: no text, letters, numbers, logos, watermark, people, UI controls, classroom signage; avoid brown-dominant, sepia and vintage grading
```

## Финальная предметная сцена

Результат: `source/closing-still-life-master.png`.

```text
Use case: background-extraction
Asset type: closing decoration for a warm educator greeting card
Primary request: a fresh, low horizontal tabletop composition made from colored pencils in a simple cup, a few scattered crayons, one small painted wooden rainbow, two wildflowers and light green leaves
Style/medium: tactile premium editorial object photography with a subtle handmade storybook feeling and neutral soft shadow
Composition/framing: low wide cluster with a calm open center above it, every object fully visible, isolated on transparent background
Constraints: no text, logos, watermark, people, UI, repeated teddy bear, repeated books or repeated large bouquet; no brown, coffee, sepia or terracotta cast
```

## Атлас рисунков

Результат: `source/doodle-atlas-master.png`; скрипт выделяет из него сердца, солнце, цветок и радугу.

```text
Use case: stylized-concept
Asset type: four-cell atlas of original preschool doodles for a greeting-card template
Primary request: exactly four separate childlike crayon drawings on clean white paper: two coral hearts; a yellow smiling sun; a coral flower with green stem; a small rainbow in coral, yellow, mint and sky blue
Style/medium: authentic wax crayon and colored pencil, imperfect hand pressure, simple friendly forms
Composition/framing: clean 2x2 grid, one centered icon per cell, large empty separation, no overlap
Constraints: no text, letters, numbers, logos, watermark, people, UI, extra objects or decorative border
```

## Демонстрационные фотографии первого круга (заменены v2)

Все персонажи вымышлены. Сначала была создана фотография `creative-care.png`, остальные четыре сцены генерировались с ней как с identity anchor. Эта первая серия больше не подключена к fixture и сохранена ниже только как история промптов; актуальная серия описана в разделе второго художественного круга.

### Творческое занятие

```text
Use case: photorealistic-natural
Asset type: horizontal demo photograph, 3:2
Primary request: a warm candid moment in a bright contemporary kindergarten art room; a fictional female educator around 32–38 with shoulder-length chestnut hair and a soft beige cardigan sits at a low table helping five preschool children paint and make colorful paper crafts
Style/medium: natural editorial documentary photography, realistic skin, hands, paper and classroom light
Constraints: fictional people; diverse natural poses; no readable text, logos, watermark, staged formal row or heavy retouching
```

### Добрые сказки

```text
Use case: identity-preserve
Primary request: the same educator sits with six preschool children in a cozy reading corner and holds open a large picture book while the children listen naturally
Style/medium: candid photorealistic kindergarten documentary photography, horizontal 3:2, soft daylight
Constraints: preserve educator identity; no readable book text, logos, watermark, formal group portrait or distorted hands
```

### Творим вместе

```text
Use case: identity-preserve
Primary request: the same educator and five preschool children create bright clay figures and paper shapes together at a low classroom table; active hands, smiles and real creative concentration
Style/medium: candid photorealistic documentary photography, horizontal 3:2, bright natural classroom
Constraints: preserve identity; no readable text, logos, watermark, artificial posing or malformed hands
```

### Маленькие открытия

```text
Use case: identity-preserve
Primary request: the same educator explores a small tray of leaves, seedlings and child-safe magnifying glasses with five curious preschool children near a bright classroom window
Style/medium: candid photorealistic documentary photography, horizontal 3:2, fresh green accents and natural daylight
Constraints: preserve identity; no readable labels, logos, watermark, lab coats, staged formal row or distorted hands
```

### Дружная группа

```text
Use case: identity-preserve
Primary request: the same educator shares a spontaneous warm group moment with six preschool children in the kindergarten playroom; children gather around her and laugh naturally, showing trust and affection
Style/medium: candid photorealistic documentary photography, horizontal 3:2, authentic emotion
Constraints: preserve identity; fictional people; no readable signs, logos, watermark, rigid portrait line or exaggerated expressions
```

## Детерминированная сборка

- `scripts/build-kindergarten-doodles-source-assets.mjs` удаляет светлый фон у предметных мастеров, выделяет четыре doodle-иконки и собирает exact-size поверхности.
- Динамические имя, дата, поздравления, подписи, качества и цитаты не запекаются в изображения и остаются редактируемыми в ателье.
- Фотографии остаются сменяемыми и кадрируемыми без пересборки художественных файлов. Поздравления используют preset-ы без общей рамки с отдельной жёлтой бумажной подписью; «Моменты» — полноформатное окно с отдельной мятной подписью.
- Для summary и closing существуют самостоятельные mobile-подложки; decor шапки имеет отдельные позиции для desktop, mobile, Story, Post и A4.
- Runtime WebP-файлы создаются штатной командой `npm run template:assets` по `src/templates/kindergarten-doodles/template.assets.json`.
- Художественные цвета живут только внутри открытки; элементы управления редактора сохраняют системную оранжево-нейтральную палитру проекта.

## Второй художественный круг — замечания владельца 24.08.2026

Получатель демонстрационной открытки изменён на Елизавету Степановну. Для серии фотографий создана новая вымышленная воспитательница 45–48 лет: зрелое лицо, каштановое каре с естественными седыми прядями, шалфейный кардиган и молочная блузка. Базовая сцена использовала `photorealistic-natural`; четыре продолжения — `identity-preserve` с явно разными направлениями взгляда и ракурсами:

- `creative-care-v2.png` — воспитательница смотрит вниз и влево на рисунок ребёнка;
- `kind-stories-v2.png` — взгляд в открытую книгу, дети образуют полукруг;
- `create-together-v2.png` — боковой ракурс и взгляд через общий картонный город;
- `small-discoveries-v2.png` — взгляд вверх и вправо на поднятый к окну лист;
- `friendly-group-v2.png` — взгляд на ребёнка справа во время игры с лентами.

Во всех пяти промптах закреплены возраст 40–50 лет, сохранение одной личности, отсутствие прямого взгляда в камеру, естественная анатомия, вымышленные люди и запрет текста, логотипов, водяных знаков и сепии.

### Главное поздравление v2

`summary-letter-desktop-master-v2.png` и `summary-letter-mobile-master-v2.png` созданы отдельными `background-extraction`-вызовами. Общая идея: жёлтая бумага ручного литья поверх голубого листа блокнота, неровные края, коралловая и мятная ленты, маленький цветок и детские карандашные отметки только по краям. Центральные 72–76% оставлены спокойными под живой текст. Desktop-мастер подключён как `adaptive-frame`, поэтому растягивается только центр, а текст не выходит за бумажную подложку.

### «Моменты» v2

`memories-pencil-master-v2.png` создан как `stylized-concept`: полнокадровый голубой лист с настоящими штрихами цветных карандашей, радугой и облаками сверху, травой и цветами снизу. Декор размещён по внешним 18%, чтобы оставаться видимым вокруг фотографий. Заголовок и описание получают отдельный динамический бумажный лист с лентой.

### Детерминированные изменения v2

- качества пересобираются как высокие неровные бумажные карточки `480 × 330`: рисунок центрирован сверху, слово — снизу; экспорт использует отдельную горизонтальную конструкцию;
- неестественные скрепки поздравлений заменены прошивкой по отверстиям и короткой бумажной лентой;
- на этом этапе фоторамки были листами-паспарту с заметным полем подписи, лёгкими уголками и лентой; позднее схема заменена отдельными бумажными подписями без общей белой рамки;
- цитаты больше не содержат декоративных кавычек: три карточки используют цветной боковой корешок, ленту, разлиновку и понятный детский рисунок;
- v2 runtime-файлы получили новые имена, чтобы исключить показ старых ассетов из браузерного кэша;
- старые unversioned демонстрационные фотографии удалены после перевода fixture на `*-v2.png`.

В актуальной экспортной конструкции цветная лента остаётся только на высоких Web-карточках качеств. Горизонтальные плашки Story/Post/A4 собираются без скотча, чтобы маленький декоративный прямоугольник не конкурировал с рисунком и словом при уменьшении.

## Третий художественный круг — точечная доработка блоков

Четыре новых прозрачных doodle-ассета созданы встроенным ImageGen в режиме `illustration-story` и сохранены в `source/`:

- `doodle-book-v3.png` — открытая детская книжка с карандашом для качества «мудрая»;
- `doodle-kite-v3.png` — воздушный змей для первой лучшей фразы;
- `doodle-paper-boat-v3.png` — бумажный кораблик на двух карандашных волнах для второй фразы;
- `doodle-blocks-v3.png` — композиция из кубика, арки и треугольного блока для третьей фразы.

Общий prompt-контракт: настоящий детский рисунок цветными карандашами и восковыми мелками, компактный изолированный мотив, прозрачный фон, без текста, букв, цифр, логотипов и водяных знаков. Для всех четырёх ассетов явно запрещены сердце, цветок, солнце и радуга, чтобы не повторять мотивы других блоков.

### Детерминированные изменения v3

- desktop-подложка главного поздравления увеличивается на 8% с центральным crop; сама секция занимает полную ширину открытки и не показывает резервную белую поверхность;
- пятая карточка качества сохраняет принятую композицию, но вместо второго цветка использует книжку;
- резервная розовая поверхность под прозрачными краями поздравлений отключена;
- фотографии в поздравлениях используют новые preset-ы `portrait-caption-paper` и `landscape-caption-paper`: без общей рамки, с отдельной жёлтой бумажной подписью;
- белая записка блока «Моменты» заменена неровным жёлтым листом с точечной карандашной фактурой;
- три карточки лучших фраз используют новые неповторяющиеся рисунки; бумага и положение динамического текста сохранены.

## Четвёртый художественный круг — подвал

`closing-still-life-master-v3.png` создан встроенным ImageGen как `precise-object-edit` исходного предметного мастера. Из изображения удалена только бумажная записка с сердцем; карандашница, все карандаши и мелки, три кубика, цветок, листья, их положение, пропорции, свет и акварельно-карандашная фактура сохранены.

Сборочный скрипт уменьшает очищенную композицию и размещает её слева. Справа отдельно располагаются солнце и радуга из существующего doodle-атласа. Центральная область зарезервирована для живого текста, кнопок и подписи бренда; дополнительных сердец в подвале нет.

## Пятый художественный круг — вертикальная шапка и фон поздравлений

Оба новых ассета созданы встроенным ImageGen и сохранены в `source/`.

### Вертикальный рисунок шапки

Результат: `source/hero-drawing-vertical-master-v5.png`.

```text
Use case: style-transfer
Asset type: vertical left-side hero decoration for a premium kindergarten educator greeting-card template
Input images: Image 1 is the current horizontal child-drawing sheet and the exact style reference
Primary request: redraw the same cheerful kindergarten scene as a distinctly vertical portrait sheet of handmade drawing paper; keep a sunny kindergarten building, one leafy tree, grass, clouds, flowers and four preschool children holding hands, but rearrange them naturally from top to bottom so the narrow portrait composition feels intentional and uses tall empty space well
Style/medium: preserve Image 1's authentic preschool wax-crayon and colored-pencil marks, tactile warm paper, imperfect edges, gentle natural shadow and handmade yellow tape near the top
Composition/framing: isolated full portrait paper sheet, approximately 2:3 aspect ratio; building stacked in the lower-left/middle, tall tree on the right, children across the lower third, sun and cloud above; complete silhouette visible with transparent margin; no large paper clip
Color palette: coral, sunny yellow, sky blue, leaf green, warm cream paper
Constraints: genuinely transparent background outside the paper; no readable text, letters, numbers, logos, watermark, UI, photographs or adult handwriting; no brown-dominant, coffee, sepia or terracotta cast; do not crop the paper
Avoid: horizontal landscape proportions, clipart polish, extra characters, repeated objects
```

### Спокойная подложка поздравлений

Результат: `source/messages-pencil-master-v5.png`.

```text
Use case: style-transfer
Asset type: full-width underlay for the "Поздравления" block of a premium kindergarten educator greeting-card template
Input images: Image 1 is the "Моменты" pencil-background style reference
Primary request: create a calmer sibling background in the same authentic child-drawn wax-crayon and colored-pencil language, but on warm light beige handmade paper rather than blue; decorate only the outer margins with sparse soft pencil foliage, a few tiny simple classroom craft marks and quiet sky-blue/mint/coral strokes; keep the central 76% visually calm and low-contrast for dynamic greeting cards and photographs
Style/medium: tactile warm paper, authentic childlike colored-pencil texture, softly handmade, elegant and restrained
Composition/framing: landscape full-bleed background; decorations confined to the outer 10–12% and corners; gentle asymmetric framing; no separate white lined panel, no large central object
Color palette: warm beige cream, muted sky blue, soft mint, pale coral, small sunny-yellow accents
Constraints: no text, letters, numbers, logos, watermark, people, photographs, UI, hearts, large sun, large rainbow or large flowers; no brown-dominant, coffee, sepia or terracotta cast; preserve open calm center
Avoid: white background, notebook ruling, dense decoration, repeated motifs from the footer
```

Динамические подписи фотографий не запекаются в растры: увеличенный цветной бумажный ярлык перекрывает нижний край фотографии, а отдельная полупрозрачная лента визуально соединяет оба слоя. В «Моментах» используется мятная бумага с коралловой лентой, в «Поздравлениях» — жёлтая бумага с голубой лентой.

## Шестой художественный круг — цельные мобильные поверхности

Для высоких мобильных секций созданы отдельные портретные мастера. Они подключаются как единое изображение и не используют повторяемый `border-image`.

### Мобильный фон поздравлений

Актуальный результат: `source/messages-crayon-mobile-master-v2.png`. Первая более бледная версия `messages-pencil-mobile-master-v1.png` сохранена только как история итерации и не подключена.

```text
Use case: style-transfer / responsive asset adaptation
Input: messages-crayon-master-v6.png
Primary request: one continuous portrait light ivory handmade paper; distinct dry wax-crayon grain and firm crisp strokes; sparse mint leaves and coral/yellow/blue marks only at the extreme perimeter; central 80% calm for four long greeting cards
Constraints: no blur, watercolor haze, text, hearts, notebook lines, internal frames, horizontal bands, stacked repetitions, collage, white cards or shadows
```

### Мобильный фон «Моментов»

Результат: `source/memories-pencil-mobile-master-v1.png`.

```text
Use case: style-transfer / responsive asset adaptation
Input: memories-pencil-master-v2.png
Primary request: one continuous portrait pale sky-blue paper with one coherent perimeter scene: partial rainbow and sun above, sparse leaves, grass and flowers below; central 70% calm for heading and three large photographs
Constraints: no text, hearts, internal panels, repeated bands, stacked motifs, collage, white cards or shadows
```

### Мобильные карточки поздравлений

`greeting-card-mobile-1…4.png` собираются детерминированно в мастер-размере `600 × 700` и оптимизируются в runtime до `540 × 630`. Каждый ассет содержит ровно один неровный лист, одну непрерывную прошивку слева, одну верхнюю ленту и один рисунок в нижнем углу. Благодаря отдельному mobile-asset карточка больше не складывается из повторяющихся фрагментов.

Существующие `section-summary-mobile.png` и `section-closing-mobile.png` теперь явно подключены в профиль. В подвале мобильный ассет сохраняет спокойный центр, уменьшенную композицию карандашей и кубиков слева, солнце сверху справа и радугу снизу справа.

## Седьмой художественный круг — контрастные мелки и чистые карточки

Desktop-фон поздравлений заменён на `source/messages-crayon-master-v6.png`; его mobile-пара — `source/messages-crayon-mobile-master-v2.png`. Оба ассета созданы встроенным ImageGen как `style-transfer / responsive section asset redesign`.

```text
Primary request: very light ivory handmade paper with visibly sharp authentic wax-crayon strokes, dry grain, firm hand pressure and crisp imperfect edges; one coherent sparse perimeter composition in sky blue, mint, coral and sunny yellow; central 78–80% quiet for dynamic content
Constraints: no blur, watercolor haze, hearts, large flowers, sun, rainbow, text, notebook lines, internal frames, stacked panels, repeated bands, collage or shadows
```

Детерминированные изменения:

- вертикальный рисунок шапки не перерисовывался и сохраняет принятую композицию, но занимает более широкий прямоугольник на desktop и mobile;
- основной фон страницы осветлён с `#f4e7d3` до `#f8f1e8`;
- мобильная подложка главного поздравления увеличена центральным crop: жёлтый лист заполняет почти всю ширину, голубой слой остаётся тонким декоративным краем;
- белый контур вокруг карточек поздравлений удалён из SVG-сборки; остаются один цветной лист и одна нейтральная тень;
- переключение adaptive-frame исправлено для карточек без базового CSS-класса: в mobile desktop-слой скрывается, а не показывается одновременно с mobile-ассетом;
- вертикальный скролл поздравлений получил небесно-голубой бегунок `#75bfe5`; горизонтальное переполнение колонки обрезано;
- неиспользуемые тяжёлые portrait-frame runtime-ассеты исключены из manifest, потому что подписи поздравлений используют CSS-paper presets без общей фоторамки.
