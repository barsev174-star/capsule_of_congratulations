# VPS deployment notes

Актуально на 26 августа 2026 года. Это основной документ по production-инфраструктуре Slovesto.

## Текущий production-статус

- Домен: `https://slovesto.ru`.
- Проект на VPS: `/home/deploy/capsule`.
- Docker Compose project: `capsule`.
- На VPS не должно быть других прикладных Docker-проектов.
- Текущий release-набор: шесть продуктовых шаблонов, включая «Детство в рисунках» (`kindergarten-doodles`) и «Вместе» (`team-editorial`), их демонстрационные открытки, статические OG-превью, локальные шрифты и Story/Post/A4-экспорты. В составе сайта есть отдельные SEO-страницы для учителя и воспитателя; маршрут воспитателю — `/gruppovaya-otkrytka/vospitatelyu`, его CTA и пример используют `kindergarten-doodles`. Точный развернутый commit проверяется на VPS командой `git rev-parse --short HEAD`.
- Security baseline от 26 августа 2026 года: Next.js `16.3.3`, sharp `0.35.3`, PostCSS `8.5.23`, nanoid `3.3.18`; `npm audit` и `npm audit --omit=dev` возвращают `0 vulnerabilities`. Sharp объявлен прямой production-зависимостью, поскольку используется runtime-маршрутами фотографий, OG и экспортов.
- 26 августа опубликована третья SEO-страница `/gruppovaya-otkrytka/kollege` (код `a459323`) с шаблоном «Вместе», анимациями и компактными SEO-ссылками главной. Web/PostgreSQL healthy; публичные страницы, OG, canonical и sitemap проверены.

Рабочие контейнеры:

| Контейнер | Назначение | Публичные порты |
| --- | --- | --- |
| `capsule-caddy-1` | HTTPS, редирект `www`, reverse proxy | `80`, `443` |
| `capsule-web-1` | Next.js и export-worker | только `127.0.0.1:3100 → 3000` |
| `capsule-postgres-1` | PostgreSQL | наружу не публикуется |

Общие данные и сеть:

- Docker network: `capsule_default`.
- PostgreSQL volume: `capsule_postgres_data`.
- Caddy volumes: `capsule_caddy_data`, `capsule_caddy_config`.
- Загруженные файлы: bind mount `/home/deploy/capsule/public/uploads`.
- Медиа публичных версий: bind mount `/home/deploy/capsule/data/public-share-media`.

## Релиз SEO-страницы коллеге от 26 августа

Опубликован маршрут `/gruppovaya-otkrytka/kollege` с оформлением `team-editorial`, статическим OG `/landing/colleague/og-team-editorial.jpg`, sitemap и ссылками с главной. В этот же релиз входят анимации страницы, сохранение шаблона при создании из примера и уплотнение блока «Для каких случаев». Детали: `COLLEAGUE_SEO_LANDING_2026-08-26.md`.

Миграции и переменные окружения не добавляются. Достаточно пересобрать и заменить сервис `web`; PostgreSQL, Caddy, их volumes и bind mounts не пересоздаются. После выпуска проверить новый маршрут, его canonical/OG, sitemap и прежние страницы учителю/воспитателю. Фактический commit сверяется через `git rev-parse HEAD` на VPS.

## Caddy принадлежит Slovesto

Caddy является сервисом `caddy` в `docker-compose.prod.yml` и использует `infra/Caddyfile`. Он больше не зависит от другого Compose-проекта или ручного `docker network connect`.

Проксирование выполняется напрямую внутри `capsule_default`:

```caddyfile
slovesto.ru {
  encode gzip zstd
  reverse_proxy web:3000
}

www.slovesto.ru {
  redir https://slovesto.ru{uri} permanent
}
```

Сертификаты выпускаются и обновляются Caddy автоматически. Данные ACME сохраняются в `capsule_caddy_data` и не должны удаляться при обычном деплое.

## Production compose

Проверка конфигурации:

```bash
cd /home/deploy/capsule
docker compose -f docker-compose.prod.yml --env-file .env.production config --quiet
```

Запуск или обновление полного стека:

```bash
cd /home/deploy/capsule
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Если менялся только Caddyfile или описание сервиса Caddy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d caddy
```

Миграции выполняются идемпотентно при старте web. При необходимости их можно вызвать вручную:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec web npm run db:migrate
```

## Обязательная проверка после деплоя

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker inspect --format '{{.State.Health.Status}}' capsule-web-1
curl -fsS -o /dev/null -w 'root=%{http_code} %{time_total}s\n' https://slovesto.ru/
curl -fsS -o /dev/null -w 'example=%{http_code} %{time_total}s\n' https://slovesto.ru/example
```

Ожидается:

- `capsule-web-1` и `capsule-postgres-1` — healthy;
- `capsule-caddy-1` — running;
- `/` и `/example` — HTTP 200;
- `www.slovesto.ru` перенаправляется на основной домен;
- в `docker ps` нет посторонних прикладных контейнеров.

Дополнительно проверить:

1. `/manage/{token}` и переключение вкладок.
2. Публичную страницу `/share/{token}`.
3. Story, Post и A4 на реальном публичном токене.
4. `/` и `/?_rsc=test` во время Story.
5. Логи `export:*` до `export:complete`.

Подробности экспортного контура находятся в `docs/PUBLIC_SHARE_EXPORTS.md`.

## Export-worker

Production-маршрут экспорта не выполняет Satori/Resvg в основном процессе Next.js. `capsule-web-1` запускает отдельный Next.js worker на `127.0.0.1:3001`:

- worker создаётся лениво при первом экспорте;
- одновременно выполняется только один экспорт;
- worker запускается с `nice -n 10`;
- основной Next.js проксирует только выбранный формат;
- при зависании worker останавливается и будет создан заново;
- лимит рендера — 75 секунд;
- лимит proxy-запроса — 82 секунды;
- клиентский abort — 85 секунд.

Понижать эти лимиты без production-замеров нельзя. Увеличение лимитов не является исправлением нехватки CPU.

## Мониторинг ресурсов

Минимальная диагностика VPS:

```bash
uptime
free -m
df -h /
vmstat 1 5
docker stats --no-stream
docker system df
docker ps -a
```

Тревожные признаки:

- CPU idle устойчиво около `0%`;
- load average существенно выше числа CPU;
- сотни процессов или zombie-процессов;
- неожиданные контейнеры, сети или volumes;
- `EAI_AGAIN postgres` в логах Next.js;
- экспорт не доходит от `export:start` до `export:assets-loaded`;
- диск заполнен более чем на 80%.

Не следует диагностировать такие симптомы только через Caddy или DNS: сначала нужно проверить общую нагрузку хоста и все Docker-проекты.

## Backup

Production-скрипты:

- `infra/scripts/backup-postgres.sh`;
- `infra/scripts/backup-uploads.sh`;
- `infra/scripts/run-nightly-backup.sh`;
- `infra/scripts/cleanup-old-backups.sh`;
- `infra/scripts/verify-backup-restore.sh`.

Ручной backup:

```bash
cd /home/deploy/capsule
BACKUP_DIR=/home/deploy/capsule/backups bash infra/scripts/run-nightly-backup.sh
```

Рекомендуемый cron:

```cron
35 3 * * * cd /home/deploy/capsule && BACKUP_DIR=/home/deploy/capsule/backups RETENTION_DAYS=14 bash infra/scripts/run-nightly-backup.sh >> /var/log/capsule-backup.log 2>&1
```

Минимальный комплект восстановления:

1. PostgreSQL dump и checksum.
2. Архив uploads и checksum.
3. Копия `.env.production` вне Git.
4. Рабочий commit и предыдущий Docker image Slovesto.

Контрольное восстановление выполняется в отдельную временную PostgreSQL-базу и временный каталог; рабочая база и uploads не изменяются:

```bash
cd /home/deploy/capsule
BACKUP_DIR=/home/deploy/capsule/backups bash infra/scripts/verify-backup-restore.sh
```

21.08.2026 сначала проверена предрелизная пара с 31 применённой миграцией, затем после выпуска `0032` создана новая пара и повторено восстановление уже с 32 миграциями. В обоих случаях SHA-256, восстановление PostgreSQL и распаковка uploads прошли успешно; временные данные были автоматически удалены.

## Данные и очистка Docker

Нельзя удалять без отдельного подтверждения:

- `capsule_postgres_data`;
- `/home/deploy/capsule/public/uploads`;
- `/home/deploy/capsule/data/public-share-media`;
- `.env.production`;
- активные и rollback-образы `capsule-web`.

`docker builder prune -af` не затрагивает работающие images/containers, но удаляет кеш сборки. Следующий deploy после такой очистки будет существенно дольше.

## Инцидент 20 августа 2026 года

На VPS был обнаружен скомпрометированный контейнер другого проекта, который занимал оба CPU и создавал сотни процессов. Проект полностью удалён, а Caddy перенесён в `capsule`.

Подробная временная линия, признаки, выполненная очистка и контрольные замеры: `docs/PRODUCTION_INCIDENT_2026-08-20.md`.

## Retention и служебные задания

Retention запускается после backup:

```cron
20 4 * * * cd /home/deploy/capsule && PROD_ENV_FILE=/home/deploy/capsule/.env.production bash infra/scripts/run-card-retention.sh >> /var/log/capsule-retention.log 2>&1
```

Перед добавлением или изменением cron нужно один раз вызвать соответствующий скрипт вручную и проверить лог. Текущий пользовательский crontab также содержит отправку event reminders из `/home/deploy/capsule`.

## Внешние оповещения о критических ошибках

Миграция `0032_critical_alert_deliveries.sql` добавляет надёжную PostgreSQL-очередь. `reportCriticalError` сначала сохраняет событие в телеметрии, затем ставит доставку в очередь; ошибка внешнего провайдера не ломает пользовательский сценарий.

Каналы:

- email: нужны `RESEND_API_KEY` и `EMAIL_FROM`; адрес берётся из `CRITICAL_ALERT_EMAIL`, затем из `SUPPORT_NOTIFICATION_EMAIL`;
- Telegram: дополнительно и только при наличии `TELEGRAM_BOT_TOKEN` и `TELEGRAM_SUPPORT_CHAT_ID`.

В сообщении разрешён только технический контекст: `errorId`, событие, операция, маршрут, компонент, шаг, шаблон и технические идентификаторы. Имена, email пользователей, тексты поздравлений, фотографии, токены и секреты не отправляются.

Ручная доставка очереди:

```bash
cd /home/deploy/capsule
bash infra/scripts/send-critical-alerts.sh
```

Production cron запускает короткий batch каждую минуту; `flock` исключает параллельные запуски:

```cron
* * * * * cd /home/deploy/capsule && bash infra/scripts/send-critical-alerts.sh >> /home/deploy/capsule/logs/critical-alerts.log 2>&1
```

Одинаковая критическая ошибка в пределах 15 минут не создаёт новый набор сообщений. Неуспешная доставка получает до пяти попыток с увеличивающейся задержкой; состояние очереди не логируется через `reportCriticalError`, чтобы исключить рекурсию alerts.

## Rollback

1. Зафиксировать текущий commit, контейнеры и логи.
2. Не удалять volumes PostgreSQL, Caddy и bind mounts.
3. Вернуть предыдущий рабочий `capsule-web` image/commit.
4. Выполнить `docker compose up -d` для нужных сервисов.
5. Проверить Caddy, health web/PostgreSQL, `/`, `/example`, manager и минимальный публичный экспорт.
6. Восстанавливать PostgreSQL только при подтверждённом повреждении данных и только из проверенного backup.
