// Основной файл приложения
import { CONFIG } from './config.js';
import { validateInitData, extractUserData, validateUserData } from './utils/validation.js';
import { userManager } from './components/UserManager.js';
import { caseManager } from './components/CaseManager.js';
import { showNotification } from './utils/notifications.js';

class TelegramMiniApp {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.isInitialized = false;
        this.currentTab = 'cases';
    }

    /**
     * Инициализация приложения
     */
    async init() {
        try {
            console.log('🚀 Инициализация Telegram Mini App...');

            // Инициализация Telegram WebApp
            if (this.tg) {
                this.tg.ready();
                this.tg.expand();
                this.setupTelegramTheme();
            }

            // Валидация и извлечение данных пользователя
            const userData = await this.initializeUser();
            if (!userData) {
                throw new Error('Не удалось инициализировать пользователя');
            }

            // Инициализация UI
            this.initializeUI();
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('✅ Приложение успешно инициализировано');

        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            showNotification('Ошибка инициализации приложения', 'error');
        }
    }

    /**
     * Инициализация пользователя
     * @returns {Promise<Object|null>} - Данные пользователя
     */
    async initializeUser() {
        try {
            let userData = null;

            // Получаем данные от Telegram
            if (this.tg?.initDataUnsafe?.user) {
                userData = this.tg.initDataUnsafe.user;
            } else if (this.tg?.initData) {
                userData = extractUserData(this.tg.initData);
            }

            // Валидируем данные пользователя
            if (!userData || !validateUserData(userData)) {
                console.warn('⚠️ Неверные данные пользователя, используем fallback');
                userData = {
                    id: 'user_' + Date.now(),
                    first_name: 'Guest User'
                };
            }

            // Инициализируем пользователя
            return await userManager.initializeUser(userData);

        } catch (error) {
            console.error('Ошибка инициализации пользователя:', error);
            return null;
        }
    }

    /**
     * Настройка темы Telegram
     */
    setupTelegramTheme() {
        if (!this.tg) return;

        const themeParams = this.tg.themeParams;
        const colorScheme = this.tg.colorScheme;

        // Применяем тему
        document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-button-color', themeParams.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color || '#ffffff');

        // Добавляем класс темы
        document.body.classList.add(`theme-${colorScheme}`);
    }

    /**
     * Инициализация UI
     */
    initializeUI() {
        this.updateStarsDisplay();
        this.updateInventoryDisplay();
        this.setupTabs();
        this.setupCases();
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработчики табов
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Обработчики кейсов
        document.querySelectorAll('.case-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const caseType = e.currentTarget.dataset.case;
                const price = parseInt(e.currentTarget.dataset.price);
                this.openCase(caseType, price);
            });
        });

        // Обработчики кнопок покупки звезд
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const amount = parseInt(e.target.dataset.amount);
                this.buyStars(amount);
            });
        });
    }

    /**
     * Переключение табов
     * @param {string} tabName - Название таба
     */
    switchTab(tabName) {
        // Скрываем все панели
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Убираем активный класс с кнопок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Показываем нужную панель
        const targetPanel = document.getElementById(`${tabName}-tab`);
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);

        if (targetPanel) targetPanel.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');

        this.currentTab = tabName;

        // Обновляем контент в зависимости от таба
        if (tabName === 'inventory') {
            this.updateInventoryDisplay();
        }
    }

    /**
     * Открытие кейса
     * @param {string} caseType - Тип кейса
     * @param {number} price - Цена кейса
     */
    async openCase(caseType, price) {
        try {
            if (caseManager.isCaseOpening()) {
                showNotification('Кейс уже открывается', 'warning');
                return;
            }

            if (userManager.starsBalance < price) {
                showNotification('Недостаточно звезд', 'error');
                return;
            }

            // Запускаем анимацию и ждем её завершения
            const animatedPrize = await this.showOpeningAnimation(caseType);

            // Открываем кейс
            const result = await caseManager.openCase(caseType, price);

            if (result.success) {
                // Обновляем UI
                this.updateStarsDisplay();
                this.updateInventoryDisplay();

                // Показываем приз
                this.showPrizeModal(result.prize);

                showNotification('Кейс успешно открыт!', 'success');
            }

        } catch (error) {
            console.error('Ошибка открытия кейса:', error);
            showNotification(error.message || 'Ошибка открытия кейса', 'error');
        } finally {
            this.hideOpeningAnimation();
        }
    }

    /**
     * Покупка звезд
     * @param {number} amount - Количество звезд
     */
    async buyStars(amount) {
        try {
            if (!this.tg) {
                showNotification('Функция покупки недоступна', 'error');
                return;
            }

            // Здесь должна быть интеграция с Telegram Payments
            showNotification('Функция покупки в разработке', 'info');

        } catch (error) {
            console.error('Ошибка покупки звезд:', error);
            showNotification('Ошибка покупки звезд', 'error');
        }
    }

    /**
     * Обновление отображения звезд
     */
    updateStarsDisplay() {
        const starsElement = document.getElementById('stars-count');
        if (starsElement) {
            starsElement.textContent = userManager.starsBalance;
        }
    }

    /**
     * Обновление отображения инвентаря
     */
    updateInventoryDisplay() {
        const inventoryGrid = document.getElementById('inventory-grid');
        if (!inventoryGrid) return;

        inventoryGrid.innerHTML = '';

        if (userManager.inventory.length === 0) {
            inventoryGrid.innerHTML = '<p class="empty-inventory">Инвентарь пуст</p>';
            return;
        }

        userManager.inventory.forEach(item => {
            const itemElement = this.createInventoryItem(item);
            inventoryGrid.appendChild(itemElement);
        });
    }

    /**
     * Создание элемента инвентаря
     * @param {Object} item - Предмет
     * @returns {HTMLElement} - Элемент инвентаря
     */
    createInventoryItem(item) {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.innerHTML = `
            <div class="item-icon">${this.getItemIcon(item)}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-rarity ${item.rarity}">${this.getRarityName(item.rarity)}</div>
        `;
        return div;
    }

    /**
     * Получение иконки предмета
     * @param {Object} item - Предмет
     * @returns {string} - Иконка
     */
    getItemIcon(item) {
        const icons = {
            sticker: '📄',
            gift: '🎁',
            premium: '⭐',
            stars: '💫'
        };
        return icons[item.type] || '❓';
    }

    /**
     * Получение названия редкости
     * @param {string} rarity - Редкость
     * @returns {string} - Название
     */
    getRarityName(rarity) {
        const names = {
            common: 'Обычный',
            rare: 'Редкий',
            epic: 'Эпический',
            legendary: 'Легендарный'
        };
        return names[rarity] || 'Неизвестно';
    }

    /**
     * Показ анимации открытия
     */
    async showOpeningAnimation(caseType) {
        const openingArea = document.getElementById('opening-area');
        if (openingArea) {
            openingArea.style.display = 'block';
            
            // Импортируем и запускаем анимацию
            try {
                const { caseAnimation } = await import('./utils/caseAnimation.js');
                return new Promise((resolve) => {
                    caseAnimation.startAnimation(caseType, (prize) => {
                        resolve(prize);
                    });
                });
            } catch (error) {
                console.error('Ошибка загрузки анимации:', error);
                return null;
            }
        }
        return null;
    }

    /**
     * Скрытие анимации открытия
     */
    hideOpeningAnimation() {
        const openingArea = document.getElementById('opening-area');
        if (openingArea) {
            openingArea.style.display = 'none';
        }
        
        // Сбрасываем анимацию
        if (window.caseAnimation) {
            window.caseAnimation.reset();
        }
    }

    /**
     * Показ модального окна с призом
     * @param {Object} prize - Приз
     */
    showPrizeModal(prize) {
        const modal = document.getElementById('prize-modal');
        if (!modal) return;

        // Заполняем данные приза
        const iconElement = document.getElementById('modal-prize-icon');
        const nameElement = document.getElementById('modal-prize-name');
        const descriptionElement = document.getElementById('modal-prize-description');

        if (iconElement) iconElement.textContent = this.getItemIcon(prize);
        if (nameElement) nameElement.textContent = prize.name;
        if (descriptionElement) descriptionElement.textContent = prize.description || '';

        // Показываем модальное окно
        modal.style.display = 'flex';

        // Автоматически закрываем через 3 секунды
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    }

    /**
     * Настройка табов
     */
    setupTabs() {
        // Активируем первый таб
        this.switchTab('cases');
    }

    /**
     * Настройка кейсов
     */
    setupCases() {
        // Кейсы уже настроены в HTML
        console.log('Кейсы настроены');
    }
}

// Инициализация приложения
const app = new TelegramMiniApp();

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Экспорт для глобального доступа
window.TelegramMiniApp = app;
