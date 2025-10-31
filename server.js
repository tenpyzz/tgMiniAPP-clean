import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from './database.js';
// validation.js больше не используется

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// BOT_TOKEN не требуется (не используется)

// verifyTelegramData удален (не используется)

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
app.post('/api/user/data', async (req, res) => {
    try {
        const { user_id, telegram_name } = req.body;
        
        console.log('📥 Получен запрос данных пользователя:', { user_id, telegram_name });
        
        // Получаем данные пользователя из базы данных
        let user = await safeGetUser(user_id);
        
        if (!user) {
            console.log(`👤 Пользователь ${user_id} не найден, создаем нового`);
            user = await safeUpsertUser(user_id, telegram_name || 'Unknown User', 100, []);
            console.log(`✅ Создан новый пользователь ${user_id}`);
        } else {
            console.log(`👤 Пользователь ${user_id} найден`);
        }
        
        const response = {
            stars_balance: user.balance || 100,
            inventory: user.inventory || []
        };
        
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
app.post('/api/user/save', async (req, res) => {
    try {
        const { user_id, telegram_name, stars_balance, inventory } = req.body;
        
        console.log('💾 Сохранение данных пользователя:', { user_id, stars_balance, inventory_count: inventory?.length || 0 });
        
        // Сохраняем данные пользователя в базу данных
        await safeUpdateUser(user_id, {
            telegram_name: telegram_name || 'Unknown User',
            balance: stars_balance || 100,
            inventory: inventory || []
        });
        
        console.log(`✅ Данные пользователя ${user_id} сохранены`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Ошибка сохранения данных пользователя:', error);
        res.status(500).json({ 
            error: 'Failed to save user data',
            message: 'Ошибка сохранения данных пользователя'
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