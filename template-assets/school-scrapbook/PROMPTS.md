# School Scrapbook — ImageGen prompts

Встроенный ImageGen использован для исходных мастер-ассетов. Референсом служил утверждённый пользователем концепт школьной открытки от 14 августа 2026 года. Финальные exact-size ассеты воспроизводимо собираются скриптом `scripts/build-school-scrapbook-source-assets.mjs`.

Референс задавал художественный язык, палитру и материалы. Его текст, фотографии, композиция страницы и брендовый подвал не переносились в мастер-ассеты.

## Page background

```text
Use case: stylized-concept
Asset type: reusable greeting-card page background texture for a universal digital template
Primary request: create an original bright school-year scrapbook page background inspired by handmade notebook collage
Style/medium: tactile layered paper collage, subtle squared notebook paper, torn cream paper, marker doodle energy, light screen-print texture
Composition/framing: landscape 3:2, edge-to-edge background; calm low-contrast milk-cream central field; decorative interest restricted to the outermost edges and corners
Color palette: milk cream, saturated school blue, yellow, orange-red, turquoise and green
Constraints: no words, letters, numbers, logos, watermarks, photographs, people, faces or UI controls; keep the central 75 percent quiet and readable
```

## Underlay art atlas

```text
Use case: stylized-concept
Asset type: reusable art atlas for adaptive section underlays and greeting-message cards
Primary request: create a dense but refined school scrapbook texture with varied small cut-paper and marker motifs that can be sampled into different borders
Style/medium: notebook-paper collage, torn paper strips, graph-paper fragments, marker stars, hearts, leaves, paper clips and pencil-like color bars
Composition/framing: landscape 3:2 edge-to-edge atlas; varied motifs across the canvas; no single focal object; distinct clusters separated by quiet cream areas
Color palette: milk cream, saturated school blue, yellow, orange-red, turquoise, green, tiny pink and lavender accents
Constraints: no words, letters, numbers, logos, watermarks, photographs, people, faces or UI controls
```

## Photo-frame art atlas

```text
Use case: stylized-concept
Asset type: reusable raster art atlas for portrait and landscape photo-frame skins
Primary request: create a decorative school scrapbook pattern that will be clipped by code into photo-frame borders
Style/medium: layered notebook paper, torn graph-paper strips, colored paper tape, marker strokes and screen-print texture
Composition/framing: landscape 3:2 edge-to-edge texture, evenly detailed with no central focal point
Color palette: milk cream, saturated blue, turquoise, yellow, orange-red, green, tiny pink and lavender accents
Constraints: no text, letters, numbers, logos, watermarks, photographs, people, frames, holes or transparent areas
```

## Hero card master

```text
Use case: stylized-concept
Asset type: reusable straight paper panel with a quiet center
Primary request: create one straight, unrotated, wide handmade notebook-paper panel with a quiet center reserved for dynamic text
Style/medium: cut-paper scrapbook panel, cream paper, graph texture, marker outline and small school-themed sticker accents
Composition/framing: wide landscape panel; decoration restricted to edges and corners; central 80 percent calm and uniform
Constraints: no text, letters, numbers, logos, watermark, photographs, people or UI controls; no rotation
```

## Quote card master

```text
Use case: stylized-concept
Asset type: reusable quote-card background
Primary request: create one straight, unrotated handmade notebook-paper quote card with a large calm area for dynamic text
Style/medium: layered cut-paper scrapbook card, graph-paper texture, marker border, tape fragments and small school-themed sticker accents
Composition/framing: compact card; decoration limited to top corners and bottom edge; calm central field
Constraints: no text, letters, numbers, quotation marks, logos, watermark, photographs, people or UI controls; no rotation
```

## Continuous section surface v2

```text
Use case: stylized-concept
Asset type: reusable full-bleed section surface master for the “Школьный коллаж” digital greeting-card template
Primary request: create one original continuous sheet of pale notebook paper with tactile handmade scrapbook texture; the whole canvas must read as a single paper surface, never as a frame around a separate white center
Style/medium: refined cut-paper school scrapbook, subtle squared and ruled notebook texture, light screen-print grain, tiny marker doodles and small torn-paper accents
Composition/framing: landscape 3:2, full bleed; calm low-contrast central 76 percent for dynamic text; sparse decorative clusters restricted to the outer edges and corners; no inset panel, no inner rectangle, no empty white cutout, no heavy outline, no rounded card silhouette
Color palette: milk cream and very pale notebook blue as the main paper, with small accents of saturated school blue, yellow, orange-red, turquoise, green, and a touch of soft pink-lilac
Constraints: no words, letters, numbers, quotation marks, logos, watermarks, photographs, people, faces, UI controls, picture frames, borders, holes, rulers, pencils, apples, paper airplanes, or large focal objects; preserve maximum readability in the center
Avoid: frame-within-frame composition, white central overlay, thick colored border, dense decoration, beige/brown/sepia cast
```

## Flat paper texture v2

```text
Use case: stylized-concept
Asset type: reusable flat paper texture master for greeting cards, quality labels, and quote cards in the “Школьный коллаж” template
Primary request: create a close-up full-bleed sheet of handmade notebook paper with very subtle tactile grain and faint irregular ruled/grid marks, designed to be color-tinted by code into yellow, turquoise, green, pale blue, and soft pink-lilac variants
Style/medium: refined school scrapbook paper, lightly screen-printed and fibrous, friendly but calm
Composition/framing: landscape 3:2, edge to edge, nearly uniform across the canvas; no panel silhouette, no border, no inset rectangle, no torn outer edge; central 88 percent clear for dynamic text
Color palette: pale neutral paper base with cool light-blue undertone; avoid beige, brown, coffee, sepia and terracotta
Constraints: no words, letters, numbers, symbols, quotation marks, logos, watermarks, photographs, people, faces, UI, stickers, flowers, leaves, stars, hearts, pencils, rulers, clips, tape, frames, outlines, shadows, holes, or large objects
Avoid: card border, white center cutout, decorative frame, strong contrast, dense pattern, yellowed vintage paper
```

## Torn notebook message paper v3

```text
Use case: stylized-concept
Asset type: reusable blank message-card paper master for the “Школьный коллаж” digital greeting-card template
Input images: Image 1 is the current implementation and is only a problem reference; Image 2 is the approved visual-style reference
Primary request: create one original straight landscape sheet of bright squared school-notebook paper, as if neatly torn from a spiral notebook, for dynamic congratulation text
Style/medium: tactile handmade paper collage, realistic fibrous notebook paper, clearly visible light-blue square grid, subtle screen-print grain
Composition/framing: wide landscape 3:1 strip; the paper fills the canvas; a convincing torn perforated notebook edge with a vertical row of binder holes is visible along the LEFT edge only; central 82 percent is calm and uninterrupted for dynamic text; tiny irregular paper edge and restrained soft shadow
Color palette: clean pale paper base with cool blue grid, designed to be tinted by code into saturated sunny yellow, aqua turquoise, fresh mint, and soft lilac variants
Constraints: no words, letters, numbers, quotation marks, logos, watermarks, photographs, people, faces, UI controls; no apples, flowers, stars, hearts, pencils, rulers, clips, tape or other focal decorations; no white inset panel; no frame within frame; no brown, coffee, sepia or terracotta cast; do not place holes on the right edge
Avoid: vintage yellowed paper, blank white rectangle over the grid, dense decoration, rotated card, perspective distortion
```

## Native-colored notebook message papers v4

Четыре самостоятельных edit-вызова встроенного ImageGen были выполнены по `notebook-message-master-v3.png`. В поле `<COLOR>` последовательно использованы варианты ниже.

```text
Use case: precise-object-edit
Asset type: production message-card paper background for the “Школьный коллаж” template
Input images: Image 1 is the edit target and geometry reference
Primary request: recolor only the physical notebook sheet itself so it is natively <COLOR>; strengthen the grid so every square remains clearly visible at small UI size
Style/medium: realistic fibrous colored school-notebook paper, pigment integrated into the paper material rather than a global overlay
Composition/framing: preserve the exact straight 3:1 landscape sheet, the torn top/bottom/right edges, and the complete row of torn binder holes along the LEFT edge
Constraints: preserve the white/light neutral space outside the sheet and inside every binder hole; holes must read as actual cutouts and must NOT receive the paper color; no global color wash; keep the sheet center clear for dynamic text; no text, symbols, decorations, tape, stickers, objects, logos or watermark
Avoid: faint invisible grid, monochrome color overlay, colored background outside the paper, colored hole interiors, rounded rectangle, white inset panel, vintage yellowed or sepia paper
```

Варианты `<COLOR>`:

- `a lively sunny yellow paper body with clearly visible medium-blue notebook grid lines`
- `a lively aqua-turquoise paper body with clearly visible deeper turquoise-blue notebook grid lines`
- `a lively fresh mint-green paper body with clearly visible cool blue-green notebook grid lines`
- `a lively soft lilac paper body with clearly visible blue-violet notebook grid lines`

## Bright quality labels v2

Пять самостоятельных вызовов встроенного ImageGen создали разные силуэты. Ниже приведены финальные промпты; для жёлтой и зелёной плашек это повторные генерации, которые дали настоящий прозрачный фон.

```text
Use case: stylized-concept. Asset type: isolated transparent UI label background. Create one vivid sunny-yellow wide torn-paper label with softly rounded uneven edges, subtle graph-paper texture, an orange hand-drawn double outline, and one tiny coral heart sticker touching the lower-right edge. Handmade school scrapbook aesthetic. Keep the central 72% calm and clear for dark text. The canvas outside the paper silhouette must contain genuine alpha transparency; do not draw, depict, simulate, or show a checkerboard, studio backdrop, floor, gradient, shadow field, or background of any kind. No text, letters, numbers, logos, watermark, beige, brown, or white inner panel. One isolated landscape label only.
```

```text
Image 1 role: style reference only. Use case: stylized-concept. Asset type: transparent website UI card background for one personality quality. Primary request: a vivid coral-pink handmade scrapbook label shaped as a wide scalloped oval, with a darker raspberry stitched double edge and one tiny sunny-yellow smiley-dot sticker at the lower-right edge only. Style/medium: tactile school-notebook collage, real paper fibers, subtle graph-paper texture, cut-paper layering, cheerful and polished. Composition/framing: single centered landscape label, generous transparent padding, readable central 72% kept calm and uncluttered for dark text. Color palette: bright coral pink, raspberry outline, tiny yellow accent. Constraints: genuinely transparent background outside the label; no text, no letters, no numbers, no logos, no watermark; no white center panel; no beige or brown; one isolated label only; strong clean silhouette.
```

```text
Image 1 role: style reference only. Use case: stylized-concept. Asset type: transparent website UI card background for one personality quality. Primary request: a vivid turquoise handmade scrapbook label, a wide layered rectangular paper tag with torn sides, slightly clipped corners, a deep-blue hand-drawn double outline, and one tiny yellow star sticker at the lower-right edge only. Style/medium: tactile school-notebook collage, real paper fibers, subtle graph-paper texture, cut-paper layering, cheerful and polished. Composition/framing: single centered landscape label, generous transparent padding, readable central 72% kept calm and uncluttered for dark text. Color palette: bright turquoise and aqua, deep school blue outline, tiny yellow accent. Constraints: genuinely transparent background outside the label; no text, no letters, no numbers, no logos, no watermark; no white center panel; no beige or brown; one isolated label only; strong clean silhouette.
```

```text
Use case: stylized-concept. Asset type: isolated transparent UI label background. Create one vivid fresh-green wide asymmetrical oval or leaf-like capsule paper label with subtle graph-paper texture, a dark-green hand-drawn double outline, and one tiny cream-and-yellow flower sticker touching the lower-right edge. Handmade school scrapbook aesthetic. Keep the central 72% calm and clear for dark text. The canvas outside the paper silhouette must contain genuine alpha transparency; do not draw, depict, simulate, or show a checkerboard, studio backdrop, floor, gradient, shadow field, or background of any kind. No text, letters, numbers, logos, watermark, beige, brown, or white inner panel. One isolated landscape label only.
```

```text
Image 1 role: style reference only. Use case: stylized-concept. Asset type: transparent website UI card background for one personality quality. Primary request: a vivid lavender handmade scrapbook label, a wide soft rectangle with clipped irregular corners and small side notches, a violet dashed hand-drawn outline, and one tiny coral star sticker at the lower-right edge only. Style/medium: tactile school-notebook collage, real paper fibers, subtle graph-paper texture, cut-paper layering, cheerful and polished. Composition/framing: single centered landscape label, generous transparent padding, readable central 72% kept calm and uncluttered for dark text. Color palette: bright lavender and lilac, violet outline, tiny coral accent. Constraints: genuinely transparent background outside the label; no text, no letters, no numbers, no logos, no watermark; no white center panel; no beige or brown; one isolated label only; strong clean silhouette.
```

## Decorative quote card v3

```text
Image 1 role: style reference only. Use case: stylized-concept. Asset type: reusable website quote-card background. Primary request: one vivid handmade school-scrapbook note card with layered torn papers: saturated school-blue outer paper, sunny-yellow and coral tape fragments, and a clearly colored light-aqua graph-paper center. The center must remain aqua, never white. Add subtle stitched/marker edge details and tiny paper scraps only along the border. Style/medium: tactile notebook collage, visible paper fibers and graph grid, cut-and-pasted handmade character, cheerful and polished. Composition/framing: single landscape rectangular card filling the canvas; rounded handmade edges; central 78% width by 62% height kept calm and unobstructed for dark quote text; decorations only at outer corners and edges. Color palette: saturated blue, aqua, yellow, coral, small mint accents. Constraints: no text, no letters, no numbers, no quotation marks, no apple, no logos, no watermark; no white or beige center panel; no separate objects outside the card; avoid dark center; strong readable text area.
```

## Semantic responsive section surfaces v2

Три отдельные поверхности созданы встроенным ImageGen. `section-memories.png` использован только как стилевой референс. В интерфейсе эти изображения подключаются через пропорциональный режим `cover`, поэтому не растягиваются ни на ПК, ни на мобильной развёртке.

### Featured main greeting

```text
Image 1 role: visual-style reference only. Use case: stylized-concept. Asset type: responsive full-bleed section background for the main congratulation block of a digital school scrapbook card. Primary request: create a clearly special ceremonial main-letter surface, visually more important than ordinary message cards. Use one continuous pale aqua squared notebook-paper sheet with a bold handmade school-blue double marker frame, a sunny-yellow radiating halo of short doodle strokes behind the upper central title zone, coral ribbon-tab accents, and a small sealed-heart letter sticker near an inner corner. It should immediately read as the main, featured congratulation. Style/medium: tactile cut-paper school scrapbook matching Image 1, fibrous paper, graph grid, marker strokes, layered tape, cheerful polished handmade finish. Composition/framing: landscape 3:2 full bleed; central 72% calm and readable for dynamic heading and paragraph; semantic emphasis stays near the central area so proportional cropping works in both wide desktop and narrow mobile containers; decorative details distributed inward from all edges, never dependent on the extreme corners. Color palette: light aqua paper, saturated school blue, sunny yellow, coral-orange, small mint accents. Constraints: no text, letters, numbers, quotation marks, logos, watermark, photographs, people, UI controls, apple, ruler or pencil; no white inset rectangle; no separate floating card on a background; no beige, brown, coffee, sepia or terracotta cast. Avoid: generic border copied from Image 1, frame-within-frame with white center, dense center decoration, perspective distortion.
```

### Congratulations doodle field

```text
Image 1 role: visual-style reference only. Use case: stylized-concept. Asset type: responsive full-bleed section background for the congratulations collection of a digital school scrapbook card. Primary request: create an original lively field made from many hand-drawn school doodles and small cut-paper illustrations rather than a repeated border. Use a continuous very light cool notebook-paper base with scattered marker drawings: stars, hearts, flowers, squiggles, dots, paper clips, tiny envelopes, balloons, confetti, leaves and abstract celebratory strokes. Drawings should feel varied and hand-made, with brighter clusters around the outer third and a quieter but still visibly illustrated central field. Style/medium: tactile school scrapbook, marker and colored-pencil drawings, tiny paper stickers, subtle graph-paper texture, friendly screen-print grain, matching Image 1's craft language. Composition/framing: landscape 3:2 full bleed; an even all-over distribution that remains meaningful after proportional cropping on wide desktop and narrow/tall mobile containers; no single focal object; central content area readable under cards and photos. Color palette: saturated school blue, turquoise, yellow, coral-orange, green, pink and lavender on a pale cool paper base. Constraints: no text, letters, numbers, logos, watermark, photographs, people, faces or UI controls; no large white inset panel; no heavy frame; no beige, brown, coffee, sepia or terracotta cast. Avoid: identical copied motifs, rigid border-only layout, blank empty center, oversized objects, perspective distortion.
```

### Closing finale

```text
Image 1 role: visual-style reference only. Use case: stylized-concept. Asset type: responsive full-bleed closing/footer background for a digital school scrapbook greeting card. Primary request: invent a warm concluding scrapbook surface that feels like the last page of a school album. Use a continuous pale mint-blue squared notebook-paper base, a layered torn-paper band along the lower portion in saturated blue, yellow and coral, a small paper-airplane doodle with a looping trail on one side, and a compact bouquet of pencils/flowers plus a friendly backpack-style sticker silhouette on the other side. Keep the action area calm and bright. Style/medium: tactile cut-paper school scrapbook matching Image 1, marker outlines, fibrous paper, subtle graph grid, polished handmade collage. Composition/framing: landscape 3:2 full bleed; central 68% and middle vertical band calm for dynamic signature and buttons; important closing motifs positioned around the inner thirds rather than extreme corners so proportional cropping works on desktop and mobile; balanced visual ending, not a new hero. Color palette: pale mint-blue, school blue, turquoise, sunny yellow, coral-orange, green, small pink accents. Constraints: no text, letters, numbers, logos, watermark, photographs, people, faces or UI controls; no white inset rectangle; no beige, brown, coffee, sepia or terracotta cast; no huge focal object covering the center. Avoid: generic copied frame, dense center, dark background, perspective distortion.
```
## Responsive recompositions v3

### Featured summary — desktop

```text
Image 1 role: approved style and concept reference.
Use case: style-transfer.
Asset type: ultra-wide responsive desktop background for the featured main congratulation.
Primary request: recompose Image 1 as a true panoramic 10:3 horizontal scrapbook surface. Preserve the pale aqua graph paper, school-blue double marker frame, yellow celebratory rays, coral ribbon tabs, flowers, small doodles and sealed-heart envelope, but arrange every important decoration inside the panoramic strip so nothing must be cropped away.
Composition/framing: very wide and shallow banner; full blue frame visible on all four sides; yellow rays compact above the central title zone; envelope scaled smaller and fully visible near the lower-right inner third; decorative paper and flowers visible within the strip; central 56% calm for dynamic text.
Constraints: preserve the established palette and tactile paper style; no text, letters, numbers, logos, watermark, photographs, people or UI; no extra white panel; no distorted or stretched objects; no beige, brown, sepia or terracotta cast.
```

### Featured summary — mobile

```text
Image 1 role: approved style and concept reference.
Use case: style-transfer.
Asset type: portrait mobile background for the featured main congratulation.
Primary request: recompose Image 1 into a vertical 3:4 scrapbook surface for a narrow mobile block. Preserve the pale aqua graph paper, school-blue double marker frame, yellow celebratory rays, coral ribbon tabs, flowers, small doodles and sealed-heart envelope, with all elements resized and repositioned so they remain fully visible in portrait format.
Composition/framing: portrait; full blue frame visible; compact rays above the title zone; small envelope below the text zone; central 72% width calm for dynamic heading and paragraph; decorations distributed near the inner edges without crowding.
Constraints: preserve palette and tactile paper style; no text, letters, numbers, logos, watermark, photographs, people or UI; no extra white panel; no distortion; no beige, brown, sepia or terracotta cast.
```

### Closing section — desktop

```text
Image 1 role: approved style and concept reference.
Use case: style-transfer.
Asset type: wide responsive desktop closing/footer background for a school scrapbook greeting card.
Primary request: recompose Image 1 as a panoramic 5:2 horizontal closing surface. Preserve the pale mint-blue graph paper, paper-airplane doodle with looping trail, torn blue/turquoise/yellow/coral paper bands, flowers, pencils and backpack, but resize and arrange every decorative element so it is fully visible in the shallow banner.
Composition/framing: very wide shallow banner; torn paper bands stay along the lower edge but use only the lower 26%; paper airplane fully visible in the left inner quarter; backpack and pencil bouquet smaller and fully visible in the right inner quarter; central 56% calm for signature and buttons.
Constraints: preserve established colors and tactile cut-paper style; no text, letters, numbers, logos, watermark, photographs, people or UI; no distortion; no huge object; no beige, brown, sepia or terracotta cast.
```

### Closing section — mobile

```text
Image 1 role: approved style and concept reference.
Use case: style-transfer.
Asset type: portrait mobile closing/footer background for a school scrapbook greeting card.
Primary request: recompose Image 1 into a vertical 3:4 closing surface. Preserve the pale mint-blue graph paper, paper-airplane doodle with looping trail, torn blue/turquoise/yellow/coral paper bands, flowers, pencils and backpack, repositioned and resized so every key element remains fully visible on mobile.
Composition/framing: portrait; paper airplane small near the upper-left inner edge; backpack and pencil bouquet compact near the lower-right; torn bands restricted to the bottom 20%; central 74% width calm for dynamic signature and stacked buttons.
Constraints: preserve palette and tactile cut-paper style; no text, letters, numbers, logos, watermark, photographs, people or UI; no distortion; no huge object; no beige, brown, sepia or terracotta cast.
```
