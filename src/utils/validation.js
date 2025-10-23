// Утилиты для валидации данных Telegram Mini App
import { createHmac } from 'crypto';

/**
 * Валидация init data от Telegram
 * @param {string} initData - Данные инициализации от Telegram
 * @param {string} botToken - Токен бота
 * @returns {boolean} - Результат валидации
 */
export function validateInitData(initData, botToken) {
    try {
        if (!initData || !botToken) {
            return false;
        }

        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            return false;
        }

        // Удаляем hash из параметров
        urlParams.delete('hash');
        
        // Сортируем параметры
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Создаем секретный ключ
        const secretKey = createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        // Вычисляем хеш
        const calculatedHash = createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return calculatedHash === hash;
    } catch (error) {
        console.error('Ошибка валидации init data:', error);
        return false;
    }
}

/**
 * Извлечение данных пользователя из init data
 * @param {string} initData - Данные инициализации от Telegram
 * @returns {Object|null} - Данные пользователя или null
 */
export function extractUserData(initData) {
    try {
        if (!initData) {
            return null;
        }

        const urlParams = new URLSearchParams(initData);
        const userParam = urlParams.get('user');
        
        if (!userParam) {
            return null;
        }

        return JSON.parse(decodeURIComponent(userParam));
    } catch (error) {
        console.error('Ошибка извлечения данных пользователя:', error);
        return null;
    }
}

/**
 * Валидация данных пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {boolean} - Результат валидации
 */
export function validateUserData(userData) {
    if (!userData || typeof userData !== 'object') {
        return false;
    }

    const requiredFields = ['id', 'first_name'];
    return requiredFields.every(field => userData.hasOwnProperty(field));
}

/**
 * Безопасная генерация случайного ID
 * @returns {string} - Уникальный ID
 */
export function generateSecureId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `user_${timestamp}_${random}`;
}
