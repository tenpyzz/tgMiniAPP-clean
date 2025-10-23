import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

    // Создание нового пользователя
    async createUser(userId, telegramName, balance = 100) {
        try {
            const query = `
                INSERT INTO users (user_id, telegram_name, balance, inventory)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await this.pool.query(query, [userId, telegramName, balance, '[]']);
            
            console.log(`✅ Пользователь ${telegramName} (ID: ${userId}) создан`);
            return result.rows[0];
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
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
            console.log(`✅ Пользователь ${userId} обновлен`);
            return result.rows[0];
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error);
            throw error;
        }
    }

    // Создание или обновление пользователя (upsert)
    async upsertUser(userId, telegramName, balance = 100, inventory = []) {
        try {
            const existingUser = await this.getUser(userId);
            
            if (existingUser) {
                // Обновляем существующего пользователя
                const updatedUser = await this.updateUser(userId, {
                    telegram_name: telegramName,
                    balance: balance,
                    inventory: inventory
                });
                return updatedUser;
            } else {
                // Создаем нового пользователя
                const newUser = await this.createUser(userId, telegramName, balance);
                // Обновляем инвентарь если нужно
                if (inventory && inventory.length > 0) {
                    await this.updateUser(userId, { inventory });
                }
                return { user_id: userId, telegram_name: telegramName, balance, inventory };
            }
        } catch (error) {
            console.error('Ошибка upsert пользователя:', error);
            throw error;
        }
    }

    // Получение всех пользователей
    async getAllUsers() {
        try {
            const query = 'SELECT * FROM users ORDER BY created_at DESC';
            const result = await this.pool.query(query);
            
            // Парсим JSON инвентарь для каждого пользователя
            result.rows.forEach(row => {
                try {
                    row.inventory = JSON.parse(row.inventory);
                } catch (e) {
                    row.inventory = [];
                }
            });
            
            return result.rows;
        } catch (error) {
            console.error('Ошибка получения всех пользователей:', error);
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

    // Обновление баланса пользователя
    async updateBalance(userId, newBalance) {
        try {
            const query = 'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *';
            const result = await this.pool.query(query, [newBalance, userId]);
            
            console.log(`✅ Баланс пользователя ${userId} обновлен на ${newBalance}`);
            return result.rows[0];
        } catch (error) {
            console.error('Ошибка обновления баланса:', error);
            throw error;
        }
    }

    // Добавление к балансу
    async addToBalance(userId, amount) {
        try {
            const user = await this.getUser(userId);
            if (!user) {
                throw new Error('Пользователь не найден');
            }
            
            const newBalance = user.balance + amount;
            await this.updateBalance(userId, newBalance);
            return { newBalance, added: amount };
        } catch (error) {
            console.error('Ошибка добавления к балансу:', error);
            throw error;
        }
    }

    // Создание резервной копии данных (теперь в PostgreSQL, но оставляем для совместимости)
    async createBackup() {
        try {
            const users = await this.getAllUsers();
            const backupData = {
                timestamp: new Date().toISOString(),
                users: users
            };
            
            const backupPath = path.join(__dirname, 'backup_users.json');
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            console.log('✅ Резервная копия создана:', backupPath);
            return backupPath;
        } catch (error) {
            console.error('❌ Ошибка создания резервной копии:', error);
            throw error;
        }
    }

    // Восстановление из резервной копии
    async restoreFromBackup(backupPath = null) {
        try {
            const backupFile = backupPath || path.join(__dirname, 'backup_users.json');
            
            console.log(`🔍  - Проверяем файл резервной копии: ${backupFile}`);
            console.log(`🔍  - Файл существует: ${fs.existsSync(backupFile)}`);
            
            if (!fs.existsSync(backupFile)) {
                console.log('📁 Резервная копия не найдена');
                return false;
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            console.log(`📥  - Восстанавливаем данные из резервной копии от ${backupData.timestamp}`);
            console.log(`📥  - Пользователей в резервной копии: ${backupData.users.length}`);
            
            for (const user of backupData.users) {
                console.log(`🔄  - Восстанавливаем пользователя: ${user.user_id} (${user.telegram_name})`);
                await this.upsertUser(user.user_id, user.telegram_name, user.balance, user.inventory);
            }
            
            console.log(`✅  - Восстановлено ${backupData.users.length} пользователей`);
            return true;
        } catch (error) {
            console.error('❌  - Ошибка восстановления из резервной копии:', error);
            throw error;
        }
    }

    // Автоматическое создание резервной копии при обновлении данных
    async updateUserWithBackup(userId, data) {
        try {
            console.log(`🔄  - Обновляем пользователя ${userId} с данными:`, data);
            
            // Обновляем данные
            await this.updateUser(userId, data);
            console.log(`✅  - Пользователь ${userId} обновлен в базе данных`);
            
            // Создаем резервную копию при каждом обновлении (опционально)
            console.log(`💾  - Создаем резервную копию при каждом обновлении`);
            await this.createBackup();
            
            // Дополнительно сохраняем данные в JSON файл для надежности
            await this.createEmergencyBackup();
            
            // Проверяем количество пользователей после обновления
            const userCount = await this.getUserCount();
            console.log(`📊  - Количество пользователей в базе после обновления: ${userCount}`);
            
            // Счетчик для статистики
            const backupCount = global.backupCount || 0;
            global.backupCount = backupCount + 1;
            console.log(`📊  - Счетчик обновлений: ${global.backupCount}`);
            
            return true;
        } catch (error) {
            console.error('❌  - Ошибка обновления с резервным копированием:', error);
            throw error;
        }
    }

    // Экстренное резервное копирование в отдельный файл
    async createEmergencyBackup() {
        try {
            const users = await this.getAllUsers();
            const emergencyData = {
                timestamp: new Date().toISOString(),
                users: users,
                total: users.length
            };
            
            const emergencyPath = path.join(__dirname, 'emergency_backup.json');
            fs.writeFileSync(emergencyPath, JSON.stringify(emergencyData, null, 2));
            console.log(`🚨  - Экстренная резервная копия создана: ${emergencyPath}`);
            return emergencyPath;
        } catch (error) {
            console.error('❌  - Ошибка создания экстренной резервной копии:', error);
            throw error;
        }
    }

    // Восстановление из экстренной резервной копии
    async restoreFromEmergencyBackup() {
        try {
            const emergencyPath = path.join(__dirname, 'emergency_backup.json');
            
            if (!fs.existsSync(emergencyPath)) {
                console.log('🚨  - Экстренная резервная копия не найдена');
                return false;
            }
            
            const emergencyData = JSON.parse(fs.readFileSync(emergencyPath, 'utf8'));
            console.log(`🚨  - Восстанавливаем из экстренной резервной копии от ${emergencyData.timestamp}`);
            console.log(`🚨  - Пользователей в экстренной копии: ${emergencyData.users.length}`);
            
            for (const user of emergencyData.users) {
                console.log(`🔄  - Восстанавливаем пользователя: ${user.user_id} (${user.telegram_name})`);
                await this.upsertUser(user.user_id, user.telegram_name, user.balance, user.inventory);
            }
            
            console.log(`✅  - Восстановлено ${emergencyData.users.length} пользователей из экстренной копии`);
            return true;
        } catch (error) {
            console.error('❌  - Ошибка восстановления из экстренной резервной копии:', error);
            return false;
        }
    }

    // Удаление пользователя
    async deleteUser(userId) {
        try {
            const query = 'DELETE FROM users WHERE user_id = $1 RETURNING *';
            const result = await this.pool.query(query, [userId]);
            
            if (result.rows.length === 0) {
                throw new Error('Пользователь не найден');
            }
            
            console.log(`✅ Пользователь ${userId} удален из базы данных`);
            return result.rows[0];
        } catch (error) {
            console.error('Ошибка удаления пользователя:', error);
            throw error;
        }
    }

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