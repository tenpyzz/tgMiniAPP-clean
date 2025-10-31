import pkg from 'pg';
const { Pool } = pkg;

class Database {
    constructor() {
        // Получаем параметры подключения из переменных окружения Railway
        let databaseUrl = process.env.DATABASE_URL;
        
        console.log('🔍 DATABASE_URL значение:', databaseUrl ? 'установлено' : 'не установлено');
        console.log('🔍 DATABASE_URL длина:', databaseUrl ? databaseUrl.length : 0);
        console.log('🔍 DATABASE_URL содержимое:', databaseUrl);
        
        // Если DATABASE_URL не найден или пустой, попробуем собрать из отдельных переменных
        if (!databaseUrl || databaseUrl.trim() === '' || databaseUrl.includes('${{')) {
            console.log('🔍 DATABASE_URL не найден или содержит шаблон, пытаемся собрать из отдельных переменных...');
            
            const pgHost = process.env.PGHOST || process.env.POSTGRES_HOST;
            const pgPort = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
            const pgDatabase = process.env.PGDATABASE || process.env.POSTGRES_DB;
            const pgUser = process.env.PGUSER || process.env.POSTGRES_USER;
            const pgPassword = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
            
            console.log('🔍 Отдельные переменные:', {
                pgHost: pgHost ? 'установлено' : 'не установлено',
                pgPort: pgPort ? 'установлено' : 'не установлено',
                pgDatabase: pgDatabase ? 'установлено' : 'не установлено',
                pgUser: pgUser ? 'установлено' : 'не установлено',
                pgPassword: pgPassword ? 'установлено' : 'не установлено'
            });
            
            if (pgHost && pgDatabase && pgUser && pgPassword) {
                databaseUrl = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
                console.log('✅ Собрали DATABASE_URL из отдельных переменных');
            } else {
                console.error('❌ DATABASE_URL не найден в переменных окружения!');
                console.error('Доступные переменные:', Object.keys(process.env).filter(key => 
                    key.includes('POSTGRES') || key.includes('PG') || key.includes('DATABASE')
                ));
                throw new Error('DATABASE_URL is required');
            }
        }
        
        console.log('🔍 DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':***@')); // Скрываем пароль в логах
        
        this.pool = new Pool({
            connectionString: databaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            // Добавляем таймауты для Railway
            connectionTimeoutMillis: 30000,
            idleTimeoutMillis: 30000,
            query_timeout: 30000,
            // Дополнительные настройки для Railway
            max: 20,
            min: 0,
            acquireTimeoutMillis: 30000
        });
        
        this.isConnected = false;
    }

    // Инициализация базы данных
    async init() {
        const maxRetries = 5;
        const retryDelay = 2000; // 2 секунды
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍  - Попытка подключения к PostgreSQL (${attempt}/${maxRetries})`);
                
                // Тестируем подключение
                const client = await this.pool.connect();
                console.log('✅  - Подключение к PostgreSQL установлено');
                
                // Создаем таблицы
                await this.createTables(client);
                
                client.release();
                this.isConnected = true;
                console.log('✅  - База данных PostgreSQL готова к работе');
                return;
                
            } catch (error) {
                console.error(`❌  - Ошибка подключения к PostgreSQL (попытка ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt === maxRetries) {
                    console.error('❌  - Все попытки подключения исчерпаны');
                    throw error;
                }
                
                console.log(`⏳  - Ожидание ${retryDelay}ms перед следующей попыткой...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }

    // Создание таблиц
    async createTables(client) {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                telegram_name TEXT NOT NULL,
                balance INTEGER DEFAULT 100,
                inventory TEXT DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await client.query(createUsersTable);
        console.log('✅ Таблица users создана/проверена');
    }

    // Получение пользователя по ID
    async getUser(userId) {
        try {
            const query = 'SELECT * FROM users WHERE user_id = $1';
            const result = await this.pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                return null;
            }
            
            const user = result.rows[0];
            // Парсим JSON инвентарь
            try {
                user.inventory = JSON.parse(user.inventory);
            } catch (e) {
                user.inventory = [];
            }
            
            return user;
        } catch (error) {
            console.error('Ошибка получения пользователя:', error);
            throw error;
        }
    }

    // Создание или обновление пользователя (upsert)
    async upsertUser(userId, telegramName, balance = 100, inventory = []) {
        try {
            const existingUser = await this.getUser(userId);
            
            if (existingUser) {
                // Обновляем существующего пользователя
                return await this.updateUser(userId, {
                    telegram_name: telegramName,
                    balance: balance,
                    inventory: inventory
                });
            } else {
                // Создаем нового пользователя
                const inventoryJson = JSON.stringify(inventory || []);
                const query = `
                    INSERT INTO users (user_id, telegram_name, balance, inventory)
                    VALUES ($1, $2, $3, $4)
                    RETURNING *
                `;
                const result = await this.pool.query(query, [userId, telegramName, balance, inventoryJson]);
                
                const newUser = result.rows[0];
                try {
                    newUser.inventory = JSON.parse(newUser.inventory);
                } catch (e) {
                    newUser.inventory = [];
                }
                return newUser;
            }
        } catch (error) {
            console.error('Ошибка upsert пользователя:', error);
            throw error;
        }
    }

    // Обновление данных пользователя
    async updateUser(userId, data) {
        try {
            const { telegram_name, balance, inventory } = data;
            const inventoryJson = JSON.stringify(inventory || []);
            
            const query = `
                UPDATE users 
                SET telegram_name = COALESCE($1, telegram_name),
                    balance = COALESCE($2, balance),
                    inventory = COALESCE($3, inventory),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $4
                RETURNING *
            `;
            
            const result = await this.pool.query(query, [telegram_name, balance, inventoryJson, userId]);
            const updatedUser = result.rows[0];
            
            // Парсим JSON инвентарь
            try {
                updatedUser.inventory = JSON.parse(updatedUser.inventory);
            } catch (e) {
                updatedUser.inventory = [];
            }
            
            return updatedUser;
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    // Получение количества пользователей
    async getUserCount() {
        try {
            const query = 'SELECT COUNT(*) as count FROM users';
            const result = await this.pool.query(query);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('Ошибка получения количества пользователей:', error);
            throw error;
        }
    }

    // Получение статистики
    async getStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_users,
                    SUM(balance) as total_balance,
                    AVG(balance) as avg_balance,
                    COUNT(CASE WHEN balance > 0 THEN 1 END) as users_with_balance
                FROM users
            `;
            
            const result = await this.pool.query(query);
            return result.rows[0];
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            throw error;
        }
    }

    // updateBalance удален (не используется)

    // Резервное копирование и связанные методы удалены как неиспользуемые

    // deleteUser удалена (не используется)

    // Закрытие соединения с базой данных
    async close() {
        try {
            await this.pool.end();
            console.log('✅ Соединение с базой данных закрыто');
        } catch (error) {
            console.error('Ошибка закрытия базы данных:', error);
        }
    }
}

export default Database;