# Журнал поставки

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
