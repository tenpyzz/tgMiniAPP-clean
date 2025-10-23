// Telegram Mini App - Основной файл
console.log('🚀 Загружается Telegram Mini App...');

// Глобальные переменные
let userStars = 0;
let userInventory = [];
let isOpening = false;
let currentUserId = null;
let pendingPrize = null;
let currentTab = 'cases';

// Telegram WebApp API
const tg = window.Telegram?.WebApp;

// Конфигурация
const CONFIG = {
    API_BASE_URL: window.location.origin,
    ADMIN_USER_ID: '1165123437',
    DEFAULT_STAR_BALANCE: 100,
    CASE_TYPES: {
        ultimate: {
            name: 'Уникальный Кейс',
            price: 50,
            description: 'Все призы в одном кейсе!'
        }
    },
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

// Функция для получения userId
function getUserId() {
    // Сначала пытаемся получить из Telegram WebApp
    if (tg?.initDataUnsafe?.user?.id) {
        const telegramUserId = tg.initDataUnsafe.user.id.toString();
        localStorage.setItem('telegram_user_id', telegramUserId);
        console.log('✅ Получен userId от Telegram:', telegramUserId);
        return telegramUserId;
    }
    
    // Если не получилось, пытаемся получить из initData
    if (tg?.initData) {
        try {
            const urlParams = new URLSearchParams(tg.initData);
            const userParam = urlParams.get('user');
            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData.id) {
                    const telegramUserId = userData.id.toString();
                    localStorage.setItem('telegram_user_id', telegramUserId);
                    console.log('✅ Получен userId из initData:', telegramUserId);
                    return telegramUserId;
                }
            }
        } catch (e) {
            console.log('Ошибка парсинга initData:', e);
        }
    }
    
    // Проверяем, есть ли сохраненный userId в localStorage
    const savedUserId = localStorage.getItem('telegram_user_id');
    if (savedUserId) {
        console.log('🔄 Используем сохраненный userId из localStorage:', savedUserId);
        return savedUserId;
    }
    
    // Если ничего не получилось, генерируем уникальный ID
    const fallbackId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('⚠️ Не удалось получить userId от Telegram, используем fallback:', fallbackId);
    localStorage.setItem('telegram_user_id', fallbackId);
    return fallbackId;
}

// Функция для получения имени пользователя
function getUserName() {
    if (tg?.initDataUnsafe?.user?.first_name) {
        const telegramUserName = tg.initDataUnsafe.user.first_name;
        localStorage.setItem('telegram_user_name', telegramUserName);
        console.log('✅ Получено имя пользователя от Telegram:', telegramUserName);
        return telegramUserName;
    }
    
    if (tg?.initData) {
        try {
            const urlParams = new URLSearchParams(tg.initData);
            const userParam = urlParams.get('user');
            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData.first_name) {
                    const telegramUserName = userData.first_name;
                    localStorage.setItem('telegram_user_name', telegramUserName);
                    console.log('✅ Получено имя пользователя из initData:', telegramUserName);
                    return telegramUserName;
                }
            }
        } catch (e) {
            console.log('Ошибка парсинга initData для имени:', e);
        }
    }
    
    const savedUserName = localStorage.getItem('telegram_user_name');
    if (savedUserName) {
        console.log('🔄 Используем сохраненное имя из localStorage:', savedUserName);
        return savedUserName;
    }
    
    return 'Unknown User';
}

// API функции
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
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
async function getUserData() {
    try {
        const userId = getUserId();
        const userName = getUserName();
        
        const response = await apiRequest('/api/user/data', {
            method: 'POST',
            body: JSON.stringify({
                user_id: userId,
                telegram_name: userName,
                init_data: tg?.initData || ''
            })
        });

        userStars = response.stars_balance || 0;
        userInventory = response.inventory || [];
        currentUserId = userId;
        
        console.log('✅ Данные пользователя загружены:', { userStars, userInventory });
        return response;
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        // Устанавливаем значения по умолчанию
        userStars = CONFIG.DEFAULT_STAR_BALANCE;
        userInventory = [];
        currentUserId = getUserId();
        return { stars_balance: userStars, inventory: userInventory };
    }
}

// Сохранение данных пользователя
async function saveUserData() {
    try {
        if (!currentUserId) return;
        
        await apiRequest('/api/user/save', {
            method: 'POST',
            body: JSON.stringify({
                user_id: currentUserId,
                telegram_name: getUserName(),
                stars_balance: userStars,
                inventory: userInventory,
                init_data: tg?.initData || ''
            })
        });
        
        console.log('✅ Данные пользователя сохранены');
    } catch (error) {
        console.error('Ошибка сохранения данных пользователя:', error);
    }
}

// Генерация приза
function generatePrize(rarity = 'common') {
    const prizes = CONFIG.PRIZES[rarity] || CONFIG.PRIZES.common;
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const basePrize = prizes[randomIndex];
    
    return {
        ...basePrize,
        id: 'prize_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
    };
}

// Генерация приза для кейса
function generateCasePrize() {
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
    
    return generatePrize('common');
}

// Открытие кейса
async function openCase(caseType, price) {
    try {
        if (isOpening) {
            showNotification('Кейс уже открывается', 'warning');
            return;
        }

        if (userStars < price) {
            showNotification('Недостаточно звезд', 'error');
            return;
        }

        isOpening = true;
        showOpeningAnimation();

        // Генерируем приз
        const prize = generateCasePrize();
        
        // Отправляем запрос на сервер
        const result = await apiRequest('/api/case/open', {
            method: 'POST',
            body: JSON.stringify({
                user_id: currentUserId,
                case_type: caseType,
                price: price,
                prize: prize,
                init_data: tg?.initData || ''
            })
        });

        if (result.success) {
            // Обновляем данные
            userStars = result.new_balance;
            userInventory.push(prize);
            
            // Обновляем UI
            updateStarsDisplay();
            updateInventoryDisplay();
            
            // Показываем приз
            showPrizeModal(prize);
            
            showNotification('Кейс успешно открыт!', 'success');
        }

    } catch (error) {
        console.error('Ошибка открытия кейса:', error);
        showNotification(error.message || 'Ошибка открытия кейса', 'error');
    } finally {
        isOpening = false;
        hideOpeningAnimation();
    }
}

// Покупка звезд
async function buyStars(amount) {
    try {
        if (!tg) {
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

// Обновление отображения звезд
function updateStarsDisplay() {
    const starsElement = document.getElementById('stars-count');
    if (starsElement) {
        starsElement.textContent = userStars;
    }
}

// Обновление отображения инвентаря
function updateInventoryDisplay() {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;

    inventoryGrid.innerHTML = '';

    if (userInventory.length === 0) {
        inventoryGrid.innerHTML = '<p class="empty-inventory">Инвентарь пуст</p>';
        return;
    }

    userInventory.forEach(item => {
        const itemElement = createInventoryItem(item);
        inventoryGrid.appendChild(itemElement);
    });
}

// Создание элемента инвентаря
function createInventoryItem(item) {
    const div = document.createElement('div');
    div.className = 'inventory-item';
    div.innerHTML = `
        <div class="item-icon">${getItemIcon(item)}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-rarity ${item.rarity}">${getRarityName(item.rarity)}</div>
    `;
    return div;
}

// Получение иконки предмета
function getItemIcon(item) {
    const icons = {
        sticker: '📄',
        gift: '🎁',
        premium: '⭐',
        stars: '💫'
    };
    return icons[item.type] || '❓';
}

// Получение названия редкости
function getRarityName(rarity) {
    const names = {
        common: 'Обычный',
        rare: 'Редкий',
        epic: 'Эпический',
        legendary: 'Легендарный'
    };
    return names[rarity] || 'Неизвестно';
}

// Переключение табов
function switchTab(tabName) {
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

    currentTab = tabName;

    // Обновляем контент в зависимости от таба
    if (tabName === 'inventory') {
        updateInventoryDisplay();
    }
}

// Показ анимации открытия
function showOpeningAnimation() {
    const openingArea = document.getElementById('opening-area');
    if (openingArea) {
        openingArea.style.display = 'block';
    }
}

// Скрытие анимации открытия
function hideOpeningAnimation() {
    const openingArea = document.getElementById('opening-area');
    if (openingArea) {
        openingArea.style.display = 'none';
    }
}

// Показ модального окна с призом
function showPrizeModal(prize) {
    const modal = document.getElementById('prize-modal');
    if (!modal) return;

    // Заполняем данные приза
    const iconElement = document.getElementById('modal-prize-icon');
    const nameElement = document.getElementById('modal-prize-name');
    const descriptionElement = document.getElementById('modal-prize-description');

    if (iconElement) iconElement.textContent = getItemIcon(prize);
    if (nameElement) nameElement.textContent = prize.name;
    if (descriptionElement) descriptionElement.textContent = prize.description || '';

    // Показываем модальное окно
    modal.style.display = 'flex';

    // Автоматически закрываем через 3 секунды
    setTimeout(() => {
        modal.style.display = 'none';
    }, 3000);
}

// Система уведомлений
function showNotification(message, type = 'info', duration = 3000) {
    // Создаем контейнер для уведомлений, если его нет
    let container = document.getElementById('notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        pointer-events: auto;
        max-width: 300px;
        word-wrap: break-word;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span>${getNotificationIcon(type)}</span>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Автоматическое удаление
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function getNotificationColor(type) {
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6'
    };
    return colors[type] || colors.info;
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики табов
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Обработчики кейсов
    document.querySelectorAll('.case-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const caseType = e.currentTarget.dataset.case;
            const price = parseInt(e.currentTarget.dataset.price);
            openCase(caseType, price);
        });
    });

    // Обработчики кнопок покупки звезд
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const amount = parseInt(e.target.dataset.amount);
            buyStars(amount);
        });
    });
}

// Инициализация приложения
async function initApp() {
    try {
        console.log('🚀 Инициализация Telegram Mini App...');

        // Инициализация Telegram WebApp
        if (tg) {
            tg.ready();
            tg.expand();
            console.log('✅ Telegram WebApp инициализирован');
        }

        // Загружаем данные пользователя
        await getUserData();

        // Инициализация UI
        updateStarsDisplay();
        updateInventoryDisplay();
        switchTab('cases');
        setupEventListeners();

        console.log('✅ Приложение успешно инициализировано');

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showNotification('Ошибка инициализации приложения', 'error');
    }
}

// Запуск при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);

// Экспорт функций для глобального доступа
window.openCase = openCase;
window.buyStars = buyStars;
window.switchTab = switchTab;
