# База данных SQLite для Telegram Mini App

## Обзор

Проект теперь использует SQLite базу данных для хранения данных пользователей вместо файлового хранилища JSON. Это обеспечивает более надежное и масштабируемое решение для работы с данными.

## Структура базы данных

### Таблица `users`

| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | INTEGER PRIMARY KEY | Уникальный ID пользователя в Telegram |
| `telegram_name` | TEXT NOT NULL | Имя пользователя в Telegram |
| `balance` | INTEGER DEFAULT 100 | Баланс звезд пользователя |
| `inventory` | TEXT DEFAULT '[]' | JSON строка с инвентарем пользователя |
| `created_at` | DATETIME | Дата создания записи |
| `updated_at` | DATETIME | Дата последнего обновления |

## API Endpoints

### Основные endpoints

#### `POST /api/user/data`
Получение данных пользователя
```json
{
  "user_id": 123456789,
  "telegram_name": "Имя пользователя"
}
```

#### `POST /api/user/save`
Сохранение данных пользователя
```json
{
  "user_id": 123456789,
  "telegram_name": "Имя пользователя",
  "stars_balance": 150,
  "inventory": ["item1", "item2"]
}
```

#### `POST /api/prize/claim`
Получение приза (обновляет баланс)
```json
{
  "user_id": 123456789,
  "prize": {
    "type": "stars",
    "stars_value": 50
  }
}
```

### Административные endpoints

#### `GET /api/admin/users`
Получение всех пользователей

#### `GET /api/admin/users/:userId`
Получение конкретного пользователя

#### `POST /api/admin/users/:userId/balance`
Обновление баланса пользователя
```json
{
  "balance": 200
}
```

#### `POST /api/admin/users/:userId/add-balance`
Добавление к балансу пользователя
```json
{
  "amount": 50
}
```

#### `GET /api/admin/stats`
Получение статистики пользователей

#### `GET /api/info`
Информация о сервере и базе данных

## Использование в коде

### Инициализация базы данных

```javascript
const Database = require('./database');
const db = new Database();

// Инициализация при запуске сервера
await db.init();
```

### Основные методы

```javascript
// Получение пользователя
const user = await db.getUser(userId);

// Создание пользователя
const newUser = await db.createUser(userId, telegramName, balance);

// Обновление пользователя
await db.updateUser(userId, { telegram_name, balance, inventory });

// Upsert (создание или обновление)
const user = await db.upsertUser(userId, telegramName, balance, inventory);

// Обновление баланса
await db.updateBalance(userId, newBalance);

// Добавление к балансу
const result = await db.addToBalance(userId, amount);

// Получение всех пользователей
const users = await db.getAllUsers();

// Получение статистики
const stats = await db.getStats();
```

## Файлы базы данных

- `users.db` - основная база данных SQLite
- `database.js` - модуль для работы с базой данных

## Миграция с JSON

Старые данные из `user_data.json` не мигрируются автоматически. При необходимости можно создать скрипт миграции для переноса существующих данных.

## Преимущества SQLite

1. **Надежность** - ACID транзакции
2. **Производительность** - быстрые запросы
3. **Масштабируемость** - поддержка множественных подключений
4. **Простота** - не требует отдельного сервера БД
5. **Переносимость** - один файл базы данных

## Мониторинг

Используйте следующие endpoints для мониторинга:

- `/api/info` - общая информация о сервере
- `/api/admin/stats` - детальная статистика пользователей
- `/api/admin/users` - список всех пользователей

## Резервное копирование

Для резервного копирования просто скопируйте файл `users.db`. SQLite обеспечивает целостность данных даже при копировании во время работы приложения.
