# Ежедневная отправка напоминаний на VPS

Скрипт `infra/scripts/send-event-reminders.sh` вызывает защищённый endpoint приложения. Он не запускает второй экземпляр параллельно, завершает зависший HTTP-запрос через 120 секунд и возвращает ненулевой код при ошибке.

## Перед включением

1. Применить миграции `0011`–`0014` штатной командой проекта.
2. Установить длинные независимые `CRON_SECRET` и `REMINDER_TOKEN_SECRET` в `.env.production` и передать их контейнеру приложения.
3. Убедиться, что заданы `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL=https://www.darislova.ru` и `REMINDER_TIME_ZONE=Asia/Yekaterinburg`.
4. После обновления приложения вручную выполнить:

```bash
cd /home/deploy/capsule
bash infra/scripts/send-event-reminders.sh
```

Ожидаемый ответ без готовых к отправке записей:

```json
{"claimed":0,"sent":0,"failed":0}
```

## Cron

На сервере с часовым поясом UTC запуск в `04:00` соответствует `09:00 Asia/Yekaterinburg`:

```cron
0 4 * * * cd /home/deploy/capsule && bash infra/scripts/send-event-reminders.sh >> /var/log/capsule-reminders.log 2>&1
```

Добавить строку через `sudo crontab -e`. Не устанавливать cron до успешной ручной проверки письма.

## Проверка

```bash
sudo crontab -l
tail -100 /var/log/capsule-reminders.log
```

В журнале должны быть время старта, JSON-результат и время завершения. При параллельном запуске скрипт пишет `reminder batch is already running` и безопасно завершается.
