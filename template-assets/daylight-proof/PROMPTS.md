# Daylight Proof — ImageGen prompts

Встроенный ImageGen использован для четырёх растровых мастер-ассетов контрольной художественной кожи. Фоторамки собираются отдельно и детерминированно скриптом `scripts/build-daylight-proof-source-assets.mjs`.

13 августа добавлены ещё два мастер-атласа. Из первого скрипт воспроизводимо собирает пять подложек смысловых блоков (`hero`, `summary`, `messages`, `memories`, `closing`) и четыре циклические подложки поздравлений. Блоки `qualities` и `quotes` по общему контракту семьи остаются без секционной подложки и используют только собственные текстовые плашки. Из второго атласа собирается заметная художественная кожа фоторамок; окно фотографии и область подписи при этом вырезаются строго по preset-геометрии.

## Underlay art atlas

```text
Use case: stylized-concept
Asset type: reusable art atlas for adaptive greeting-card section underlays and message-card underlays
Primary request: create a dense but refined daylight paper-collage texture containing many varied small abstract cut-paper motifs that can be sampled into multiple different borders
Style/medium: handmade paper fibers, screen-printed botanical fragments, torn paper strips, dots, short brush marks
Composition/framing: edge-to-edge landscape atlas with varied motifs distributed across the full canvas; no single focal object; include several visually distinct clusters and generous quiet ivory areas between them
Lighting/mood: fresh, optimistic, airy daylight
Color palette: cobalt blue, turquoise, coral orange, lemon yellow, and ivory; avoid brown, sepia, coffee and terracotta
Constraints: no words, letters, numbers, logos, watermarks, photographs, people, frames, UI controls, shadows outside the canvas; crisp enough to crop and mask into multiple exact geometric assets
Avoid: aurora, night sky, stars, large flowers, recognizable objects, continuous gradients
```

## Photo-frame art atlas

```text
Use case: stylized-concept
Asset type: reusable raster art atlas for a real photo-frame skin
Primary request: create an obvious decorative daylight collage pattern that will be clipped by code into the border of portrait and landscape photo frames
Style/medium: layered cut paper, hand-painted strokes, screen-print texture, visible paper fibers
Composition/framing: edge-to-edge landscape texture; alternating cobalt and turquoise torn strips, coral brush dashes, lemon dots and small ivory gaps; evenly detailed across the canvas with no central focal point
Lighting/mood: cheerful tactile daylight, polished craft
Color palette: cobalt blue, turquoise, coral orange, lemon yellow, ivory; avoid brown, sepia, coffee and terracotta
Constraints: no text, letters, logos, watermarks, photographs, people, frames, holes, transparent areas or UI; must remain recognizable after masking into a narrow border
Avoid: dark night palette, aurora, stars, realistic flowers, large empty center
```

## Page background

```text
Use case: stylized-concept
Asset type: reusable greeting-card page background texture
Primary request: create a bright daylight collage background, clearly different from a dark northern-lights theme
Style/medium: refined layered paper collage with subtle handmade fibers and screen-printed abstract botanical shapes
Composition/framing: edge-to-edge landscape texture, calm central field, visual interest concentrated near outer edges; no frame and no text
Lighting/mood: fresh, optimistic, airy daylight
Color palette: pale aqua and ivory base, cobalt blue, turquoise, coral orange, small lemon-yellow accents; avoid brown, sepia, coffee and terracotta
Constraints: seamless-feeling surface suitable behind multiple content panels; no words, letters, logos, watermarks, people, photographs or UI controls; keep center low contrast for readability
Avoid: dark night sky, aurora, stars, gradients that resemble northern lights
```

## Adaptive section underlay

```text
Use case: stylized-concept
Asset type: adaptive section underlay for a reusable digital greeting card
Primary request: a single large ivory paper panel with a clearly visible but irregular hand-cut collage edge, designed to stretch responsively with nine-slice scaling
Style/medium: refined paper collage and subtle screen-print texture
Composition/framing: landscape panel fills the canvas; meaningful decoration only in the outermost 5 percent corners and outermost 8 percent top and bottom; the central 85 percent must be calm, uniform ivory with no focal objects; border thickness visually consistent on all sides
Lighting/mood: fresh daylight, tactile but clean
Color palette: ivory paper, thin cobalt and turquoise edge accents, tiny coral and lemon details; no brown, sepia, coffee or terracotta
Constraints: no text, letters, logos, watermarks, photos, people, UI controls; no shadows extending beyond canvas; corners and edges must remain recognizable after stretching; center must be low contrast and readable
Avoid: dark colors, aurora, stars, ornamental frame with large flowers intruding into text area
```

## Quality card

```text
Use case: stylized-concept
Asset type: small reusable quality-card background for a digital greeting card
Primary request: a compact rounded paper collage label with a quiet center reserved for 1–2 lines of text
Style/medium: crisp handmade paper cutout, screen-printed accent marks, subtle fiber texture
Composition/framing: landscape pill-like card fills the canvas; decoration restricted to outer corners and bottom 15 percent; central 80 percent empty and uniform
Color palette: ivory center, cobalt blue border, turquoise and lemon details, one tiny coral accent; avoid brown, sepia, coffee and terracotta
Constraints: no text, letters, logos, watermark, photos, people or UI controls; high readability; no drop shadow extending outside the canvas
Avoid: dark night palette, aurora, large floral element covering center
```

## Quote card

```text
Use case: stylized-concept
Asset type: wide quote-card background for a digital greeting card
Primary request: an airy ivory paper collage quote panel with a reserved text area in the lower-middle 60 percent
Style/medium: refined layered paper cutouts with screen-printed botanical marks and subtle handmade fiber texture
Composition/framing: landscape panel fills canvas; small abstract decoration along top corners and bottom edge; central text field remains calm and uniform; no quotation mark because the interface adds it separately
Color palette: ivory, cobalt blue, turquoise, coral orange and lemon yellow; avoid brown, sepia, coffee and terracotta
Constraints: no text, letters, quotation marks, logos, watermark, people, photos or UI controls; high contrast for dark navy text; no shadow outside canvas
Avoid: dark night palette, aurora, stars, oversized floral shapes covering the center
```
