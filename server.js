const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Замените на ваш токен бота
const BOT_TOKEN = '8448668571:AAHKzTQp9Zd86sTgbPbKeWTS3Cc6fE0G91k';

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

// Установка webhook
app.post('/setup-webhook', async (req, res) => {
    try {
        const webhookUrl = req.body.webhook_url || 'https://your-domain.com/webhook/payment';
        
        console.log(`Setting webhook to: ${webhookUrl}`);
        
        // В реальном приложении здесь будет вызов Telegram API
        res.json({ 
            ok: true, 
            description: 'Webhook set successfully',
            url: webhookUrl
        });
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
        timestamp: new Date().toISOString()
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
