# Кейс Мастер - Telegram Mini App

Telegram Mini App для открытия кейсов и получения призов.

## Описание

"Кейс Мастер" - это интерактивная игра в Telegram, где пользователи могут открывать различные кейсы и получать призы:
- Подарки для друзей
- Стикеры
- Telegram Premium подписки
- Звезды

## Технологии

- **Backend**: Node.js + Express
- **База данных**: SQLite
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Платформа**: Telegram WebApp API

## Структура проекта

```
├── server.js          # Основной сервер
├── database.js        # Работа с базой данных
├── index.html         # Главная страница приложения
├── script.js          # Клиентский JavaScript
├── styles.css         # Стили приложения
├── admin.html         # Админ панель
├── package.json       # Зависимости
├── users.db          # База данных SQLite
└── node_modules/     # Зависимости
```

## Установка и запуск

1. Установите зависимости:
```bash
npm install
```

2. Запустите сервер:
```bash
npm start
```

3. Откройте в браузере: `http://localhost:3000`

## API Endpoints

- `POST /api/user/data` - Получение данных пользователя
- `POST /api/user/save` - Сохранение данных пользователя
- `POST /api/prize/claim` - Получение приза
- `GET /api/admin/users` - Список всех пользователей
- `GET /api/admin/stats` - Статистика
- `POST /bot/webhook` - Webhook для Telegram бота

## Админ панель

Доступна по адресу: `http://localhost:3000/admin`

## Настройка Telegram бота

1. Создайте бота через @BotFather
2. Установите webhook: `POST /setup-webhook`
3. Настройте Mini App: `POST /setup-miniapp`

## Лицензия

MIT