import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from './database.js';
import { validateInitData, extractUserData } from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN не найден в переменных окружения!');
    process.exit(1);
}

// Middleware для проверки данных Telegram
function verifyTelegramData(req, res, next) {
    const { init_data } = req.body;
    
    if (!init_data) {
        return res.status(400).json({ 
            error: 'Missing init_data',
            message: 'Отсутствуют данные инициализации Telegram'
        });
    }
    
    // Валидируем init_data
    if (!validateInitData(init_data, BOT_TOKEN)) {
        console.log('❌ Неверная подпись init_data');
        return res.status(401).json({ 
            error: 'Invalid init_data',
            message: 'Неверные данные инициализации'
        });
    }
    
    // Извлекаем данные пользователя
    const userData = extractUserData(init_data);
    if (!userData) {
        return res.status(400).json({ 
            error: 'Invalid user data',
            message: 'Неверные данные пользователя'
        });
    }
    
    // Добавляем данные пользователя в запрос
    req.telegramUser = userData;
    next();
}

// Middleware для проверки админских прав
// verifyAdmin удален как неиспользуемый

// Инициализация базы данных
let db;
try {
    db = new Database();
    console.log('✅ Объект базы данных создан');
} catch (error) {
    console.log('⚠️ Ошибка создания объекта базы данных:', error.message);
    db = { isConnected: false };
}

// Безопасные функции для работы с базой данных
async function safeGetUser(userId) {
    if (!db || !db.isConnected) {
        console.log('⚠️ База данных недоступна, возвращаем null');
        return null;
    }
    try {
        return await db.getUser(userId);
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        return null;
    }
}

async function safeUpsertUser(userId, name, balance, inventory) {
    if (!db || !db.isConnected) {
        console.log('⚠️ База данных недоступна, возвращаем fallback данные');
        return { user_id: userId, telegram_name: name, balance, inventory };
    }
    try {
        return await db.upsertUser(userId, name, balance, inventory);
    } catch (error) {
        console.error('Ошибка создания/обновления пользователя:', error);
        return { user_id: userId, telegram_name: name, balance, inventory };
    }
}

async function safeUpdateUser(userId, data) {
    if (!db || !db.isConnected) {
        console.log('⚠️ База данных недоступна, пропускаем обновление');
        return { user_id: userId, ...data };
    }
    try {
        return await db.updateUser(userId, data);
    } catch (error) {
        console.error('Ошибка обновления пользователя:', error);
        return { user_id: userId, ...data };
    }
}

// safeGetAllUsers удален как неиспользуемый

async function safeGetStats() {
    if (!db || !db.isConnected) {
        console.log('⚠️ База данных недоступна, возвращаем пустую статистику');
        return {
            total_users: 0,
            users_with_balance: 0,
            total_balance: 0,
            avg_balance: 0
        };
    }
    try {
        return await db.getStats();
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        return {
            total_users: 0,
            users_with_balance: 0,
            total_balance: 0,
            avg_balance: 0
        };
    }
}

// Инициализация базы данных при запуске сервера
async function initializeDatabase() {
    try {
        console.log('🔍 Попытка инициализации базы данных...');
        
        if (!db || db.isConnected === false) {
            console.log('⚠️ Объект базы данных недоступен, пытаемся создать новый...');
            try {
                db = new Database();
                console.log('✅ Новый объект базы данных создан');
            } catch (createError) {
                console.error('❌ Не удалось создать объект базы данных:', createError.message);
                console.log('⚠️ Продолжаем работу без базы данных');
                return;
            }
        }
        
        await db.init();
        console.log('✅ База данных PostgreSQL инициализирована');
        
        // Резервные копии отключены (не требуются для работы мини‑приложения)
        
        // Проверяем количество пользователей в базе
        try {
            const userCount = await db.getUserCount();
            console.log(`📊 Количество пользователей в базе: ${userCount}`);
        } catch (countError) {
            console.log('⚠️ Ошибка получения количества пользователей:', countError.message);
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        console.log('⚠️ Продолжаем работу без базы данных');
        // Не завершаем процесс, продолжаем работу
    }
}

// Получение данных пользователя
app.post('/api/user/data', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, telegram_name } = req.body;
        const telegramUser = req.telegramUser;
        
        console.log('📥 Получен запрос данных пользователя:', {
            user_id,
            telegram_name,
            telegram_user: telegramUser
        });
        
        // Получаем данные пользователя из базы данных
        let user = await safeGetUser(user_id);
        
        if (!user) {
            console.log(`👤 Пользователь ${user_id} не найден, создаем нового`);
            user = await safeUpsertUser(user_id, telegram_name || 'Unknown User', 100, []);
            console.log(`✅ Создан новый пользователь ${user_id}:`, user);
        } else {
            console.log(`👤 Пользователь ${user_id} найден:`, {
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
        
        console.log('📤 Отправляем ответ:', response);
        res.json(response);
    } catch (error) {
        console.error('❌ Ошибка получения данных пользователя:', error);
        res.status(500).json({ 
            error: 'Failed to get user data',
            message: 'Ошибка получения данных пользователя'
        });
    }
});

// Сохранение данных пользователя
app.post('/api/user/save', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, telegram_name, stars_balance, inventory } = req.body;
        const telegramUser = req.telegramUser;
        
        console.log('💾 Получен запрос сохранения данных пользователя:', {
            user_id,
            telegram_name,
            stars_balance,
            inventory,
            telegram_user: telegramUser
        });
        
        // Сохраняем данные пользователя в базу данных
        await safeUpdateUser(user_id, {
            telegram_name: telegram_name || 'Unknown User',
            balance: stars_balance,
            inventory: inventory || []
        });
        
        console.log(`✅ Данные пользователя ${user_id} сохранены успешно`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения данных пользователя:', error);
        res.status(500).json({ 
            error: 'Failed to save user data',
            message: 'Ошибка сохранения данных пользователя'
        });
    }
});

// Безопасное открытие кейса
app.post('/api/case/open', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, case_type, price, prize } = req.body;
        const telegramUser = req.telegramUser;
        
        console.log(`🎰 Пользователь ${user_id} открывает кейс ${case_type} за ${price} звезд`);
        
        // Получаем данные пользователя
        let user = await safeGetUser(user_id);
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found',
                message: 'Пользователь не найден'
            });
        }
        
        // Проверяем баланс
        if (user.balance < price) {
            return res.status(400).json({ 
                error: 'Insufficient balance',
                message: 'Недостаточно звезд для открытия кейса'
            });
        }
        
        // Проверяем, что приз валидный
        if (!prize || !prize.name || !prize.type) {
            return res.status(400).json({ 
                error: 'Invalid prize',
                message: 'Некорректные данные приза'
            });
        }
        
        // Атомарная транзакция: списываем деньги И добавляем приз
        const newBalance = user.balance - price;
        const newInventory = [...(user.inventory || []), prize];
        
        // Обновляем пользователя с новыми данными
        await safeUpdateUser(user_id, {
            telegram_name: user.telegram_name,
            balance: newBalance,
            inventory: newInventory
        });
        
        console.log(`✅ Кейс успешно открыт. Новый баланс: ${newBalance}, приз добавлен: ${prize.name}`);
        
        res.json({
            success: true,
            new_balance: newBalance,
            prize: prize,
            message: 'Кейс успешно открыт'
        });
        
    } catch (error) {
        console.error('❌ Ошибка открытия кейса:', error);
        res.status(500).json({ 
            error: 'Failed to open case',
            message: 'Ошибка открытия кейса'
        });
    }
});

// Обработка получения приза
app.post('/api/prize/claim', verifyTelegramData, async (req, res) => {
    try {
        const { user_id, prize } = req.body;
        const telegramUser = req.telegramUser;
        
        console.log(`User ${user_id} claimed prize:`, prize);
        
        let result = { success: true };
        
        // Получаем данные пользователя из базы данных
        let user = await safeGetUser(user_id);
        if (!user) {
            user = await safeUpsertUser(user_id, 'Unknown User', 100, []);
        }
        
        switch (prize.type) {
            case 'gift':
                result.gift_message_id = `gift_${Date.now()}`;
                console.log(`Gift ${prize.telegram_gift_id} sent to user ${user_id}`);
                break;
                
            case 'premium':
                result.subscription_id = `premium_${Date.now()}`;
                console.log(`Premium subscription activated for user ${user_id} for ${prize.premium_duration} days`);
                break;
                
            case 'stars':
                const newBalance = user.balance + (prize.stars_value || 0);
                await db.updateBalance(user_id, newBalance);
                console.log(`Added ${prize.stars_value} stars to user ${user_id}. New balance: ${newBalance}`);
                break;
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error claiming prize:', error);
        res.status(500).json({ 
            error: 'Failed to claim prize',
            message: 'Ошибка получения приза'
        });
    }
});

// Админские эндпоинты
// Админские эндпоинты удалены как неиспользуемые

// Webhook бота удалён как неиспользуемый

// Статическая раздача файлов
app.use(express.static('.'));

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Админ панель удалена

// Информация о сервере
app.get('/api/info', async (req, res) => {
    try {
        const stats = await safeGetStats();
        res.json({
            name: 'Кейс Мастер API',
            version: '2.0.0',
            status: 'running',
            timestamp: new Date().toISOString(),
            webhook_url: null,
            webapp_url: process.env.WEBAPP_URL || null,
            bot_token: BOT_TOKEN ? 'configured' : 'missing',
            database: 'PostgreSQL',
            total_users: stats.total_users || 0,
            total_balance: stats.total_balance || 0,
            avg_balance: stats.avg_balance || 0
        });
    } catch (error) {
        console.error('Error getting server info:', error);
        res.status(500).json({ 
            error: 'Failed to get server info',
            message: 'Ошибка получения информации о сервере'
        });
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
            console.log(`📊 API информация: http://localhost:${PORT}/api/info`);
            console.log(`💾 База данных: PostgreSQL (Railway)`);
            console.log('');
            console.log('✅ Telegram Mini App готов к работе!');
        });
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();

export default app;