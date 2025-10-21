# 🚀 Быстрый запуск Telegram Mini App

## Твой проект готов к деплою!

### 📋 Что уже настроено:
- ✅ Telegram Bot Token: `8448668571:AAHKzTQp9Zd86sTgbPbKeWTS3Cc6fE0G91k`
- ✅ Webhook URL: `https://web-production-877f.up.railway.app/bot/webhook`
- ✅ WebApp URL: `https://web-production-877f.up.railway.app/`
- ✅ Сервер с API для мини-приложения
- ✅ Обработка webhook для Telegram бота

## 🎯 Следующие шаги:

### 1. Деплой на Railway
1. Зайди на [railway.app](https://railway.app)
2. Войди через GitHub
3. Нажми "New Project" → "Deploy from GitHub repo"
4. Выбери свой репозиторий

### 2. Настрой переменные окружения в Railway:
```
BOT_TOKEN=8448668571:AAHKzTQp9Zd86sTgbPbKeWTS3Cc6fE0G91k
NODE_ENV=production
WEBAPP_URL=https://web-production-877f.up.railway.app/
WEBHOOK_URL=https://web-production-877f.up.railway.app/bot/webhook
```

### 3. После деплоя настрой webhook:
Открой в браузере: `https://web-production-877f.up.railway.app/setup-webhook`

### 4. Тестирование:
- Мини-приложение: `https://web-production-877f.up.railway.app/`
- API info: `https://web-production-877f.up.railway.app/api/info`
- Тестовая страница: `https://web-production-877f.up.railway.app/test`

## 🎮 Что делает твое приложение:
- **Кейс Мастер** - игра с открытием кейсов
- Пользователи тратят звезды на кейсы
- Получают призы: подарки, стикеры, премиум подписки
- Инвентарь для хранения призов
- API для сохранения прогресса

## 🔧 Структура проекта:
- `server.js` - основной сервер с API
- `index.html` - интерфейс мини-приложения
- `script.js` - логика игры
- `styles.css` - стили
- `package.json` - зависимости

## 📱 Telegram Bot:
- Webhook настроен на `/bot/webhook`
- Обрабатывает команды и сообщения
- Готов к интеграции с мини-приложением

**Все готово для запуска! 🎉**
