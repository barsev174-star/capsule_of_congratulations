# Первый публичный запуск Slovesto

Это инструкция для первого публичного запуска на новом домене. Старый домен `darislova.ru` не участвует в production-плане: 301, сохранение старых URL и инструмент смены адреса сайта не требуются.

## Production-конфигурация

В production env должны быть заданы:

```env
NEXT_PUBLIC_SITE_URL=https://slovesto.ru
EMAIL_FROM="Slovesto <hello@mail.slovesto.ru>"
```

`mail.slovesto.ru` уже подтверждён в Resend. `EMAIL_REPLY_TO` не задаётся, пока для него не создан принимающий почтовый ящик или пересылка.

После настройки такого адреса добавьте, например, `EMAIL_REPLY_TO=hello@slovesto.ru`. Он будет передан в письма организатора и напоминания как `Reply-To`.

После изменения `NEXT_PUBLIC_SITE_URL` Docker-образ нужно пересобрать: переменная участвует в build-конфигурации приложения.

## Домен

Основной адрес — `https://slovesto.ru` без `www`. `https://www.slovesto.ru` должен отдавать постоянный 301 на основной адрес.

Для `www.slovesto.ru` настройте постоянный редирект на основной домен. Пример для Caddy:

```caddyfile
www.slovesto.ru {
  redir https://slovesto.ru{uri} permanent
}
```

Проверьте SSL для `slovesto.ru` и `www.slovesto.ru`, а также сохранение path и query-параметров при переходе с `www`.

## Очистка тестовых данных

До первого публичного запуска выполните backup PostgreSQL и uploads, затем на production-сервере запустите отчёт:

```bash
cd /home/deploy/capsule
bash infra/scripts/clear-test-data-for-public-launch.sh
```

Скрипт по умолчанию ничего не удаляет. Он показывает количество пользовательских сущностей и файлов. После проверки backup и отчёта выполните очистку только отдельной командой:

```bash
BACKUP_CONFIRMED=YES CONFIRM_TEST_DATA_CLEANUP=DELETE_TEST_DATA \
  bash infra/scripts/clear-test-data-for-public-launch.sh
```

Скрипт удаляет тестовые пользовательские данные и uploads, но сохраняет migrations, шаблоны, `template_overrides`, учётные записи администраторов и production secrets.

## Поиск и индексация

Приложение публикует `https://slovesto.ru/robots.txt` и `https://slovesto.ru/sitemap.xml`. В sitemap включены только текущие публичные маркетинговые страницы: главная и пример. Приватные маршруты `/account`, `/admin`, `/manage/*`, `/preview/*`, `/join/*`, `/gift/*` и `/reminders/cancel/*` отдают `noindex, nofollow` через metadata.

После запуска владелец проекта добавляет только `slovesto.ru` в Google Search Console, Яндекс Вебмастер и Яндекс Метрику, отправляет sitemap и отслеживает ошибки обхода.

## Release gate

Финальный набор SVG и raster-ассетов Slovesto уже подключён в приложении: логотип, favicon, app icon, OG-изображение и email-logo. Перед выпуском не заменяйте эти файлы вручную и не используйте устаревшие ассеты прежнего бренда.
