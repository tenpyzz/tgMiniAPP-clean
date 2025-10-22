const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Получаем параметры подключения из переменных окружения Railway
        if (!process.env.DATABASE_URL) {
            console.error('❌ DATABASE_URL не найден в переменных окружения!');
            console.error('Убедитесь, что переменная DATABASE_URL настроена в Railway');
            throw new Error('DATABASE_URL is required');
        }
        
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.isConnected = false;
    }

    // Инициализация базы данных
    async init() {
        try {
            console.log('🔍 REDEPLOY TEST - Подключаемся к PostgreSQL базе данных');
            
            // Тестируем подключение
            const client = await this.pool.connect();
            console.log('✅ REDEPLOY TEST - Подключение к PostgreSQL установлено');
            
            // Создаем таблицы
            await this.createTables(client);
            
            client.release();
            this.isConnected = true;
            console.log('✅ REDEPLOY TEST - База данных PostgreSQL готова к работе');
            
        } catch (error) {
            console.error('❌ REDEPLOY TEST - Ошибка подключения к PostgreSQL:', error);
            throw error;
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
            
            console.log(`🔍 REDEPLOY TEST - Проверяем файл резервной копии: ${backupFile}`);
            console.log(`🔍 REDEPLOY TEST - Файл существует: ${fs.existsSync(backupFile)}`);
            
            if (!fs.existsSync(backupFile)) {
                console.log('📁 Резервная копия не найдена');
                return false;
            }
            
            const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
            console.log(`📥 REDEPLOY TEST - Восстанавливаем данные из резервной копии от ${backupData.timestamp}`);
            console.log(`📥 REDEPLOY TEST - Пользователей в резервной копии: ${backupData.users.length}`);
            
            for (const user of backupData.users) {
                console.log(`🔄 REDEPLOY TEST - Восстанавливаем пользователя: ${user.user_id} (${user.telegram_name})`);
                await this.upsertUser(user.user_id, user.telegram_name, user.balance, user.inventory);
            }
            
            console.log(`✅ REDEPLOY TEST - Восстановлено ${backupData.users.length} пользователей`);
            return true;
        } catch (error) {
            console.error('❌ REDEPLOY TEST - Ошибка восстановления из резервной копии:', error);
            throw error;
        }
    }

    // Автоматическое создание резервной копии при обновлении данных
    async updateUserWithBackup(userId, data) {
        try {
            console.log(`🔄 REDEPLOY TEST - Обновляем пользователя ${userId} с данными:`, data);
            
            // Обновляем данные
            await this.updateUser(userId, data);
            console.log(`✅ REDEPLOY TEST - Пользователь ${userId} обновлен в базе данных`);
            
            // Создаем резервную копию при каждом обновлении (опционально)
            console.log(`💾 REDEPLOY TEST - Создаем резервную копию при каждом обновлении`);
            await this.createBackup();
            
            // Дополнительно сохраняем данные в JSON файл для надежности
            await this.createEmergencyBackup();
            
            // Проверяем количество пользователей после обновления
            const userCount = await this.getUserCount();
            console.log(`📊 REDEPLOY TEST - Количество пользователей в базе после обновления: ${userCount}`);
            
            // Счетчик для статистики
            const backupCount = global.backupCount || 0;
            global.backupCount = backupCount + 1;
            console.log(`📊 REDEPLOY TEST - Счетчик обновлений: ${global.backupCount}`);
            
            return true;
        } catch (error) {
            console.error('❌ REDEPLOY TEST - Ошибка обновления с резервным копированием:', error);
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
            console.log(`🚨 REDEPLOY TEST - Экстренная резервная копия создана: ${emergencyPath}`);
            return emergencyPath;
        } catch (error) {
            console.error('❌ REDEPLOY TEST - Ошибка создания экстренной резервной копии:', error);
            throw error;
        }
    }

    // Восстановление из экстренной резервной копии
    async restoreFromEmergencyBackup() {
        try {
            const emergencyPath = path.join(__dirname, 'emergency_backup.json');
            
            if (!fs.existsSync(emergencyPath)) {
                console.log('🚨 REDEPLOY TEST - Экстренная резервная копия не найдена');
                return false;
            }
            
            const emergencyData = JSON.parse(fs.readFileSync(emergencyPath, 'utf8'));
            console.log(`🚨 REDEPLOY TEST - Восстанавливаем из экстренной резервной копии от ${emergencyData.timestamp}`);
            console.log(`🚨 REDEPLOY TEST - Пользователей в экстренной копии: ${emergencyData.users.length}`);
            
            for (const user of emergencyData.users) {
                console.log(`🔄 REDEPLOY TEST - Восстанавливаем пользователя: ${user.user_id} (${user.telegram_name})`);
                await this.upsertUser(user.user_id, user.telegram_name, user.balance, user.inventory);
            }
            
            console.log(`✅ REDEPLOY TEST - Восстановлено ${emergencyData.users.length} пользователей из экстренной копии`);
            return true;
        } catch (error) {
            console.error('❌ REDEPLOY TEST - Ошибка восстановления из экстренной резервной копии:', error);
            return false;
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

module.exports = Database;