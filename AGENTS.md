# Правила интерфейса проекта

## Цвета

- Коричневый, кофейный, сепия и терракотовый не используются в интерфейсе: ни для текста, кнопок, ссылок, иконок, бейджей, полей, ошибок и других элементов управления.
- Основное действие — сплошная фирменная оранжевая кнопка: `#e9652f`; наведение — `#df5f2e`; нажатие — `#c7532a`.
- Вторичное действие — белое или нейтральное с оранжевым текстом и/или оранжевой рамкой.
- Основной текст — `#202124`; вторичный — `#5f6368`; приглушённый — `#8a9099`.
- Поверхности интерфейса — белые или нейтральные (`#ffffff`, `#f7f8fa`), тени — нейтральные чёрные с прозрачностью.
- Художественная палитра готовой открытки может жить только внутри самой открытки и не должна переходить в редактор или элементы управления.
- После изменений интерфейса обязательно запускать `npm run ui:colors` или `npm run lint`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
