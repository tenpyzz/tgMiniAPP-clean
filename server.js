const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Database = require('./database');

const app = express();
app.use(express.json());
app.use(cors());

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN || '8482617305:AAHnQV93IUQ0dkz67fPaG-hTQCmMj-bkXpw';

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

// Инициализация базы данных
const db = new Database();

// Инициализация базы данных при запуске сервера
async function initializeDatabase() {
    try {
        console.log('🚀 REDEPLOY TEST - Начинаем инициализацию базы данных');
        await db.init();
        console.log('✅ База данных SQLite инициализирована');
        
        // Пытаемся восстановить данные из резервной копии
        try {
            console.log('🔄 REDEPLOY TEST - Пытаемся восстановить данные из резервной копии');
            const restored = await db.restoreFromBackup();
            if (restored) {
                console.log('✅ REDEPLOY TEST - Данные успешно восстановлены из резервной копии');
            } else {
                console.log('⚠️ REDEPLOY TEST - Резервная копия не найдена или пуста');
            }
        } catch (backupError) {
            console.log('❌ REDEPLOY TEST - Ошибка восстановления из резервной копии:', backupError.message);
            console.log('📁 Резервная копия не найдена или повреждена, начинаем с чистой базы');
        }
        
        // Создаем начальную резервную копию
        console.log('💾 REDEPLOY TEST - Создаем резервную копию');
        await db.createBackup();
        console.log('✅ REDEPLOY TEST - Резервная копия создана');
        
        // Проверяем количество пользователей в базе
        const userCount = await db.getUserCount();
        console.log(`📊 REDEPLOY TEST - Количество пользователей в базе: ${userCount}`);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        process.exit(1);
    }
}

// Получение данных пользователя
app.post('/api/user/data', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, telegram_name } = req.body;
        
        console.log('📥 REDEPLOY TEST - Получен запрос данных пользователя:', {
            user_id,
            telegram_name,
            full_body: req.body
        });
        
        // Получаем данные пользователя из базы данных
        let user = await db.getUser(user_id);
        
        if (!user) {
            console.log(`👤 REDEPLOY TEST - Пользователь ${user_id} не найден, создаем нового`);
            // Создаем нового пользователя если его нет
            user = await db.upsertUser(user_id, telegram_name || 'Unknown User', 100, []);
            console.log(`✅ REDEPLOY TEST - Создан новый пользователь ${user_id}:`, user);
        } else {
            console.log(`👤 REDEPLOY TEST - Пользователь ${user_id} найден:`, {
                user_id: user.user_id,
                telegram_name: user.telegram_name,
                balance: user.balance,
                inventory_count: user.inventory?.length || 0
            });
        }
        
        const response = {
            stars_balance: user.balance,
            inventory: user.inventory || []
        };
        
        console.log('📤 REDEPLOY TEST - Отправляем ответ:', response);
        
        res.json(response);
    } catch (error) {
        console.error('❌ REDEPLOY TEST - Ошибка получения данных пользователя:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Сохранение данных пользователя
app.post('/api/user/save', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, telegram_name, stars_balance, inventory } = req.body;
        
        console.log('💾 REDEPLOY TEST - Получен запрос сохранения данных пользователя:', {
            user_id,
            telegram_name,
            stars_balance,
            inventory,
            full_body: req.body
        });
        
        // Проверяем, существует ли пользователь
        const existingUser = await db.getUser(user_id);
        console.log(`🔍 REDEPLOY TEST - Пользователь ${user_id} существует:`, !!existingUser);
        
        // Сохраняем данные пользователя в базу данных с резервным копированием
        await db.updateUserWithBackup(user_id, {
            telegram_name: telegram_name || 'Unknown User',
            balance: stars_balance,
            inventory: inventory || []
        });
        
        console.log(`✅ REDEPLOY TEST - Данные пользователя ${user_id} сохранены успешно`);
        
        // Проверяем, что пользователь действительно сохранился
        const savedUser = await db.getUser(user_id);
        console.log(`✅ REDEPLOY TEST - Пользователь ${user_id} в базе после сохранения:`, {
            exists: !!savedUser,
            balance: savedUser?.balance,
            inventory_count: savedUser?.inventory?.length || 0
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('❌ REDEPLOY TEST - Ошибка сохранения данных пользователя:', error);
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

// Обработка получения приза
app.post('/api/prize/claim', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, prize } = req.body;
        
        console.log(`User ${user_id} claimed prize:`, prize);
        
        let result = { success: true };
        
        // Получаем данные пользователя из базы данных
        let user = await db.getUser(user_id);
        if (!user) {
            user = await db.upsertUser(user_id, 'Unknown User', 100, []);
        }
        
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
                const newBalance = user.balance + (prize.stars_value || 0);
                await db.updateBalance(user_id, newBalance);
                console.log(`Added ${prize.stars_value} stars to user ${user_id}. New balance: ${newBalance}`);
                break;
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error claiming prize:', error);
        res.status(500).json({ error: 'Failed to claim prize' });
    }
});

// Получение всех пользователей (для администрирования)
app.get('/api/admin/users', async (req, res) => {
    try {
        console.log('🔍 REDEPLOY TEST - Запрос всех пользователей для админ панели');
        
        // Проверяем количество пользователей в базе
        const userCount = await db.getUserCount();
        console.log(`📊 REDEPLOY TEST - Количество пользователей в базе: ${userCount}`);
        
        const users = await db.getAllUsers();
        console.log(`📊 REDEPLOY TEST - Найдено пользователей: ${users.length}`);
        console.log('👥 REDEPLOY TEST - Пользователи:', users.map(u => ({ id: u.user_id, name: u.telegram_name, balance: u.balance })));
        
        // Проверяем, есть ли файл базы данных
        const fs = require('fs');
        const dbPath = require('path').join(__dirname, 'users.db');
        console.log(`🔍 REDEPLOY TEST - Файл базы данных существует: ${fs.existsSync(dbPath)}`);
        
        res.json({
            success: true,
            users: users,
            total: users.length
        });
    } catch (error) {
        console.error('❌ REDEPLOY TEST - Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Получение конкретного пользователя по ID
app.get('/api/admin/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await db.getUser(userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Обновление баланса пользователя
app.post('/api/admin/users/:userId/balance', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { balance } = req.body;
        
        if (typeof balance !== 'number' || balance < 0) {
            return res.status(400).json({ error: 'Invalid balance value' });
        }
        
        await db.updateBalance(userId, balance);
        
        res.json({
            success: true,
            message: `Balance updated to ${balance} for user ${userId}`
        });
    } catch (error) {
        console.error('Error updating balance:', error);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});

// Добавление к балансу пользователя
app.post('/api/admin/users/:userId/add-balance', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { amount } = req.body;
        
        if (typeof amount !== 'number') {
            return res.status(400).json({ error: 'Invalid amount value' });
        }
        
        const result = await db.addToBalance(userId, amount);
        
        res.json({
            success: true,
            message: `Added ${amount} to balance for user ${userId}`,
            newBalance: result.newBalance
        });
    } catch (error) {
        console.error('Error adding to balance:', error);
        res.status(500).json({ error: 'Failed to add to balance' });
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

// Настройка Mini App для бота
app.post('/setup-miniapp', async (req, res) => {
    try {
        const miniAppUrl = 'https://web-production-877f.up.railway.app/';
        console.log('Setting up Mini App for bot...');
        
        // Настраиваем Mini App через Telegram API
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebApp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: miniAppUrl
            })
        });
        
        const result = await telegramResponse.json();
        
        if (result.ok) {
            console.log('Mini App set successfully:', result);
            res.json({ 
                ok: true, 
                description: 'Mini App configured successfully',
                url: miniAppUrl,
                telegram_response: result
            });
        } else {
            console.error('Failed to set Mini App:', result);
            res.status(500).json({ 
                error: 'Failed to set Mini App',
                telegram_response: result
            });
        }
    } catch (error) {
        console.error('Error setting Mini App:', error);
        res.status(500).json({ error: 'Failed to set Mini App' });
    }
});

// Удаление Mini App из бота
app.post('/remove-miniapp', async (req, res) => {
    try {
        console.log('Removing Mini App from bot...');
        
        // Удаляем Mini App через Telegram API
        const telegramResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebApp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await telegramResponse.json();
        
        if (result.ok) {
            console.log('Mini App removed successfully:', result);
            res.json({ 
                ok: true, 
                description: 'Mini App removed successfully',
                telegram_response: result
            });
        } else {
            console.error('Failed to remove Mini App:', result);
            res.status(500).json({ 
                error: 'Failed to remove Mini App',
                telegram_response: result
            });
        }
    } catch (error) {
        console.error('Error removing Mini App:', error);
        res.status(500).json({ error: 'Failed to remove Mini App' });
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

// Админ панель
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/admin.html');
});

// Информация о сервере
app.get('/api/info', async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json({
            name: 'Кейс Мастер API',
            version: '1.0.0',
            status: 'running',
            timestamp: new Date().toISOString(),
            webhook_url: process.env.WEBHOOK_URL || 'https://web-production-877f.up.railway.app/bot/webhook',
            webapp_url: process.env.WEBAPP_URL || 'https://web-production-877f.up.railway.app/',
            bot_token: BOT_TOKEN ? 'configured' : 'missing',
            database: 'SQLite',
            total_users: stats.total_users || 0,
            total_balance: stats.total_balance || 0,
            avg_balance: stats.avg_balance || 0
        });
    } catch (error) {
        console.error('Error getting server info:', error);
        res.status(500).json({ error: 'Failed to get server info' });
    }
});

// Статистика пользователей (для администрирования)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = await db.getStats();
        const users = await db.getAllUsers();
        
        const detailedStats = {
            total_users: stats.total_users || 0,
            users_with_balance: stats.users_with_balance || 0,
            total_stars: stats.total_balance || 0,
            avg_balance: stats.avg_balance || 0,
            total_inventory_items: 0,
            users: []
        };

        users.forEach(user => {
            detailedStats.total_inventory_items += user.inventory?.length || 0;
            detailedStats.users.push({
                user_id: user.user_id,
                telegram_name: user.telegram_name,
                stars_balance: user.balance,
                inventory_count: user.inventory?.length || 0,
                created_at: user.created_at,
                updated_at: user.updated_at
            });
        });

        res.json(detailedStats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// Создание резервной копии
app.post('/api/admin/backup', async (req, res) => {
    try {
        const backupPath = await db.createBackup();
        res.json({ 
            success: true, 
            message: 'Резервная копия создана успешно',
            backup_path: backupPath
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Восстановление из резервной копии
app.post('/api/admin/restore', async (req, res) => {
    try {
        const { backup_path } = req.body;
        const restored = await db.restoreFromBackup(backup_path);
        
        if (restored) {
            res.json({ 
                success: true, 
                message: 'Данные восстановлены из резервной копии'
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Резервная копия не найдена'
            });
        }
    } catch (error) {
        console.error('Error restoring from backup:', error);
        res.status(500).json({ error: 'Failed to restore from backup' });
    }
});

const PORT = process.env.PORT || 3000;

// Инициализация и запуск сервера
async function startServer() {
    try {
        // Инициализируем базу данных
        await initializeDatabase();
        
        // Запускаем сервер
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📱 Откройте http://localhost:${PORT} для тестирования`);
            console.log(`🧪 Тестовая версия: http://localhost:${PORT}/test`);
            console.log(`📊 API информация: http://localhost:${PORT}/api/info`);
            console.log(`📈 Статистика: http://localhost:${PORT}/api/admin/stats`);
            console.log(`💾 База данных: SQLite (users.db)`);
            console.log('');
            console.log('✅ База данных SQLite готова к работе!');
        });
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();

module.exports = app;
