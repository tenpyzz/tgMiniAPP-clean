# 🤖 Настройка Telegram Bot для Кейс Мастера

Пошаговая инструкция по созданию и настройке Telegram Bot для вашего Mini App с реальными звездами и призами.

## 📋 Что вам понадобится

1. **Telegram аккаунт** (уже есть)
2. **Хостинг** для файлов (GitHub Pages, Netlify, Vercel)
3. **Сервер** для обработки API (Node.js, Python, PHP)
4. **База данных** (MongoDB, PostgreSQL, MySQL)

## 🚀 Шаг 1: Создание Telegram Bot

### 1.1 Создайте бота через @BotFather

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather)
2. Отправьте команду `/newbot`
3. Введите название бота: `Кейс Мастер`
4. Введите username бота: `your_case_master_bot` (должен заканчиваться на `bot`)
5. Сохраните полученный **TOKEN** - он понадобится для API

### 1.2 Настройте бота

```
/setdescription - Установите описание бота
/setabouttext - Установите информацию о боте
/setuserpic - Загрузите аватар бота
/setcommands - Установите команды бота
```

**Команды бота:**
```
start - Запустить приложение
help - Помощь
balance - Проверить баланс звезд
inventory - Посмотреть инвентарь
```

## 🌐 Шаг 2: Создание Mini App

### 2.1 Создайте WebApp

1. Отправьте команду `/newapp` в @BotFather
2. Выберите вашего бота
3. Введите название приложения: `Кейс Мастер`
4. Введите описание: `Открывайте кейсы за звезды Telegram!`
5. Загрузите превью изображение (512x512px)
6. Введите URL вашего приложения: `https://your-domain.com`

### 2.2 Настройте манифест

Обновите `manifest.json`:
```json
{
  "telegram": {
    "bot_username": "@your_case_master_bot",
    "webapp_url": "https://your-domain.com"
  }
}
```

## 💻 Шаг 3: Настройка сервера

### 3.1 Структура сервера (Node.js)

Создайте файл `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

const BOT_TOKEN = 'YOUR_BOT_TOKEN';
const WEBHOOK_SECRET = 'YOUR_WEBHOOK_SECRET';

// Middleware для проверки данных Telegram
function verifyTelegramData(req, res, next) {
    const { init_data } = req.body;
    if (!init_data) {
        return res.status(400).json({ error: 'Missing init_data' });
    }
    
    // Проверяем подпись данных
    const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secret).update(init_data).digest('hex');
    
    if (hash !== req.headers['x-telegram-hash']) {
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
}

// Получение баланса звезд пользователя
app.post('/api/user/stars', verifyTelegramData, async (req, res) => {
    try {
        const { user_id } = req.body;
        
        // Здесь запрос к Telegram Bot API для получения баланса звезд
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserStars`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id })
        });
        
        const data = await response.json();
        
        res.json({
            stars_balance: data.result?.stars || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stars balance' });
    }
});

// Сохранение данных пользователя
app.post('/api/user/save', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, stars_balance, inventory } = req.body;
        
        // Сохраняем в базу данных
        await saveUserData(user_id, { stars_balance, inventory });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

// Обработка получения приза
app.post('/api/prize/claim', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, prize } = req.body;
        
        let result = { success: true };
        
        switch (prize.type) {
            case 'gift':
                // Отправляем подарок через Telegram
                result.gift_message_id = await sendTelegramGift(user_id, prize);
                break;
                
            case 'premium':
                // Активируем премиум подписку
                result.subscription_id = await activatePremium(user_id, prize);
                break;
                
            case 'stars':
                // Добавляем звезды на баланс
                await addStarsToUser(user_id, prize.stars_value);
                break;
        }
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to claim prize' });
    }
});

// Отправка подарка через Telegram
async function sendTelegramGift(userId, prize) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendGift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: userId,
            gift_id: prize.telegram_gift_id,
            message_thread_id: null
        })
    });
    
    const data = await response.json();
    return data.result?.message_id;
}

// Активация премиум подписки
async function activatePremium(userId, prize) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: userId,
            user_id: userId,
            until_date: Math.floor(Date.now() / 1000) + (prize.premium_duration * 24 * 60 * 60)
        })
    });
    
    const data = await response.json();
    return data.result?.subscription_id;
}

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

### 3.2 Установка зависимостей

```bash
npm init -y
npm install express cors crypto
```

## 🗄️ Шаг 4: Настройка базы данных

### 4.1 MongoDB (рекомендуется)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: { type: Number, required: true, unique: true },
    username: String,
    first_name: String,
    stars_balance: { type: Number, default: 0 },
    inventory: [{
        type: String,
        name: String,
        icon: String,
        description: String,
        rarity: String,
        claimed_at: { type: Date, default: Date.now }
    }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Функции для работы с пользователями
async function saveUserData(userId, data) {
    await User.findOneAndUpdate(
        { user_id: userId },
        { 
            ...data, 
            updated_at: new Date() 
        },
        { upsert: true, new: true }
    );
}

async function getUserData(userId) {
    return await User.findOne({ user_id: userId });
}
```

## 🔧 Шаг 5: Настройка платежей

### 5.1 Обработка платежей звездами

```javascript
// Webhook для обработки платежей
app.post('/webhook/payment', async (req, res) => {
    try {
        const { payment } = req.body;
        
        if (payment.status === 'completed') {
            const payload = JSON.parse(payment.invoice_payload);
            
            if (payload.type === 'stars_purchase') {
                const starsAmount = parseInt(payment.total_amount) / 100;
                await addStarsToUser(payload.user_id, starsAmount);
                
                // Уведомляем пользователя
                await sendMessage(payload.user_id, 
                    `✅ Получено ${starsAmount} звезд! Теперь вы можете открывать кейсы!`
                );
            }
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ error: 'Webhook error' });
    }
});

// Добавление звезд пользователю
async function addStarsToUser(userId, amount) {
    await User.findOneAndUpdate(
        { user_id: userId },
        { $inc: { stars_balance: amount } },
        { upsert: true }
    );
}
```

## 🌐 Шаг 6: Развертывание

### 6.1 GitHub Pages (для фронтенда)

1. Создайте репозиторий на GitHub
2. Загрузите файлы приложения
3. Включите GitHub Pages в настройках
4. Получите URL: `https://username.github.io/repository-name`

### 6.2 Heroku (для сервера)

1. Создайте аккаунт на [Heroku](https://heroku.com)
2. Установите Heroku CLI
3. Создайте приложение:
```bash
heroku create your-case-master-api
git add .
git commit -m "Initial commit"
git push heroku main
```

### 6.3 Настройка переменных окружения

```bash
heroku config:set BOT_TOKEN=your_bot_token
heroku config:set MONGODB_URI=your_mongodb_connection_string
heroku config:set WEBHOOK_SECRET=your_webhook_secret
```

## 🔗 Шаг 7: Настройка Webhook

### 7.1 Установка Webhook для платежей

```javascript
// Установка webhook
app.post('/setup-webhook', async (req, res) => {
    try {
        const webhookUrl = 'https://your-heroku-app.herokuapp.com/webhook/payment';
        
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                secret_token: WEBHOOK_SECRET
            })
        });
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to set webhook' });
    }
});
```

## 🧪 Шаг 8: Тестирование

### 8.1 Тест в Telegram

1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Нажмите на кнопку приложения
4. Протестируйте все функции

### 8.2 Проверка логов

```bash
heroku logs --tail
```

## 🚀 Шаг 9: Запуск в продакшн

### 9.1 Финальные настройки

1. Обновите URL в манифесте
2. Проверьте все API endpoints
3. Настройте мониторинг
4. Создайте резервные копии

### 9.2 Продвижение

1. Создайте канал для бота
2. Добавьте описание и инструкции
3. Пригласите друзей для тестирования
4. Соберите отзывы и улучшите приложение

## 📞 Поддержка

Если возникли проблемы:

1. **Проверьте логи сервера** - `heroku logs --tail`
2. **Проверьте токен бота** - должен быть правильным
3. **Проверьте URL** - должен быть доступен
4. **Проверьте базу данных** - подключение должно работать

## 🎉 Готово!

Ваше приложение готово к работе с реальными звездами Telegram! Пользователи смогут:

- Покупать звезды через Telegram
- Открывать кейсы за реальные звезды
- Получать настоящие подарки и премиум подписки
- Наслаждаться красивыми анимациями

Удачи с вашим проектом! 🚀
