// Конфигурация приложения
export const CONFIG = {
    // API настройки
    API_BASE_URL: process.env.NODE_ENV === 'production' 
        ? 'https://your-domain.com' 
        : 'http://localhost:3000',
    
    // Telegram настройки
    TELEGRAM_BOT_TOKEN: process.env.BOT_TOKEN || '8482617305:AAHnQV93IUQ0dkz67fPaG-hTQCmMj-bkXpw',
    
    // Админ настройки
    ADMIN_USER_ID: '1165123437',
    
    // Игровые настройки
    DEFAULT_STAR_BALANCE: 100,
    CASE_TYPES: {
        ultimate: {
            name: 'Уникальный Кейс',
            price: 50,
            description: 'Все призы в одном кейсе!'
        }
    },
    
    // Призы
    PRIZES: {
        common: [
            { name: 'Обычный стикер', type: 'sticker', rarity: 'common', value: 1 },
            { name: 'Простой подарок', type: 'gift', rarity: 'common', value: 5 }
        ],
        rare: [
            { name: 'Редкий стикер', type: 'sticker', rarity: 'rare', value: 10 },
            { name: 'Крутой подарок', type: 'gift', rarity: 'rare', value: 25 }
        ],
        epic: [
            { name: 'Эпический стикер', type: 'sticker', rarity: 'epic', value: 50 },
            { name: 'Премиум подарок', type: 'gift', rarity: 'epic', value: 100 }
        ],
        legendary: [
            { name: 'Легендарный стикер', type: 'sticker', rarity: 'legendary', value: 200 },
            { name: 'Алмазный подарок', type: 'gift', rarity: 'legendary', value: 500 },
            { name: 'Telegram Premium', type: 'premium', rarity: 'legendary', value: 1000, duration: 30 }
        ]
    }
};
