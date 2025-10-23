// Менеджер кейсов
import { apiClient } from '../api.js';
import { generateCasePrize } from '../utils/prizeGenerator.js';
import { userManager } from './UserManager.js';

class CaseManager {
    constructor() {
        this.isOpening = false;
        this.pendingPrize = null;
    }

    /**
     * Открытие кейса
     * @param {string} caseType - Тип кейса
     * @param {number} price - Цена кейса
     * @returns {Promise<Object>} - Результат открытия
     */
    async openCase(caseType, price) {
        try {
            if (this.isOpening) {
                throw new Error('Кейс уже открывается');
            }

            if (!userManager.currentUser) {
                throw new Error('Пользователь не авторизован');
            }

            if (userManager.starsBalance < price) {
                throw new Error('Недостаточно звезд');
            }

            this.isOpening = true;

            // Генерируем приз
            const prize = generateCasePrize(caseType);
            this.pendingPrize = prize;

            // Отправляем запрос на сервер
            const result = await apiClient.openCase(
                userManager.currentUser.id,
                caseType,
                price,
                prize
            );

            if (result.success) {
                // Обновляем данные пользователя
                userManager.updateBalance(result.new_balance);
                userManager.addToInventory(prize);
                
                // Сохраняем данные
                await userManager.saveUserData();

                return {
                    success: true,
                    prize: prize,
                    newBalance: result.new_balance
                };
            } else {
                throw new Error(result.message || 'Ошибка открытия кейса');
            }
        } catch (error) {
            console.error('Ошибка открытия кейса:', error);
            throw error;
        } finally {
            this.isOpening = false;
            this.pendingPrize = null;
        }
    }

    /**
     * Получение приза
     * @param {Object} prize - Приз
     * @returns {Promise<Object>} - Результат получения приза
     */
    async claimPrize(prize) {
        try {
            if (!userManager.currentUser) {
                throw new Error('Пользователь не авторизован');
            }

            const result = await apiClient.claimPrize(
                userManager.currentUser.id,
                prize
            );

            if (result.success) {
                // Обрабатываем приз в зависимости от типа
                switch (prize.type) {
                    case 'stars':
                        userManager.addStars(prize.stars_value || 0);
                        await userManager.saveUserData();
                        break;
                    case 'premium':
                        // Логика активации премиум
                        console.log('Premium активирован:', prize);
                        break;
                    case 'gift':
                        // Логика отправки подарка
                        console.log('Подарок отправлен:', prize);
                        break;
                }

                return result;
            } else {
                throw new Error('Ошибка получения приза');
            }
        } catch (error) {
            console.error('Ошибка получения приза:', error);
            throw error;
        }
    }

    /**
     * Проверка, открывается ли кейс
     * @returns {boolean} - Статус открытия
     */
    isCaseOpening() {
        return this.isOpening;
    }

    /**
     * Получение ожидающего приза
     * @returns {Object|null} - Ожидающий приз
     */
    getPendingPrize() {
        return this.pendingPrize;
    }
}

export const caseManager = new CaseManager();
