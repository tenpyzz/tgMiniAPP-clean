const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'users.db');
    }

    // Инициализация базы данных
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Ошибка подключения к базе данных:', err);
                    reject(err);
                } else {
                    console.log('✅ Подключение к SQLite базе данных установлено');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // Создание таблиц
    async createTables() {
        return new Promise((resolve, reject) => {
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    telegram_name TEXT NOT NULL,
                    balance INTEGER DEFAULT 100,
                    inventory TEXT DEFAULT '[]',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.run(createUsersTable, (err) => {
                if (err) {
                    console.error('Ошибка создания таблицы users:', err);
                    reject(err);
                } else {
                    console.log('✅ Таблица users создана/проверена');
                    resolve();
                }
            });
        });
    }

    // Получение пользователя по ID
    async getUser(userId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE user_id = ?';
            this.db.get(query, [userId], (err, row) => {
                if (err) {
                    console.error('Ошибка получения пользователя:', err);
                    reject(err);
                } else {
                    if (row) {
                        // Парсим JSON инвентарь
                        try {
                            row.inventory = JSON.parse(row.inventory);
                        } catch (e) {
                            row.inventory = [];
                        }
                    }
                    resolve(row);
                }
            });
        });
    }

    // Создание нового пользователя
    async createUser(userId, telegramName, balance = 100) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (user_id, telegram_name, balance, inventory)
                VALUES (?, ?, ?, ?)
            `;
            this.db.run(query, [userId, telegramName, balance, '[]'], function(err) {
                if (err) {
                    console.error('Ошибка создания пользователя:', err);
                    reject(err);
                } else {
                    console.log(`✅ Пользователь ${telegramName} (ID: ${userId}) создан`);
                    resolve({ id: this.lastID, userId, telegramName, balance });
                }
            });
        });
    }

    // Обновление данных пользователя
    async updateUser(userId, data) {
        return new Promise((resolve, reject) => {
            const { telegram_name, balance, inventory } = data;
            const inventoryJson = JSON.stringify(inventory || []);
            
            const query = `
                UPDATE users 
                SET telegram_name = COALESCE(?, telegram_name),
                    balance = COALESCE(?, balance),
                    inventory = COALESCE(?, inventory),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `;
            
            this.db.run(query, [telegram_name, balance, inventoryJson, userId], function(err) {
                if (err) {
                    console.error('Ошибка обновления пользователя:', err);
                    reject(err);
                } else {
                    console.log(`✅ Пользователь ${userId} обновлен`);
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Создание или обновление пользователя (upsert)
    async upsertUser(userId, telegramName, balance = 100, inventory = []) {
        return new Promise(async (resolve, reject) => {
            try {
                const existingUser = await this.getUser(userId);
                
                if (existingUser) {
                    // Обновляем существующего пользователя
                    await this.updateUser(userId, {
                        telegram_name: telegramName,
                        balance: balance,
                        inventory: inventory
                    });
                    resolve({ ...existingUser, telegram_name: telegramName, balance, inventory });
                } else {
                    // Создаем нового пользователя
                    const newUser = await this.createUser(userId, telegramName, balance);
                    resolve({ user_id: userId, telegram_name: telegramName, balance, inventory });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Получение всех пользователей
    async getAllUsers() {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users ORDER BY created_at DESC';
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('Ошибка получения всех пользователей:', err);
                    reject(err);
                } else {
                    // Парсим JSON инвентарь для каждого пользователя
                    rows.forEach(row => {
                        try {
                            row.inventory = JSON.parse(row.inventory);
                        } catch (e) {
                            row.inventory = [];
                        }
                    });
                    resolve(rows);
                }
            });
        });
    }

    // Получение статистики
    async getStats() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total_users,
                    SUM(balance) as total_balance,
                    AVG(balance) as avg_balance,
                    COUNT(CASE WHEN balance > 0 THEN 1 END) as users_with_balance
                FROM users
            `;
            
            this.db.get(query, [], (err, row) => {
                if (err) {
                    console.error('Ошибка получения статистики:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Обновление баланса пользователя
    async updateBalance(userId, newBalance) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
            this.db.run(query, [newBalance, userId], function(err) {
                if (err) {
                    console.error('Ошибка обновления баланса:', err);
                    reject(err);
                } else {
                    console.log(`✅ Баланс пользователя ${userId} обновлен на ${newBalance}`);
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Добавление к балансу
    async addToBalance(userId, amount) {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await this.getUser(userId);
                if (!user) {
                    reject(new Error('Пользователь не найден'));
                    return;
                }
                
                const newBalance = user.balance + amount;
                await this.updateBalance(userId, newBalance);
                resolve({ newBalance, added: amount });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Закрытие соединения с базой данных
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Ошибка закрытия базы данных:', err);
                } else {
                    console.log('✅ Соединение с базой данных закрыто');
                }
            });
        }
    }
}

module.exports = Database;
