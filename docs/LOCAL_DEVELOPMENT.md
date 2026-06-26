# Локальный запуск

Короткий сценарий для разработки на Windows.

## Обычный запуск

1. Открыть Docker Desktop и дождаться полного запуска.
2. Открыть PowerShell.
3. Перейти в проект:

```powershell
cd "C:\Project\Поздравления2.0"
```

4. Запустить локальную базу:

```powershell
docker start capsule-postgres-local
```

5. Проверить, что база работает:

```powershell
docker ps --filter "name=capsule-postgres-local"
```

Нужно увидеть:

```text
0.0.0.0:5433->5432/tcp
```

6. Запустить приложение:

```powershell
npm.cmd run dev
```

7. Открыть:

```text
http://localhost:3000
```

## Если появилась ошибка `ECONNREFUSED 127.0.0.1:5433`

Это значит, что приложение не может подключиться к локальному PostgreSQL.

Проверить контейнер:

```powershell
docker ps -a --filter "name=capsule-postgres-local"
```

Если статус `Exited`, запустить:

```powershell
docker start capsule-postgres-local
```

Если контейнера нет, создать его:

```powershell
docker run --name capsule-postgres-local -e POSTGRES_DB=capsule -e POSTGRES_USER=capsule -e POSTGRES_PASSWORD=capsule_pass -p 5433:5432 -d postgres:16-alpine
npm.cmd run db:migrate
```

## Важные локальные ссылки

Текущий тестовый экран менеджера:

```text
http://localhost:3000/manage/5bc64fce98ef97e6d1432d8e03aceb82?tab=content
```

Финальная открытка для этой тестовой записи:

```text
http://localhost:3000/gift/ebb062c5c2cc
```

