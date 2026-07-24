# Landing UI polish — 2026-07-24

## Scope

The home page and the Route template received targeted visual corrections after desktop and mobile reviews.

## Route template

- Greeting photos use the same horizontal-photo presentation as the `Моменты` block.
- Captions use the same typography and centered one- or two-line alignment as `Моменты`.
- The mobile layout preserves the textured frame treatment without introducing horizontal overflow.

## Home page

- `Для каких случаев`: mobile cards retain two columns; icons and titles sit in one row, titles use natural wrapping, and the wording is `Благодарность или прощание`.
- `Как это работает`: number badges no longer cover step icons, remain aligned above them on desktop, and the connector line ends at the final step on mobile.
- AI demo and pricing comparison: the decorative pencils are optically aligned with their arrows on desktop and mobile; the pricing pencil is composed of a body, wooden collar, and graphite tip.

## Verification

- Reviewed locally at desktop and 390 px mobile widths.
- `npm run lint` and `npm run build` pass.
