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

// API функции удалены (не используются)

// Получение данных пользователя
async function getUserData() {
    try {
        const userId = getUserId();
        const userName = getUserName();
        
        // Устанавливаем значения по умолчанию
        userStars = CONFIG.DEFAULT_STAR_BALANCE;
        userInventory = [];
        currentUserId = userId;
        
        return { stars_balance: userStars, inventory: userInventory };
    } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
        // Устанавливаем значения по умолчанию
        userStars = CONFIG.DEFAULT_STAR_BALANCE;
        userInventory = [];
        currentUserId = getUserId();
        return { stars_balance: userStars, inventory: userInventory };
    }
}

// saveUserData удалена (не используется)

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
    console.log('🎁 ОТКРЫТИЕ КЕЙСА: Начинаем открытие', { caseType, price, userStars });
    
    try {
        if (isOpening) {
            console.log('⚠️ Кейс уже открывается');
            showNotification('Кейс уже открывается', 'warning');
            return;
        }

        if (userStars < price) {
            console.log('❌ Недостаточно звезд');
            showNotification('Недостаточно звезд', 'error');
            return;
        }

        console.log('✅ Проверки пройдены, начинаем открытие');
        isOpening = true;
        
        // Генерируем приз заранее
        const prize = generateCasePrize();
        console.log('🎁 Сгенерированный приз:', prize);
        
        // Запускаем анимацию и ждем её завершения
        console.log('🎬 Запускаем анимацию...');
        const animatedPrize = await showOpeningAnimation(caseType);
        console.log('🎬 Анимация завершена, результат:', animatedPrize);
        
        // Обновляем данные локально
        userStars -= price;
        userInventory.push(prize);
        
        // Обновляем UI
        updateStarsDisplay();
        updateInventoryDisplay();
        
        // Показываем приз
        showPrizeModal(prize);
        
        showNotification('Кейс успешно открыт!', 'success');

    } catch (error) {
        console.error('❌ Ошибка открытия кейса:', error);
        showNotification(error.message || 'Ошибка открытия кейса', 'error');
    } finally {
        isOpening = false;
        // Не закрываем анимацию автоматически — пользователь закроет через кнопку «Назад»
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
function showOpeningAnimation(caseType) {
    console.log('🎬 Показываем анимацию для кейса:', caseType);
    const openingArea = document.getElementById('opening-area');
    if (openingArea) {
        // Переходим в полноэкранный режим анимации
        document.body.classList.add('case-opening');
        openingArea.classList.add('fullscreen');
        openingArea.style.display = 'flex';

        // Показываем кнопку выхода
        const exitBtn = document.getElementById('exit-fullscreen-btn');
        if (exitBtn) exitBtn.style.display = 'block';

        // Скроллим к области анимации (на всякий случай для мобильных)
        try { openingArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}

        console.log('✅ Область анимации показана (fullscreen)');
        
        // Запускаем анимацию
        return new Promise((resolve) => {
            console.log('🚀 Запускаем CS2 анимацию...');
            startCaseAnimation(caseType, (prize) => {
                console.log('🎁 CS2 анимация завершена, приз:', prize);
                resolve(prize);
            });
        });
    }
    console.log('❌ Область анимации не найдена');
    return Promise.resolve(null);
}

// Скрытие анимации открытия
function hideOpeningAnimation() {
    const openingArea = document.getElementById('opening-area');
    if (openingArea) {
        // Прячем кнопку выхода и выходим из полноэкранного режима
        const exitBtn = document.getElementById('exit-fullscreen-btn');
        if (exitBtn) exitBtn.style.display = 'none';

        openingArea.classList.remove('fullscreen');
        openingArea.style.display = 'none';
    }
    document.body.classList.remove('case-opening');
    
    // Сбрасываем анимацию
    resetCaseAnimation();
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
        console.log('🎯 Настраиваем обработчик для кейса:', item.dataset.case);
        item.addEventListener('click', (e) => {
            console.log('🖱️ КЛИК ПО КЕЙСУ!', e.currentTarget.dataset);
            const caseType = e.currentTarget.dataset.case;
            const price = parseInt(e.currentTarget.dataset.price);
            console.log('🎁 Вызываем openCase с параметрами:', { caseType, price });
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

// Выход из полноэкранного режима
function exitFullscreenMode() {
    hideOpeningAnimation();
}

// ===== CS2 СТИЛЬ АНИМАЦИЯ ОТКРЫТИЯ КЕЙСА =====

// Глобальные переменные для CS2 анимации
let cs2Animation = {
    isRunning: false,
    items: [],
    selectedItem: null,
    container: null,
    currentPosition: 0,
    targetPosition: 0,
    animationPhase: 'idle', // idle, spinning, slowing, stopped
    spinSpeed: 0,
    maxSpeed: 50,
    deceleration: 0.95
};

/**
 * Запуск CS2 анимации открытия кейса
 * @param {string} caseType - Тип кейса
 * @param {Function} onComplete - Callback при завершении
 */
async function startCaseAnimation(caseType, onComplete) {
    console.log('🎮 CS2 Анимация: Начинаем для кейса', caseType);
    
    if (cs2Animation.isRunning) {
        console.log('⚠️ CS2 Анимация уже запущена');
        return;
    }

    cs2Animation.isRunning = true;
    cs2Animation.container = document.getElementById('prize-strip');
    
    console.log('🎯 CS2 Анимация: Контейнер найден?', !!cs2Animation.container);
    
    if (!cs2Animation.container) {
        console.log('❌ CS2 Анимация: Контейнер prize-strip не найден');
        cs2Animation.isRunning = false;
        return;
    }

    try {
        console.log('🎁 CS2 Анимация: Генерируем предметы...');
        // Генерируем предметы для анимации
        generateCS2Items(caseType);
        console.log('✅ CS2 Анимация: Предметы сгенерированы, всего:', cs2Animation.items.length);
        
        console.log('🎬 CS2 Анимация: Запускаем анимацию...');
        // Запускаем анимацию
        await runCS2Animation();
        console.log('✅ CS2 Анимация: Анимация завершена');
        
        // Вызываем callback
        if (onComplete) {
            console.log('🎁 CS2 Анимация: Вызываем callback с призом:', cs2Animation.selectedItem);
            onComplete(cs2Animation.selectedItem);
        }

    } catch (error) {
        console.error('❌ CS2 Анимация: Ошибка:', error);
    } finally {
        cs2Animation.isRunning = false;
    }
}

/**
 * Генерация предметов для CS2 анимации
 * @param {string} caseType - Тип кейса
 */
function generateCS2Items(caseType) {
    console.log('🎁 CS2 Генерация: Начинаем генерацию предметов');
    cs2Animation.items = [];
    
    // Генерируем много предметов (как в CS2)
    const totalItems = 100;
    console.log('🎁 CS2 Генерация: Создаем', totalItems, 'предметов');
    
    for (let i = 0; i < totalItems; i++) {
        const item = generateCasePrize();
        cs2Animation.items.push({
            ...item,
            id: `item_${i}`,
            position: i * 200 // 200px между предметами
        });
    }

    // Выбираем случайный предмет из последней трети
    const startIndex = Math.floor(totalItems * 0.7);
    const endIndex = totalItems - 1;
    const randomIndex = Math.floor(Math.random() * (endIndex - startIndex + 1)) + startIndex;
    cs2Animation.selectedItem = cs2Animation.items[randomIndex];
    
    console.log('🎯 CS2 Генерация: Выбран предмет с индексом', randomIndex, ':', cs2Animation.selectedItem);

    // Создаем DOM элементы
    console.log('🎨 CS2 Генерация: Создаем DOM элементы...');
    createCS2Items();
    
    // Вычисляем целевую позицию с учетом реальной ширины элементов и контейнера
    const containerEl = document.querySelector('.prize-strip-container');
    const containerWidth = containerEl?.clientWidth || 800;
    const itemWidth = 160; // в inline стилях
    const itemGap = 20;
    const itemSpacing = itemWidth + itemGap; // 180px
    // Центрируем выбранный предмет: его центр должен попасть в центр контейнера
    const centerOffset = containerWidth / 2 - itemWidth / 2;
    cs2Animation.targetPosition = -(randomIndex * itemSpacing - centerOffset);
    console.log('📍 CS2 Генерация: Целевая позиция:', cs2Animation.targetPosition, 'containerWidth:', containerWidth, 'itemSpacing:', itemSpacing);
}

/**
 * Создание DOM элементов для CS2 анимации
 */
function createCS2Items() {
    console.log('🎨 CS2 DOM: Очищаем контейнер');
    cs2Animation.container.innerHTML = '';
    
    // Добавляем класс для CS2 анимации
    cs2Animation.container.classList.add('cs2-animation');
    // Явно задаем ширину и flex-раскладку для надежности на мобильных WebView
    const totalWidth = cs2Animation.items.length * 200 + 800; // 200px на элемент + запас
    cs2Animation.container.style.display = 'flex';
    cs2Animation.container.style.alignItems = 'center';
    cs2Animation.container.style.width = `${totalWidth}px`;
    cs2Animation.container.style.transform = 'translateX(0px)';
    cs2Animation.container.style.transition = '';
    cs2Animation.container.style.zIndex = '9998';
    // Временный яркий фон для диагностики видимости (можно убрать позже)
    // cs2Animation.container.style.background = 'rgba(0, 255, 0, 0.1)';
    
    console.log('🎨 CS2 DOM: Создаем', cs2Animation.items.length, 'элементов');
    
    cs2Animation.items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `cs2-item flex-item ${item.rarity}`;
        itemElement.innerHTML = `
            <div class="cs2-item-icon" style="font-size: 2.2rem; margin-bottom: 8px;">${getCS2ItemIcon(item)}</div>
            <div class="cs2-item-name" style="font-weight: 700;">${item.name}</div>
            <div class="cs2-item-rarity" style="font-size: 0.85rem; opacity: 0.9;">${getRarityName(item.rarity)}</div>
        `;
        // Форсируем видимость и размеры (перебиваем любые конфликтующие стили)
        itemElement.style.width = '160px';
        itemElement.style.height = '160px';
        itemElement.style.display = 'flex';
        itemElement.style.flexDirection = 'column';
        itemElement.style.alignItems = 'center';
        itemElement.style.justifyContent = 'center';
        itemElement.style.marginRight = '20px';
        itemElement.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)';
        itemElement.style.border = '3px solid #444';
        itemElement.style.borderRadius = '8px';
        itemElement.style.color = '#fff';
        itemElement.style.opacity = '1';
        itemElement.style.position = 'relative';
        itemElement.style.zIndex = '9999';
        
        // Убираем отладочные стили
        // itemElement.style.backgroundColor = 'red';
        // itemElement.style.border = '2px solid yellow';
        cs2Animation.container.appendChild(itemElement);
    });
    
    console.log('✅ CS2 DOM: Создано', cs2Animation.container.children.length, 'элементов');
    if (cs2Animation.container.children.length === 0) {
        console.warn('⚠️ CS2 DOM: Элементы не были добавлены в контейнер');
    }
}

/**
 * Получение иконки предмета для CS2
 * @param {Object} item - Предмет
 * @returns {string} - Иконка
 */
function getCS2ItemIcon(item) {
    const icons = {
        sticker: '📄',
        gift: '🎁',
        premium: '⭐',
        stars: '💫'
    };
    return icons[item.type] || '❓';
}

/**
 * Запуск CS2 анимации
 */
async function runCS2Animation() {
    console.log('🎬 CS2 Анимация: Запускаем анимацию прокрутки');
    console.log('🎬 CS2 Анимация: Начальная ширина контейнера:', cs2Animation.container?.style?.width);
    console.log('🎬 CS2 Анимация: Кол-во элементов в контейнере:', cs2Animation.container?.children?.length);
    
    return new Promise((resolve) => {
        let animationId;
        let startTime = Date.now();
        
        // Фаза 1: Быстрое вращение (2 секунды)
        console.log('⚡ CS2 Анимация: Фаза 1 - Быстрое вращение (2 сек)');
        cs2Animation.animationPhase = 'spinning';
        cs2Animation.spinSpeed = cs2Animation.maxSpeed;
        
        function animate() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            
            if (cs2Animation.animationPhase === 'spinning') {
                // Быстрое вращение 2 секунды
                if (elapsed < 2000) {
                    cs2Animation.currentPosition -= cs2Animation.spinSpeed;
                    cs2Animation.container.style.transform = `translateX(${cs2Animation.currentPosition}px)`;
                    
                    // Отладка каждые 500ms (отключена)
                    // if (elapsed % 500 < 50) {
                    //     console.log('⚡ Позиция:', cs2Animation.currentPosition, 'Скорость:', cs2Animation.spinSpeed);
                    // }
                    
                    animationId = requestAnimationFrame(animate);
                } else {
                    // Переходим к замедлению
                    console.log('🐌 CS2 Анимация: Фаза 2 - Замедление (1.5 сек)');
                    cs2Animation.animationPhase = 'slowing';
                    startTime = Date.now(); // Сбрасываем время для фазы замедления
                    animationId = requestAnimationFrame(animate);
                }
            } else if (cs2Animation.animationPhase === 'slowing') {
                // Замедление 1.5 секунды
                if (elapsed < 1500) {
                    cs2Animation.spinSpeed *= cs2Animation.deceleration;
                    cs2Animation.currentPosition -= cs2Animation.spinSpeed;
                    cs2Animation.container.style.transform = `translateX(${cs2Animation.currentPosition}px)`;
                    
                    // Отладка каждые 500ms
                    if (elapsed % 500 < 50) {
                        console.log('🐌 Позиция:', cs2Animation.currentPosition, 'Скорость:', cs2Animation.spinSpeed);
                    }
                    
                    animationId = requestAnimationFrame(animate);
                } else {
                    // Останавливаемся
                    console.log('🛑 CS2 Анимация: Останавливаемся');
                    cancelAnimationFrame(animationId);
                    stopCS2Animation();
                    resolve();
                }
            }
        }
        
        // Запускаем анимацию
        animationId = requestAnimationFrame(animate);
    });
}

/**
 * Остановка CS2 анимации
 */
function stopCS2Animation() {
    console.log('🛑 CS2 Остановка: Переходим к финальной позиции');
    cs2Animation.animationPhase = 'stopped';
    
    // Плавно перемещаем к целевому предмету
    cs2Animation.container.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    cs2Animation.container.style.transform = `translateX(${cs2Animation.targetPosition}px)`;
    
    console.log('📍 CS2 Остановка: Перемещаемся к позиции', cs2Animation.targetPosition);
    
    // Подсвечиваем выбранный предмет
    setTimeout(() => {
        console.log('✨ CS2 Остановка: Подсвечиваем выбранный предмет');
        highlightCS2SelectedItem();
        showCS2Result();
    }, 800);
}

/**
 * Подсветка выбранного предмета
 */
function highlightCS2SelectedItem() {
    const items = cs2Animation.container.querySelectorAll('.cs2-item');
    items.forEach(item => item.classList.remove('selected'));
    
    // Находим центральный предмет (примерно в центре экрана)
    const centerIndex = Math.floor(items.length / 2);
    if (items[centerIndex]) {
        items[centerIndex].classList.add('selected');
        console.log('✨ CS2 Подсветка: Выбран предмет с индексом', centerIndex);
    }
}

/**
 * Показ результата CS2
 */
function showCS2Result() {
    // Активируем эффекты
    activateCS2Effects();
    
    // Показываем результат
    showCS2PrizeReveal();
}

/**
 * Активация CS2 эффектов
 */
function activateCS2Effects() {
    // Лучи света
    const lightRays = document.querySelector('.light-rays');
    if (lightRays) lightRays.classList.add('active');

    // Взрыв
    const explosion = document.getElementById('explosion-effect');
    if (explosion) explosion.classList.add('active');

    // Вспышка
    const flash = document.getElementById('light-flash');
    if (flash) flash.classList.add('active');
}

/**
 * Показ результата CS2
 */
function showCS2PrizeReveal() {
    const prizeReveal = document.getElementById('prize-reveal');
    if (!prizeReveal || !cs2Animation.selectedItem) return;

    // Заполняем данные
    const iconElement = document.getElementById('prize-icon');
    const nameElement = document.getElementById('prize-name');
    const descriptionElement = document.getElementById('prize-description');
    const rarityElement = document.getElementById('prize-rarity');

    if (iconElement) iconElement.textContent = getCS2ItemIcon(cs2Animation.selectedItem);
    if (nameElement) nameElement.textContent = cs2Animation.selectedItem.name;
    if (descriptionElement) descriptionElement.textContent = cs2Animation.selectedItem.description || '';
    if (rarityElement) {
        rarityElement.textContent = getRarityName(cs2Animation.selectedItem.rarity);
        rarityElement.className = `prize-rarity ${cs2Animation.selectedItem.rarity}`;
    }

    // Показываем анимацию
    prizeReveal.classList.add('show');
}

// дубликат getRarityName удален

/**
 * Сброс CS2 анимации
 */
function resetCaseAnimation() {
    cs2Animation.isRunning = false;
    cs2Animation.currentPosition = 0;
    cs2Animation.targetPosition = 0;
    cs2Animation.items = [];
    cs2Animation.selectedItem = null;
    cs2Animation.animationPhase = 'idle';
    cs2Animation.spinSpeed = 0;

    if (cs2Animation.container) {
        cs2Animation.container.style.transition = '';
        cs2Animation.container.style.transform = '';
        cs2Animation.container.innerHTML = '';
    }

    // Скрываем эффекты
    const lightRays = document.querySelector('.light-rays');
    if (lightRays) lightRays.classList.remove('active');

    const explosion = document.getElementById('explosion-effect');
    if (explosion) explosion.classList.remove('active');

    const flash = document.getElementById('light-flash');
    if (flash) flash.classList.remove('active');

    // Скрываем результат
    const prizeReveal = document.getElementById('prize-reveal');
    if (prizeReveal) prizeReveal.classList.remove('show');
}

// Экспорт функций для глобального доступа
window.openCase = openCase;
window.buyStars = buyStars;
window.switchTab = switchTab;
window.exitFullscreenMode = exitFullscreenMode;
