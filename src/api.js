// API клиент для работы с сервером
import { CONFIG } from './config.js';

class ApiClient {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Получение данных пользователя
    async getUserData(userId, telegramName) {
        return this.request('/api/user/data', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                telegram_name: telegramName,
                init_data: window.Telegram?.WebApp?.initData || ''
            })
        });
    }

    // Сохранение данных пользователя
    async saveUserData(userId, telegramName, starsBalance, inventory) {
        return this.request('/api/user/save', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                telegram_name: telegramName,
                stars_balance: starsBalance,
                inventory: inventory,
                init_data: window.Telegram?.WebApp?.initData || ''
            })
        });
    }

    // Открытие кейса
    async openCase(userId, caseType, price, prize) {
        return this.request('/api/case/open', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                case_type: caseType,
                price: price,
                prize: prize,
                init_data: window.Telegram?.WebApp?.initData || ''
            })
        });
    }

    // Получение приза
    async claimPrize(userId, prize) {
        return this.request('/api/prize/claim', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                prize: prize,
                init_data: window.Telegram?.WebApp?.initData || ''
            })
        });
    }

    // Админские функции
    async getAdminUsers() {
        return this.request('/api/admin/users');
    }

    async getAdminStats() {
        return this.request('/api/admin/stats');
    }

    async updateUserBalance(userId, balance) {
        return this.request(`/api/admin/users/${userId}/balance`, {
            method: 'POST',
            body: JSON.stringify({
                balance: balance,
                user_id: CONFIG.ADMIN_USER_ID
            })
        });
    }

    async addUserBalance(userId, amount) {
        return this.request(`/api/admin/users/${userId}/add-balance`, {
            method: 'POST',
            body: JSON.stringify({
                amount: amount,
                user_id: CONFIG.ADMIN_USER_ID
            })
        });
    }
}

export const apiClient = new ApiClient();
