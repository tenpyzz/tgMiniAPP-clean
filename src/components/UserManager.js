// Менеджер пользователей
import { apiClient } from '../api.js';
import { generateSecureId } from '../utils/validation.js';

class UserManager {
    constructor() {
        this.currentUser = null;
        this.starsBalance = 0;
        this.inventory = [];
        this.isLoading = false;
    }

    /**
     * Инициализация пользователя
     * @param {Object} telegramUser - Данные пользователя от Telegram
     * @returns {Promise<Object>} - Данные пользователя
     */
    async initializeUser(telegramUser) {
        try {
            this.isLoading = true;
            
            if (!telegramUser || !telegramUser.id) {
                throw new Error('Неверные данные пользователя');
            }

            const userData = await apiClient.getUserData(
                telegramUser.id.toString(),
                telegramUser.first_name || 'Unknown User'
            );

            this.currentUser = {
                id: telegramUser.id.toString(),
                name: telegramUser.first_name || 'Unknown User',
                username: telegramUser.username || null
            };

            this.starsBalance = userData.stars_balance || 0;
            this.inventory = userData.inventory || [];

            return {
                user: this.currentUser,
                starsBalance: this.starsBalance,
                inventory: this.inventory
            };
        } catch (error) {
            console.error('Ошибка инициализации пользователя:', error);
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Сохранение данных пользователя
     * @returns {Promise<boolean>} - Результат сохранения
     */
    async saveUserData() {
        try {
            if (!this.currentUser) {
                throw new Error('Пользователь не инициализирован');
            }

            await apiClient.saveUserData(
                this.currentUser.id,
                this.currentUser.name,
                this.starsBalance,
                this.inventory
            );

            return true;
        } catch (error) {
            console.error('Ошибка сохранения данных пользователя:', error);
            throw error;
        }
    }

    /**
     * Обновление баланса звезд
     * @param {number} newBalance - Новый баланс
     */
    updateBalance(newBalance) {
        this.starsBalance = Math.max(0, newBalance);
    }

    /**
     * Добавление звезд к балансу
     * @param {number} amount - Количество звезд
     */
    addStars(amount) {
        this.starsBalance += Math.max(0, amount);
    }

    /**
     * Списывание звезд с баланса
     * @param {number} amount - Количество звезд
     * @returns {boolean} - Успешность операции
     */
    deductStars(amount) {
        if (this.starsBalance >= amount) {
            this.starsBalance -= amount;
            return true;
        }
        return false;
    }

    /**
     * Добавление приза в инвентарь
     * @param {Object} prize - Приз
     */
    addToInventory(prize) {
        if (prize && typeof prize === 'object') {
            this.inventory.push({
                ...prize,
                id: prize.id || `prize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                receivedAt: Date.now()
            });
        }
    }

    /**
     * Получение данных пользователя
     * @returns {Object} - Данные пользователя
     */
    getUserData() {
        return {
            user: this.currentUser,
            starsBalance: this.starsBalance,
            inventory: this.inventory,
            isLoading: this.isLoading
        };
    }

    /**
     * Проверка, является ли пользователь админом
     * @returns {boolean} - Результат проверки
     */
    isAdmin() {
        return this.currentUser && this.currentUser.id === '1165123437';
    }

    /**
     * Сброс данных пользователя
     */
    reset() {
        this.currentUser = null;
        this.starsBalance = 0;
        this.inventory = [];
        this.isLoading = false;
    }
}

export const userManager = new UserManager();
