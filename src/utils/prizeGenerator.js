// Генератор призов для кейсов
import { CONFIG } from '../config.js';

/**
 * Генерация случайного приза на основе редкости
 * @param {string} rarity - Редкость приза (common, rare, epic, legendary)
 * @returns {Object} - Сгенерированный приз
 */
export function generatePrize(rarity = 'common') {
    const prizes = CONFIG.PRIZES[rarity] || CONFIG.PRIZES.common;
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const basePrize = prizes[randomIndex];
    
    return {
        ...basePrize,
        id: generatePrizeId(),
        timestamp: Date.now()
    };
}

/**
 * Генерация приза для кейса с учетом вероятностей
 * @param {string} caseType - Тип кейса
 * @returns {Object} - Сгенерированный приз
 */
export function generateCasePrize(caseType) {
    const probabilities = {
        common: 0.6,    // 60%
        rare: 0.25,     // 25%
        epic: 0.12,     // 12%
        legendary: 0.03 // 3%
    };

    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const [rarity, probability] of Object.entries(probabilities)) {
        cumulativeProbability += probability;
        if (random <= cumulativeProbability) {
            return generatePrize(rarity);
        }
    }
    
    // Fallback на common
    return generatePrize('common');
}

/**
 * Генерация уникального ID для приза
 * @returns {string} - Уникальный ID
 */
function generatePrizeId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `prize_${timestamp}_${random}`;
}

/**
 * Получение информации о редкости приза
 * @param {string} rarity - Редкость
 * @returns {Object} - Информация о редкости
 */
export function getRarityInfo(rarity) {
    const rarityInfo = {
        common: {
            name: 'Обычный',
            color: '#9CA3AF',
            probability: 60,
            multiplier: 1
        },
        rare: {
            name: 'Редкий',
            color: '#3B82F6',
            probability: 25,
            multiplier: 2
        },
        epic: {
            name: 'Эпический',
            color: '#8B5CF6',
            probability: 12,
            multiplier: 5
        },
        legendary: {
            name: 'Легендарный',
            color: '#F59E0B',
            probability: 3,
            multiplier: 10
        }
    };

    return rarityInfo[rarity] || rarityInfo.common;
}
