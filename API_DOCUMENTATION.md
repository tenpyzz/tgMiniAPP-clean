# 🔌 API Документация - Кейс Мастер

Полная документация API для интеграции с Telegram Mini App.

## 📋 Базовые настройки

### Аутентификация
Все запросы должны содержать данные Telegram WebApp:
```javascript
{
  "user_id": 123456789,
  "init_data": "query_id=...&user=...&auth_date=...&hash=..."
}
```

### Базовый URL
- **Локально:** `http://localhost:3000`
- **Продакшн:** `https://your-domain.com`

## 🎯 Endpoints

### 1. Получение баланса звезд

**POST** `/api/user/stars`

Получает текущий баланс звезд пользователя.

**Запрос:**
```json
{
  "user_id": 123456789,
  "init_data": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Ответ:**
```json
{
  "stars_balance": 150
}
```

**Пример использования:**
```javascript
const response = await fetch('/api/user/stars', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_id: userData?.id,
    init_data: tg.initData
  })
});

const data = await response.json();
console.log('Баланс звезд:', data.stars_balance);
```

### 2. Сохранение данных пользователя

**POST** `/api/user/save`

Сохраняет данные пользователя (баланс звезд, инвентарь).

**Запрос:**
```json
{
  "user_id": 123456789,
  "stars_balance": 100,
  "inventory": [
    {
      "type": "gift",
      "name": "Подарок \"Сердечко\"",
      "icon": "💝",
      "description": "Красивый подарок с сердечком",
      "rarity": "common",
      "claimed_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "init_data": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Ответ:**
```json
{
  "success": true
}
```

### 3. Получение приза

**POST** `/api/prize/claim`

Обрабатывает получение приза пользователем.

**Запрос:**
```json
{
  "user_id": 123456789,
  "prize": {
    "type": "gift",
    "name": "Подарок \"Сердечко\"",
    "icon": "💝",
    "description": "Красивый подарок с сердечком",
    "rarity": "common",
    "telegram_gift_id": "heart_gift_001",
    "stars_value": 5
  },
  "init_data": "query_id=...&user=...&auth_date=...&hash=..."
}
```

**Ответ:**
```json
{
  "success": true,
  "gift_message_id": "gift_1704067200000"
}
```

**Типы призов:**

#### Подарки (gift)
```json
{
  "type": "gift",
  "name": "Подарок \"Сердечко\"",
  "icon": "💝",
  "description": "Красивый подарок с сердечком",
  "rarity": "common",
  "telegram_gift_id": "heart_gift_001",
  "stars_value": 5
}
```

#### Премиум подписка (premium)
```json
{
  "type": "premium",
  "name": "Telegram Premium (1 месяц)",
  "icon": "👑",
  "description": "Премиум подписка на месяц",
  "rarity": "epic",
  "premium_duration": 30,
  "stars_value": 50
}
```

#### Звезды (stars)
```json
{
  "type": "stars",
  "name": "Бонус звезды",
  "icon": "✨",
  "description": "Дополнительные звезды",
  "rarity": "rare",
  "stars_value": 15
}
```

### 4. Webhook для платежей

**POST** `/webhook/payment`

Обрабатывает уведомления о платежах от Telegram.

**Запрос:**
```json
{
  "payment": {
    "id": "payment_123",
    "status": "completed",
    "total_amount": "1000",
    "currency": "XTR",
    "invoice_payload": "{\"type\":\"stars_purchase\",\"user_id\":123456789}"
  }
}
```

**Ответ:**
```json
{
  "ok": true
}
```

### 5. Установка Webhook

**POST** `/setup-webhook`

Устанавливает webhook для получения уведомлений о платежах.

**Запрос:**
```json
{
  "webhook_url": "https://your-domain.com/webhook/payment"
}
```

**Ответ:**
```json
{
  "ok": true,
  "description": "Webhook set successfully",
  "url": "https://your-domain.com/webhook/payment"
}
```

### 6. Информация о сервере

**GET** `/api/info`

Получает информацию о состоянии сервера.

**Ответ:**
```json
{
  "name": "Кейс Мастер API",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Интеграция с Telegram Bot API

### Отправка подарка

```javascript
async function sendTelegramGift(userId, giftId) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendGift`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: userId,
      gift_id: giftId,
      message_thread_id: null
    })
  });
  
  const data = await response.json();
  return data.result?.message_id;
}
```

### Активация премиум подписки

```javascript
async function activatePremium(userId, durationDays) {
  const untilDate = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
  
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMember`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: userId,
      user_id: userId,
      until_date: untilDate
    })
  });
  
  const data = await response.json();
  return data.result?.subscription_id;
}
```

### Получение баланса звезд

```javascript
async function getUserStars(userId) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserStars`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  
  const data = await response.json();
  return data.result?.stars || 0;
}
```

## 🛡️ Безопасность

### Проверка подписи данных

```javascript
const crypto = require('crypto');

function verifyTelegramData(initData, botToken) {
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secret).update(initData).digest('hex');
  
  const urlParams = new URLSearchParams(initData);
  const receivedHash = urlParams.get('hash');
  
  return hash === receivedHash;
}
```

### Middleware для Express

```javascript
function verifyTelegramData(req, res, next) {
  const { init_data } = req.body;
  
  if (!init_data) {
    return res.status(400).json({ error: 'Missing init_data' });
  }
  
  if (!verifyTelegramData(init_data, BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}
```

## 📊 Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешно |
| 400 | Неверный запрос |
| 401 | Неавторизован |
| 403 | Доступ запрещен |
| 404 | Не найдено |
| 500 | Внутренняя ошибка сервера |

## 🧪 Тестирование

### Тестовые данные

```javascript
const testUser = {
  user_id: 123456789,
  username: 'test_user',
  first_name: 'Test',
  stars_balance: 100
};

const testPrize = {
  type: 'gift',
  name: 'Тестовый подарок',
  icon: '🎁',
  description: 'Подарок для тестирования',
  rarity: 'common',
  telegram_gift_id: 'test_gift_001',
  stars_value: 10
};
```

### Пример тестового запроса

```bash
curl -X POST http://localhost:3000/api/user/stars \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 123456789,
    "init_data": "test_data"
  }'
```

## 📝 Логирование

Все API запросы логируются в консоль:

```javascript
console.log(`User ${userId} claimed prize:`, prize);
console.log(`Added ${starsAmount} stars to user ${userId}`);
console.log(`Gift ${giftId} sent to user ${userId}`);
```

## 🚀 Развертывание

### Переменные окружения

```bash
BOT_TOKEN=your_bot_token_here
MONGODB_URI=mongodb://localhost:27017/case_master
WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 Поддержка

Если у вас возникли вопросы:

1. Проверьте логи сервера
2. Убедитесь в правильности токена бота
3. Проверьте доступность URL
4. Создайте issue в репозитории

---

**Удачи с вашим Telegram Mini App! 🚀**
