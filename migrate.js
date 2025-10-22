const fs = require('fs');
const path = require('path');
const Database = require('./database');

// Скрипт для миграции данных из SQLite в PostgreSQL
async function migrateData() {
    console.log('🚀 Начинаем миграцию данных из SQLite в PostgreSQL...');
    
    try {
        // Инициализируем новую PostgreSQL базу данных
        const db = new Database();
        await db.init();
        
        // Проверяем, есть ли резервная копия SQLite
        const backupPath = path.join(__dirname, 'backup_users.json');
        const emergencyPath = path.join(__dirname, 'emergency_backup.json');
        
        let backupData = null;
        
        if (fs.existsSync(backupPath)) {
            console.log('📁 Найдена резервная копия backup_users.json');
            backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        } else if (fs.existsSync(emergencyPath)) {
            console.log('📁 Найдена экстренная резервная копия emergency_backup.json');
            backupData = JSON.parse(fs.readFileSync(emergencyPath, 'utf8'));
        } else {
            console.log('⚠️ Резервные копии не найдены, миграция не требуется');
            return;
        }
        
        console.log(`📊 Найдено пользователей для миграции: ${backupData.users.length}`);
        
        // Мигрируем каждого пользователя
        let migratedCount = 0;
        for (const user of backupData.users) {
            try {
                console.log(`🔄 Мигрируем пользователя: ${user.user_id} (${user.telegram_name})`);
                await db.upsertUser(user.user_id, user.telegram_name, user.balance, user.inventory);
                migratedCount++;
            } catch (error) {
                console.error(`❌ Ошибка миграции пользователя ${user.user_id}:`, error.message);
            }
        }
        
        console.log(`✅ Миграция завершена! Перенесено пользователей: ${migratedCount}/${backupData.users.length}`);
        
        // Проверяем результат
        const totalUsers = await db.getUserCount();
        console.log(`📊 Всего пользователей в PostgreSQL: ${totalUsers}`);
        
        await db.close();
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        process.exit(1);
    }
}

// Запускаем миграцию если скрипт вызван напрямую
if (require.main === module) {
    migrateData();
}

module.exports = migrateData;
