const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN || '8448668571:AAHKzTQp9Zd86sTgbPbKeWTS3Cc6fE0G91k';

// Middleware для проверки данных Telegram
function verifyTelegramData(req, res, next) {
    const { init_data } = req.body;
    if (!init_data) {
        return res.status(400).json({ error: 'Missing init_data' });
    }
    
    // В реальном приложении здесь должна быть проверка подписи
    // Для демо пропускаем проверку
    next();
}

// Простое хранение данных в памяти (для демо)
const userData = new Map();

// Получение данных пользователя
app.post('/api/user/data', verifyTelegramData, async (req, res) => {
    try {
        const { user_id } = req.body;
        
        // Получаем данные пользователя
        const user = userData.get(user_id) || {
            stars_balance: 100,
            inventory: []
        };
        
        res.json({
            stars_balance: user.stars_balance,
            inventory: user.inventory
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Сохранение данных пользователя
app.post('/api/user/save', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, stars_balance, inventory } = req.body;
        
        console.log(`Saving user data for ${user_id}:`, { stars_balance, inventory });
        
        // Сохраняем данные пользователя
        userData.set(user_id, {
            stars_balance: stars_balance,
            inventory: inventory,
            last_updated: new Date()
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

// Обработка получения приза
app.post('/api/prize/claim', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, prize } = req.body;
        
        console.log(`User ${user_id} claimed prize:`, prize);
        
        let result = { success: true };
        
        switch (prize.type) {
            case 'gift':
                // Симулируем отправку подарка
                result.gift_message_id = `gift_${Date.now()}`;
                console.log(`Gift ${prize.telegram_gift_id} sent to user ${user_id}`);
                break;
                
            case 'premium':
                // Симулируем активацию премиум
                result.subscription_id = `premium_${Date.now()}`;
                console.log(`Premium subscription activated for user ${user_id} for ${prize.premium_duration} days`);
                break;
                
            case 'stars':
                // Добавляем звезды на баланс
                console.log(`Added ${prize.stars_value} stars to user ${user_id}`);
                break;
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error claiming prize:', error);
        res.status(500).json({ error: 'Failed to claim prize' });
    }
});

// Webhook для Telegram бота
app.post('/bot/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log('Bot webhook received:', update);
        
        // Обработка обновлений от Telegram
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text;
            
            console.log(`Message from ${chatId}: ${text}`);
            
            // Обработка команд
            if (text === '/start') {
                console.log('Start command received');
                
                // Отправляем приветственное сообщение
                const welcomeMessage = `🎮 Добро пожаловать в Кейс Мастер!

🎁 Открывайте кейсы и получайте призы:
• Подарки для друзей
• Стикеры
• Telegram Premium
• И многое другое!

🚀 Нажмите кнопку ниже, чтобы начать играть!`;

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: "🎮 Открыть игру",
                            web_app: {
                                url: "https://web-production-877f.up.railway.app/"
                            }
                        }
                    ]]
                };

                // Отправляем сообщение через Telegram API
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: welcomeMessage,
                        reply_markup: keyboard
                    })
                });
                
            } else if (text === '/help') {
                const helpMessage = `🎮 Кейс Мастер - Помощь

📋 Доступные команды:
/start - Начать игру
/help - Показать эту справку

🎁 Типы кейсов:
• Бронзовый (10 ⭐)
• Серебряный (25 ⭐)
• Золотой (50 ⭐)
• Алмазный (100 ⭐)

🚀 Нажмите кнопку ниже для начала игры!`;

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: "🎮 Играть",
                            web_app: {
                                url: "https://web-production-877f.up.railway.app/"
                            }
                        }
                    ]]
                };

                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: helpMessage,
                        reply_markup: keyboard
                    })
                });
                
            } else {
                // Ответ на неизвестные сообщения
                const unknownMessage = `🤔 Не понимаю эту команду.

Используйте /start для начала игры или /help для справки.`;

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: "🎮 Начать игру",
                            web_app: {
                                url: "https://web-production-877f.up.railway.app/"
                            }
                        }
                    ]]
                };

                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: unknownMessage,
                        reply_markup: keyboard
                    })
                });
            }
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error('Bot webhook error:', error);
        res.status(500).json({ error: 'Webhook error' });
    }
});

// Webhook для обработки платежей
app.post('/webhook/payment', async (req, res) => {
    try {
        const { payment } = req.body;
        
        console.log('Payment webhook received:', payment);
        
        if (payment.status === 'completed') {
            const payload = JSON.parse(payment.invoice_payload);
            
            if (payload.type === 'stars_purchase') {
                const starsAmount = parseInt(payment.total_amount) / 100;
                console.log(`User ${payload.user_id} purchased ${starsAmount} stars`);
                
                // В реальном приложении здесь будет добавление звезд в базу данных
            }
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.status(500).json({ error: 'Webhook error' });
    }
});

// Установка webhook для Telegram бота
app.post('/setup-webhook', async (req, res) => {
    try {
        const webhookUrl = process.env.WEBHOOK_URL || req.body.webhook_url || 'https://web-production-877f.up.railway.app/bot/webhook';
        
        console.log(`Setting Telegram webhook to: ${webhookUrl}`);
        
        // Устанавливаем webhook через Telegram API
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query']
            })
        });
        
        const result = await telegramResponse.json();
        
        if (result.ok) {
            console.log('Webhook set successfully:', result);
            res.json({ 
                ok: true, 
                description: 'Webhook set successfully',
                url: webhookUrl,
                telegram_response: result
            });
        } else {
            console.error('Failed to set webhook:', result);
            res.status(500).json({ 
                error: 'Failed to set webhook',
                telegram_response: result
            });
        }
    } catch (error) {
        console.error('Error setting webhook:', error);
        res.status(500).json({ error: 'Failed to set webhook' });
    }
});

// Статическая раздача файлов
app.use(express.static('.'));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Тестовая страница
app.get('/test', (req, res) => {
    res.sendFile(__dirname + '/test.html');
});

// Информация о сервере
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Кейс Мастер API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        webhook_url: process.env.WEBHOOK_URL || 'https://web-production-877f.up.railway.app/bot/webhook',
        webapp_url: process.env.WEBAPP_URL || 'https://web-production-877f.up.railway.app/',
        bot_token: BOT_TOKEN ? 'configured' : 'missing'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Откройте http://localhost:${PORT} для тестирования`);
    console.log(`🧪 Тестовая версия: http://localhost:${PORT}/test`);
    console.log(`📊 API информация: http://localhost:${PORT}/api/info`);
    console.log('');
    console.log('⚠️  Не забудьте заменить BOT_TOKEN на реальный токен!');
});

module.exports = app;
