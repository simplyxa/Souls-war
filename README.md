# ⚔ Souls War

Браузерная текстовая RPG (в духе barbars.ru): локации, пошаговые бои, инвентарь, квесты, магазин и админ-API.

- **Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL, JWT, Swagger
- **Frontend:** React + TypeScript (Vite)
- **Инфраструктура:** Docker + docker-compose (nginx раздаёт фронтенд и проксирует `/api`)

```
/server   NestJS API (prisma/ — схема, миграции, seed)
/client   React SPA
docker-compose.yml
```

## Быстрый старт (Docker)

```bash
docker compose up --build
```

Затем откройте:

| Что               | URL                              |
| ----------------- | -------------------------------- |
| Игра              | http://localhost:8080            |
| API / Swagger UI  | http://localhost:3000/api/docs   |

При старте контейнер `server` сам применяет миграции и (идемпотентно) заполняет БД демо-данными.

**Демо-аккаунты**

| Логин   | Пароль        | Роль   | Описание            |
| ------- | ------------- | ------ | ------------------- |
| `hero1` | `password123` | PLAYER | Артур, 1 уровень    |
| `hero2` | `password123` | PLAYER | Мерлин, 3 уровень   |
| `admin` | `admin123`    | ADMIN  | доступ к `/api/admin/*` |

Новых игроков можно регистрировать на экране входа.

## Переменные окружения

Docker (файл `.env` рядом с `docker-compose.yml`, см. `.env.example`; все значения необязательны):

| Переменная                                  | По умолчанию               | Описание                          |
| ------------------------------------------- | -------------------------- | --------------------------------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `souls`          | Доступ к БД                       |
| `JWT_SECRET`                                | `change-me-in-production`  | Секрет подписи JWT (**смените!**) |
| `JWT_EXPIRES_IN`                            | `1d`                       | Время жизни токена                |

Сервер (`server/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT` (3000), `CORS_ORIGIN` (список через запятую, по умолчанию — любой).

## Локальная разработка без Docker

Нужны Node.js 20+ и PostgreSQL.

```bash
# backend
cd server
cp .env.example .env            # поправьте DATABASE_URL
npm install
npx prisma migrate deploy       # применить миграции
npx prisma db seed              # демо-данные
npm run start:dev               # http://localhost:3000/api

# frontend (в другом терминале)
cd client
npm install
npm run dev                     # http://localhost:5173 (прокси /api -> :3000)
```

### Тесты и линтеры

```bash
cd server
npm test                                  # unit/smoke-тесты (без БД)
E2E=1 DATABASE_URL=... npx jest test      # e2e-флоу (нужна мигрированная и засиденная БД)
npm run lint && npm run format

cd client
npm run lint && npm run build && npm run format
```

## Архитектура backend

Модули NestJS (`server/src`):

| Модуль      | Ответственность                                                                 |
| ----------- | ------------------------------------------------------------------------------- |
| `auth`      | регистрация, логин, JWT (bcrypt-хэш паролей), стратегия passport-jwt            |
| `players`   | профиль персонажа, эффективные статы, энергия, опыт и уровни, топ игроков       |
| `world`     | текущая локация (NPC, переходы, действия), перемещение, отдых в таверне         |
| `combat`    | пошаговый бой (атака / защита / предмет / побег), награды и штрафы              |
| `inventory` | инвентарь, экипировка, расходники                                               |
| `quests`    | задания: доступен → активен → выполнен, награды                                 |
| `shop`      | покупка / продажа у торговца в текущей локации                                  |
| `logs`      | история действий (хранятся последние 100 записей на игрока)                     |
| `admin`     | CRUD локаций, переходов, предметов, NPC, ассортимента торговцев, квестов        |

Особенности: глобальные `JwtAuthGuard` и `RolesGuard` (все маршруты защищены, кроме `@Public()`), DTO + `class-validator`
(`whitelist`, `forbidNonWhitelisted`), фильтр ошибок Prisma (404/409), игровые операции выполняются в транзакциях,
бой блокируется `SELECT ... FOR UPDATE`. Роль пользователя перечитывается из БД при каждом запросе.

### Игровая механика и формулы

Все формулы — чистые функции в [`server/src/game/formulas.ts`](server/src/game/formulas.ts) с юнит-тестами.

- **Эффективные характеристики** = базовые + бонусы надетых предметов.
- **Сила атаки** = `2 + 1.5·Сила + урон оружия`; **защита** = `броня + ⌊Сила/4⌋`.
- **Урон удара** = `max(1, round(сила_атаки · (0.85 + 0.3·rnd) − защита))`.
- **Крит**: шанс `5% + 0.5%·Интеллект` (максимум 50%), урон ×1.5.
- **Уклонение** = `clamp(5% + 2%·(Ловкость защитника − Ловкость атакующего) [+20% при защите], 0%, 60%)`.
- **Защита (действие)**: входящий урон вдвое меньше (минимум 1) и +20% к уклонению на ход врага.
- **Побег** = `clamp(40% + 3%·(Ловкость − Ловкость врага), 10%, 90%)`; при неудаче враг атакует.
- **Использование предмета** в бою тратит ход. Предмет без эффекта (полное HP/энергия) использовать нельзя.
- **Победа**: опыт, золото, шанс дропа, прогресс квестов. **Поражение**: −10% золота, возврат в стартовую локацию с половиной HP.
- **Уровни**: нужно `100·уровень` опыта; за уровень `+8 макс. HP`, `+2 макс. энергии`, `+1` ко всем характеристикам, полное восстановление.
- **Энергия**: переход −1, начало боя −2, восстановление +1 в минуту. Таверна (10 золота) восстанавливает всё.
- **Магазин**: цена покупки = цена предмета, продажа = 50%.

### Основные эндпоинты

Полная документация — в Swagger UI (`/api/docs`). Авторизация: заголовок `Authorization: Bearer <accessToken>`.

| Метод и путь | Описание |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | регистрация / вход → `accessToken` |
| `GET /api/players/me`, `GET /api/players/top` | профиль / топ игроков |
| `GET /api/world/location`, `POST /api/world/move`, `POST /api/world/rest` | мир |
| `GET /api/combat`, `POST /api/combat/start`, `POST /api/combat/action` | бой (`ATTACK`, `DEFEND`, `USE_ITEM`, `FLEE`) |
| `GET /api/inventory`, `POST /api/inventory/use \| equip \| unequip` | инвентарь |
| `GET /api/quests`, `POST /api/quests/:id/accept \| complete` | квесты |
| `GET /api/shop`, `POST /api/shop/buy \| sell` | магазин |
| `GET /api/logs?limit=50` | история действий |

### Админ-API (роль `ADMIN`)

Для каждого ресурса доступны `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
(ответ `403` для не-админов, `409` при удалении связанной записи):

`/api/admin/locations`, `/api/admin/location-links`, `/api/admin/items`, `/api/admin/npcs`,
`/api/admin/shop-entries`, `/api/admin/quests`.

Пример: добавить предмет

```bash
curl -X POST http://localhost:3000/api/admin/items \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Меч героя","type":"WEAPON","damage":8,"price":300}'
```

## Seed-данные

6 локаций (Деревня Рассвет → Тёмный лес → Форт Пепла / Заброшенная шахта → Руины Цитадели → Пещера Дракона),
11 предметов, NPC (монстры, торговцы Борис и Горн, староста), цепочка из 4 квестов и 3 демо-аккаунта.

## Ограничения и что улучшить

- Нет WebSocket/мультиплеера, PvP, чата, гильдий; бои только против NPC.
- Нет rate limiting и refresh-токенов; JWT хранится в `localStorage`.
- Квесты только на убийство, один тип наград; нет диалогов с NPC.
- Нет отдельной админ-панели в UI (только REST + Swagger).
- Нет клиентских тестов; e2e-тесты backend запускаются вручную (`E2E=1`).
- Баланс (формулы, цены, шансы) — стартовый, требует настройки.
