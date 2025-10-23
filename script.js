// Telegram WebApp API
const tg = window.Telegram.WebApp;

// Глобальные переменные
let userStars = 0; // Начальный баланс звезд (будет загружен с сервера)
let userInventory = []; // Инвентарь пользователя
let isOpening = false; // Флаг открытия кейса
let currentUserId = null; // ID текущего пользователя
let pendingPrize = null; // Ожидающий приз (если анимация не завершена)
let pendingCasePrice = 0; // Цена ожидающего кейса

// Админские функции
const ADMIN_USER_ID = '1165123437'; // ID админа
let isAdmin = false; // Флаг админа
let adminMode = false; // Режим админа

// Функция для получения userId
function getUserId() {
    // Сначала пытаемся получить из Telegram WebApp
    if (tg?.initDataUnsafe?.user?.id) {
        const telegramUserId = tg.initDataUnsafe.user.id.toString();
        
        // Блокируем тестовых пользователей
        if (telegramUserId === 'test_user' || telegramUserId === 'test_user_123') {
            console.log('🚫 Блокируем использование тестового пользователя:', telegramUserId);
            // Генерируем новый ID вместо тестового
            const fallbackId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('telegram_user_id', fallbackId);
            console.log('✅ Сгенерирован новый ID вместо тестового:', fallbackId);
            return fallbackId;
        }
        
        // Сохраняем Telegram userId в localStorage для последующего использования
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
                    // Сохраняем Telegram userId в localStorage для последующего использования
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
    
    // Если ничего не получилось, генерируем уникальный ID на основе времени и случайного числа
    const fallbackId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('⚠️ Не удалось получить userId от Telegram, используем fallback:', fallbackId);
    
    // Дополнительная проверка: если fallback ID случайно совпал с тестовым
    if (fallbackId === 'test_user' || fallbackId === 'test_user_123') {
        const newFallbackId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('🚫 Fallback ID совпал с тестовым, генерируем новый:', newFallbackId);
        localStorage.setItem('telegram_user_id', newFallbackId);
        return newFallbackId;
    }
    
    // Сохраняем fallback ID для последующего использования
    localStorage.setItem('telegram_user_id', fallbackId);
    return fallbackId;
}

// Функция для получения имени пользователя
function getUserName() {
    // Сначала пытаемся получить из Telegram WebApp
    if (tg?.initDataUnsafe?.user?.first_name) {
        const telegramUserName = tg.initDataUnsafe.user.first_name;
        // Сохраняем имя пользователя в localStorage
        localStorage.setItem('telegram_user_name', telegramUserName);
        console.log('✅ Получено имя пользователя от Telegram:', telegramUserName);
        return telegramUserName;
    }
    
    // Если не получилось, пытаемся получить из initData
    if (tg?.initData) {
        try {
            const urlParams = new URLSearchParams(tg.initData);
            const userParam = urlParams.get('user');
            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData.first_name) {
                    const telegramUserName = userData.first_name;
                    // Сохраняем имя пользователя в localStorage
                    localStorage.setItem('telegram_user_name', telegramUserName);
                    console.log('✅ Получено имя пользователя из initData:', telegramUserName);
                    return telegramUserName;
                }
            }
        } catch (e) {
            console.log('Ошибка парсинга initData для имени:', e);
        }
    }
    
    // Проверяем, есть ли сохраненное имя в localStorage
    const savedUserName = localStorage.getItem('telegram_user_name');
    if (savedUserName) {
        console.log('🔄 Используем сохраненное имя из localStorage:', savedUserName);
        return savedUserName;
    }
    
    // Если ничего не получилось, используем fallback
    return 'Unknown User';
}

// Функция для очистки сохраненных данных пользователя
function clearUserData() {
    localStorage.removeItem('telegram_user_id');
    localStorage.removeItem('telegram_user_name');
    console.log('🗑️ Очищены сохраненные данные пользователя');
}

// Функция проверки админа
function checkAdmin() {
    const userId = getUserId();
    isAdmin = userId === ADMIN_USER_ID;
    
    if (isAdmin) {
        console.log('🔑 АДМИН РЕЖИМ: Пользователь является администратором');
        setupAdminInterface();
    } else {
        console.log('👤 Обычный пользователь');
    }
    
    return isAdmin;
}

// Настройка админского интерфейса
function setupAdminInterface() {
    // Добавляем скрытую кнопку админа в заголовок
    const header = document.querySelector('.header');
    if (header && !document.getElementById('admin-toggle')) {
        const adminToggle = document.createElement('div');
        adminToggle.id = 'admin-toggle';
        adminToggle.className = 'admin-toggle';
        adminToggle.innerHTML = '🔧';
        adminToggle.title = 'Админ панель (двойной клик)';
        adminToggle.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 30px;
            height: 30px;
            background: rgba(255, 0, 0, 0.1);
            border: 2px solid #ff0000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        adminToggle.addEventListener('click', function(e) {
            if (e.detail === 2) { // Двойной клик
                toggleAdminMode();
            }
        });
        
        header.appendChild(adminToggle);
    }
}

// Переключение админского режима
function toggleAdminMode() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    adminMode = !adminMode;
    
    if (adminMode) {
        showAdminPanel();
        showNotification('🔑 Админ режим активирован', 'success');
    } else {
        hideAdminPanel();
        showNotification('👤 Обычный режим', 'info');
    }
}

// Показ админской панели
function showAdminPanel() {
    // Создаем админскую панель
    let adminPanel = document.getElementById('admin-panel');
    if (!adminPanel) {
        adminPanel = document.createElement('div');
        adminPanel.id = 'admin-panel';
        adminPanel.className = 'admin-panel';
        adminPanel.innerHTML = `
            <div class="admin-header">
                <h3>🔧 Админ Панель</h3>
                <button onclick="toggleAdminMode()" class="admin-close">✕</button>
            </div>
            <div class="admin-content">
                <div class="admin-section">
                    <h4>👥 Управление пользователями</h4>
                    <div class="admin-controls">
                        <input type="text" id="target-user-id" placeholder="ID пользователя" class="admin-input">
                        <input type="number" id="balance-amount" placeholder="Количество звезд" class="admin-input">
                        <button onclick="setUserBalance()" class="admin-btn">💎 Установить баланс</button>
                        <button onclick="addUserBalance()" class="admin-btn">➕ Добавить звезды</button>
                        <button onclick="setMyBalance()" class="admin-btn">⭐ Установить МОЙ баланс</button>
                        <button onclick="addMyBalance()" class="admin-btn">➕ Добавить МНЕ звезды</button>
                        <button onclick="getUserInfo()" class="admin-btn">ℹ️ Информация о пользователе</button>
                        <button onclick="deleteUser()" class="admin-btn" style="background: #dc3545;">🗑️ Удалить пользователя</button>
                    </div>
                </div>
                <div class="admin-section">
                    <h4>📊 Статистика</h4>
                    <div class="admin-controls">
                        <button onclick="getAllUsers()" class="admin-btn">👥 Все пользователи</button>
                        <button onclick="getServerStats()" class="admin-btn">📈 Статистика сервера</button>
                        <button onclick="createBackup()" class="admin-btn">💾 Создать резервную копию</button>
                    </div>
                </div>
                <div class="admin-section">
                    <h4>🔧 Система</h4>
                    <div class="admin-controls">
                        <button onclick="deleteTestUsers()" class="admin-btn" style="background: #dc3545;">🗑️ Удалить тестовых пользователей</button>
                        <button onclick="clearAllData()" class="admin-btn">⚠️ Очистить все данные</button>
                    </div>
                </div>
            </div>
            <div class="admin-log" id="admin-log">
                <h4>📝 Лог действий</h4>
                <div id="admin-log-content"></div>
            </div>
        `;
        
        // Добавляем стили для админской панели
        const adminStyles = document.createElement('style');
        adminStyles.textContent = `
            .admin-panel {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                color: white;
                overflow-y: auto;
                padding: 20px;
                box-sizing: border-box;
            }
            .admin-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #ff0000;
            }
            .admin-close {
                background: #ff0000;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            }
            .admin-section {
                margin-bottom: 30px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                border: 1px solid #333;
            }
            .admin-controls {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 10px;
            }
            .admin-input {
                padding: 8px 12px;
                border: 1px solid #555;
                border-radius: 5px;
                background: #333;
                color: white;
                min-width: 150px;
            }
            .admin-btn {
                padding: 8px 15px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: background 0.3s;
            }
            .admin-btn:hover {
                background: #0056b3;
            }
            .admin-log {
                margin-top: 20px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 10px;
                max-height: 200px;
                overflow-y: auto;
            }
            #admin-log-content {
                font-family: monospace;
                font-size: 12px;
                line-height: 1.4;
            }
        `;
        document.head.appendChild(adminStyles);
        
        document.body.appendChild(adminPanel);
    }
    
    adminPanel.style.display = 'block';
}

// Скрытие админской панели
function hideAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
}

// Логирование админских действий
function logAdminAction(action) {
    const logContent = document.getElementById('admin-log-content');
    if (logContent) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${action}`;
        logEntry.style.marginBottom = '5px';
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    console.log(`🔧 АДМИН: ${action}`);
}

// Конфигурация кейсов с улучшенной системой редкости
const caseConfig = {
    bronze: {
        price: 10,
        prizes: [
            { type: 'gift', name: 'Сердечко', icon: '❤️', description: 'Подарок сердечко', telegram_gift_id: 'heart_1', rarity: 'common' },
            { type: 'gift', name: 'Звездочка', icon: '⭐', description: 'Подарок звездочка', telegram_gift_id: 'star_1', rarity: 'common' },
            { type: 'gift', name: 'Цветок', icon: '🌸', description: 'Подарок цветок', telegram_gift_id: 'flower_1', rarity: 'common' },
            { type: 'gift', name: 'Торт', icon: '🎂', description: 'Редкий торт', telegram_gift_id: 'cake_1', rarity: 'rare' }
        ]
    },
    silver: {
        price: 25,
        prizes: [
            { type: 'gift', name: 'Сердечко', icon: '❤️', description: 'Подарок сердечко', telegram_gift_id: 'heart_1', rarity: 'common' },
            { type: 'gift', name: 'Звездочка', icon: '⭐', description: 'Подарок звездочка', telegram_gift_id: 'star_1', rarity: 'common' },
            { type: 'gift', name: 'Цветок', icon: '🌸', description: 'Подарок цветок', telegram_gift_id: 'flower_1', rarity: 'common' },
            { type: 'gift', name: 'Торт', icon: '🎂', description: 'Редкий торт', telegram_gift_id: 'cake_1', rarity: 'rare' },
            { type: 'sticker', name: 'Кот', icon: '🐱', description: 'Стикер кота', telegram_sticker_id: 'cat_1', rarity: 'rare' },
            { type: 'sticker', name: 'Собака', icon: '🐶', description: 'Стикер собаки', telegram_sticker_id: 'dog_1', rarity: 'rare' }
        ]
    },
    gold: {
        price: 50,
        prizes: [
            { type: 'premium', name: 'Telegram Premium', icon: '👑', description: 'Премиум подписка на 1 месяц', premium_duration: 30, rarity: 'legendary' },
            { type: 'gift', name: 'Королевский подарок', icon: '🎁', description: 'Эксклюзивный подарок', telegram_gift_id: 'royal_1', rarity: 'epic' },
            { type: 'sticker', name: 'Премиум стикер', icon: '✨', description: 'Стикер премиум качества', telegram_sticker_id: 'premium_1', rarity: 'epic' }
        ]
    },
    diamond: {
        price: 100,
        prizes: [
            { type: 'premium', name: 'Telegram Premium', icon: '👑', description: 'Премиум подписка на 3 месяца', premium_duration: 90, rarity: 'legendary' },
            { type: 'gift', name: 'Алмазный подарок', icon: '💎', description: 'Уникальный алмазный подарок', telegram_gift_id: 'diamond_1', rarity: 'legendary' },
            { type: 'sticker', name: 'Эксклюзивный стикер', icon: '🌟', description: 'Эксклюзивный стикер', telegram_sticker_id: 'exclusive_1', rarity: 'epic' }
        ]
    }
};

// Функция для периодического обновления данных
function startDataSync() {
    // Обновляем данные каждые 30 секунд
    setInterval(async () => {
        console.log('Синхронизация данных...');
        
        // Проверяем, есть ли нерешенный алмазный кейс
        const starsSpentState = localStorage.getItem('starsSpent');
        const pendingPrize = localStorage.getItem('pendingPrize');
        
        let skipSync = false;
        
        // Если есть нерешенный алмазный кейс (100 звезд), НЕ синхронизируем
        if (starsSpentState) {
            try {
                const state = JSON.parse(starsSpentState);
                if (state.spent && state.amount === 100 && Date.now() - state.timestamp < 600000) {
                    console.log('💎 АЛМАЗНЫЙ КЕЙС - ПРОПУСКАЕМ СИНХРОНИЗАЦИЮ');
                    skipSync = true;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }
        }
        
        // Если есть нерешенный приз, НЕ синхронизируем
        if (!skipSync && pendingPrize) {
            try {
                const state = JSON.parse(pendingPrize);
                if (state.prize && (state.prize.type === 'premium' || state.prize.name.includes('Алмазный'))) {
                    console.log('💎 АЛМАЗНЫЙ ПРИЗ - ПРОПУСКАЕМ СИНХРОНИЗАЦИЮ');
                    skipSync = true;
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }
        }
        
        if (!skipSync) {
            // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Проверяем текущий баланс перед синхронизацией
            const currentBalance = userStars;
            const hasInventory = userInventory.length > 0;
            const savedBalance = localStorage.getItem('user_balance');
            
            await loadUserData();
            
            // Если после синхронизации баланс стал 100, но у нас есть инвентарь, это подозрительно
            if (userStars === 100 && hasInventory && currentBalance !== 100) {
                console.log('⚠️ СИНХРОНИЗАЦИЯ: Подозрительное изменение баланса с', currentBalance, 'на 100');
                console.log('⚠️ Восстанавливаем предыдущий баланс:', currentBalance);
                safeUpdateBalance(currentBalance, 'sync protection');
            }
            
            // Дополнительная защита: проверяем localStorage
            if (savedBalance && parseInt(savedBalance) > 0 && userStars === 100 && hasInventory) {
                console.log('🔄 СИНХРОНИЗАЦИЯ: Восстанавливаем баланс из localStorage:', savedBalance);
                safeUpdateBalance(parseInt(savedBalance), 'localStorage restore');
                await saveUserData();
            }
        }
    }, 30000);
    
    // Обновляем данные при возвращении на вкладку
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Возвращение на вкладку - обновляем данные');
            
            // Проверяем, есть ли нерешенный алмазный кейс
            const starsSpentState = localStorage.getItem('starsSpent');
            const pendingPrize = localStorage.getItem('pendingPrize');
            
            let skipSync = false;
            
            // Если есть нерешенный алмазный кейс (100 звезд), НЕ синхронизируем
            if (starsSpentState) {
                try {
                    const state = JSON.parse(starsSpentState);
                    if (state.spent && state.amount === 100 && Date.now() - state.timestamp < 600000) {
                        console.log('💎 АЛМАЗНЫЙ КЕЙС - ПРОПУСКАЕМ СИНХРОНИЗАЦИЮ ПРИ ВОЗВРАЩЕНИИ');
                        skipSync = true;
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            }
            
            // Если есть нерешенный приз, НЕ синхронизируем
            if (!skipSync && pendingPrize) {
                try {
                    const state = JSON.parse(pendingPrize);
                    if (state.prize && (state.prize.type === 'premium' || state.prize.name.includes('Алмазный'))) {
                        console.log('💎 АЛМАЗНЫЙ ПРИЗ - ПРОПУСКАЕМ СИНХРОНИЗАЦИЮ ПРИ ВОЗВРАЩЕНИИ');
                        skipSync = true;
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            }
            
            if (!skipSync) {
                // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Проверяем текущий баланс перед синхронизацией
                const currentBalance = userStars;
                const hasInventory = userInventory.length > 0;
                const savedBalance = localStorage.getItem('user_balance');
                
                loadUserData();
                
                // Если после синхронизации баланс стал 100, но у нас есть инвентарь, это подозрительно
                if (userStars === 100 && hasInventory && currentBalance !== 100) {
                    console.log('⚠️ ВОЗВРАЩЕНИЕ НА ВКЛАДКУ: Подозрительное изменение баланса с', currentBalance, 'на 100');
                    console.log('⚠️ Восстанавливаем предыдущий баланс:', currentBalance);
                    safeUpdateBalance(currentBalance, 'visibility change protection');
                }
                
                // Дополнительная защита: проверяем localStorage
                if (savedBalance && parseInt(savedBalance) > 0 && userStars === 100 && hasInventory) {
                    console.log('🔄 ВОЗВРАЩЕНИЕ НА ВКЛАДКУ: Восстанавливаем баланс из localStorage:', savedBalance);
                    safeUpdateBalance(parseInt(savedBalance), 'visibility localStorage restore');
                    saveUserData();
                }
            }
        }
    });
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Приложение загружено');
    
    // Инициализация Telegram WebApp
    if (tg) {
        tg.ready();
        
        // Настройка для Telegram Mini App
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Настройка темы
        if (tg.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        // Обработка изменения темы
        tg.onEvent('themeChanged', () => {
            if (tg.colorScheme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        });
        
        // Настройка viewport для мобильных устройств
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        }
        
        // Отключение масштабирования на мобильных
        document.addEventListener('gesturestart', function (e) {
            e.preventDefault();
        });
        
        document.addEventListener('gesturechange', function (e) {
            e.preventDefault();
        });
        
        document.addEventListener('gestureend', function (e) {
            e.preventDefault();
        });
        
        // Предотвращение двойного тапа для масштабирования
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function (event) {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        // Оптимизация для мобильных устройств
        if (window.innerWidth <= 768) {
            // Отключаем hover эффекты на мобильных
            document.body.classList.add('mobile-device');
            
            // Упрощаем анимации
            document.body.classList.add('reduced-motion');
        }
        tg.expand();
        
        // Получаем данные пользователя из Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
            console.log('Пользователь:', user);
            // Можно использовать user.id для идентификации
        }
    }
    
    // Проверяем, сменился ли пользователь
    const currentTelegramUserId = tg?.initDataUnsafe?.user?.id?.toString();
    const savedUserId = localStorage.getItem('telegram_user_id');
    
    if (currentTelegramUserId && savedUserId && currentTelegramUserId !== savedUserId) {
        console.log('🔄 Обнаружена смена пользователя!');
        console.log('🔄 Старый userId:', savedUserId);
        console.log('🔄 Новый userId:', currentTelegramUserId);
        clearUserData(); // Очищаем старые данные
    }
    
    // Инициализируем userId
    currentUserId = getUserId();
    console.log('🆔 Текущий userId:', currentUserId);
    console.log('👤 Имя пользователя:', getUserName());
    console.log('📱 Telegram WebApp данные:', {
        initData: tg?.initData,
        initDataUnsafe: tg?.initDataUnsafe,
        user: tg?.initDataUnsafe?.user
    });
    
    // Проверяем админские права
    checkAdmin();
    
    
    // Сбрасываем все флаги при загрузке приложения
    isOpening = false;
    isChoosingPrize = false;
    prizeAutoAdded = false;
    starsSpent = false;
    currentCasePrice = 0;
    currentPrize = null;
    
    // Проверяем, есть ли нерешенный приз ПЕРЕД загрузкой данных с сервера
    const hasPendingPrize = await restorePrizeState();
    if (hasPendingPrize) {
        showNotification('Восстановлен нерешенный приз!', 'info');
        // Если есть нерешенный приз, НЕ загружаем данные с сервера
        // чтобы не перезаписать потраченные звезды
        console.log('Приз восстановлен, пропускаем загрузку данных с сервера');
    } else {
        // Загружаем сохраненные данные только если нет нерешенного приза
        console.log('Загружаем данные пользователя...');
        const dataLoaded = await loadUserData();
        
        if (dataLoaded) {
            console.log('Данные успешно загружены с сервера');
            showNotification('Данные загружены!', 'success');
        } else {
            console.log('Используем локальные данные по умолчанию');
            showNotification('Добро пожаловать в Кейс Мастер!', 'success');
        }
    }
    
    // Проверяем, были ли потрачены звезды
    const starsSpentState = localStorage.getItem('starsSpent');
    if (starsSpentState) {
        try {
            const state = JSON.parse(starsSpentState);
            // Если прошло не более 10 минут, считаем что звезды потрачены
            if (state.spent && Date.now() - state.timestamp < 600000) {
                console.log('⭐ ВОССТАНОВЛЕНИЕ ЗВЕЗД: звезды потрачены');
                console.log(`💰 Оригинальное количество звезд: ${state.originalStars}, потрачено: ${state.amount}`);
                
                // Специальное логирование для алмазного кейса
                if (state.amount === 100) {
                    console.log('💎 АЛМАЗНЫЙ КЕЙС - ВОССТАНОВЛЕНИЕ ЗВЕЗД');
                    console.log('💎 Баланс ДО восстановления:', userStars);
                    console.log('💎 Оригинальные звезды:', state.originalStars);
                    console.log('💎 Потрачено на алмазный кейс:', state.amount);
                }
                
                // Восстанавливаем правильное количество звезд (оригинальное - потраченное)
                safeUpdateBalance(state.originalStars - state.amount, 'prize restoration');
                starsSpent = true;
                
                console.log(`💰 Восстановленный баланс: ${userStars} звезд`);
                
                // Специальное логирование для алмазного кейса
                if (state.amount === 100) {
                    console.log('💎 АЛМАЗНЫЙ КЕЙС - БАЛАНС ПОСЛЕ ВОССТАНОВЛЕНИЯ:', userStars);
                }
                
                // Очищаем состояние после использования
                localStorage.removeItem('starsSpent');
            }
        } catch (error) {
            console.error('Ошибка при восстановлении состояния звезд:', error);
            localStorage.removeItem('starsSpent');
        }
    }
    
    // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Проверяем, не был ли баланс случайно сброшен на 100
    // Если у пользователя есть предметы в инвентаре, но баланс 100, это подозрительно
    if (userStars === 100 && userInventory.length > 0) {
        const hasDiamondPrize = userInventory.some(item => 
            item.type === 'premium' || 
            item.name.includes('Алмазный') || 
            item.name.includes('Premium') ||
            item.rarity === 'legendary'
        );
        
        if (hasDiamondPrize) {
            console.log('💎 ОБНАРУЖЕН АЛМАЗНЫЙ ПРИЗ В ИНВЕНТАРЕ ПРИ БАЛАНСЕ 100 (инициализация)');
            console.log('💎 Исправляем баланс на 0 звезд');
            safeUpdateBalance(0, 'diamond prize init correction');
            starsSpent = true;
            
            // Сразу сохраняем исправленный баланс на сервер
            saveUserData();
        }
    }
    
    // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Проверяем localStorage на предмет сохраненного баланса
    const savedBalance = localStorage.getItem('user_balance');
    if (savedBalance && parseInt(savedBalance) > 0 && userStars === 100 && userInventory.length > 0) {
        console.log('🔄 ВОССТАНОВЛЕНИЕ БАЛАНСА из localStorage:', savedBalance);
        safeUpdateBalance(parseInt(savedBalance), 'localStorage init restore');
        // Сохраняем восстановленный баланс на сервер
        saveUserData();
    }
    
    // Дополнительная проверка: если баланс 100, но в инвентаре есть алмазные призы,
    // значит был открыт алмазный кейс и нужно исправить баланс
    if (userStars === 100 && userInventory.length > 0) {
        const hasDiamondPrize = userInventory.some(item => 
            item.type === 'premium' || 
            item.name.includes('Алмазный') || 
            item.name.includes('Premium') ||
            item.rarity === 'legendary'
        );
        
        if (hasDiamondPrize) {
            console.log('💎 ОБНАРУЖЕН АЛМАЗНЫЙ ПРИЗ В ИНВЕНТАРЕ ПРИ БАЛАНСЕ 100');
            console.log('💎 Исправляем баланс на 0 звезд');
            safeUpdateBalance(0, 'diamond prize final correction');
            starsSpent = true;
            
            // Сразу сохраняем исправленный баланс на сервер
            saveUserData();
        }
    }
    
    // Обновляем отображение
    updateStarsDisplay();
    updateInventoryDisplay();
    
    // Автоматическое восстановление потерянных данных
    console.log('🔄 ИНИЦИАЛИЗАЦИЯ: Проверяем на наличие потерянных данных...');
    recoverLostItems();
    
    // Проверяем, есть ли незавершенное открытие кейса
    await checkPendingCaseOpening();
    
    // Добавляем обработчики событий
    setupEventListeners();
    
    // Добавляем защиту от потери данных при выходе
    setupExitProtection();
    
    // Запускаем синхронизацию данных
    startDataSync();
    
    // Добавляем обработчики для автоматического сохранения приза при закрытии
    setupAppCloseHandlers();
    
    // Периодическое сохранение состояния выбора приза
    setInterval(savePrizeState, 5000); // Каждые 5 секунд
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики для кейсов
    document.querySelectorAll('.case-item').forEach(item => {
        item.addEventListener('click', function() {
            const caseType = this.dataset.case;
            const price = parseInt(this.dataset.price);
            openCase(caseType, price);
        });
    });
    
    // Обработчики для вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Убрали обработчик закрытия модального окна - теперь можно только выбрать действие
    
    // Обработчик для кнопки "Добавить в инвентарь"
    document.getElementById('add-to-inventory-btn').addEventListener('click', function() {
        addToInventory();
    });
    
    // Обработчик для кнопки "Забрать приз"
    document.getElementById('claim-prize-btn').addEventListener('click', function() {
        claimPrize();
    });
}

// Глобальная переменная для хранения цены текущего кейса
let currentCasePrice = 0;

// Глобальная переменная для хранения текущего приза
let currentPrize = null;

// Флаг, что пользователь находится в процессе выбора приза
let isChoosingPrize = false;

// Флаг, что приз уже был автоматически добавлен
let prizeAutoAdded = false;

// Флаг, что звезды уже потрачены и не должны возвращаться
let starsSpent = false;

// Переключение вкладок
function switchTab(tabName) {
    // Убираем активный класс со всех вкладок и панелей
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Активируем выбранную вкладку и панель
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Если переключаемся на инвентарь, обновляем его отображение
    if (tabName === 'inventory') {
        updateInventoryDisplay();
    }
}

// Открытие кейса с атомарными транзакциями
async function openCase(caseType, price) {
    if (isOpening) return;
    
    // Проверяем баланс
    if (userStars < price) {
        showNotification('Недостаточно звезд!', 'error');
        return;
    }
    
    console.log(`🎰 ОТКРЫТИЕ КЕЙСА: ${caseType}, цена: ${price} звезд`);
    console.log(`💰 Баланс ДО: ${userStars} звезд`);
    
    // Специальное логирование для алмазного кейса
    if (caseType === 'diamond') {
        console.log('💎 АЛМАЗНЫЙ КЕЙС - ОСОБОЕ ЛОГИРОВАНИЕ');
        console.log('💎 Проверяем состояние localStorage перед открытием:');
        console.log('💎 pendingPrize:', localStorage.getItem('pendingPrize'));
        console.log('💎 starsSpent:', localStorage.getItem('starsSpent'));
        console.log('💎 prizeProcessed:', localStorage.getItem('prizeProcessed'));
    }
    
    isOpening = true;
    currentCasePrice = price;
    
    // Сбрасываем флаги
    prizeAutoAdded = false;
    starsSpent = false;
    
    // Сохраняем оригинальное состояние для возможного отката
    const originalStars = userStars;
    const originalInventory = [...userInventory];
    
    try {
        // 1. Генерируем приз СНАЧАЛА (до списания денег)
        console.log('🎁 Генерируем приз перед списанием денег...');
        const prize = generatePrize(caseType);
        currentPrize = prize;
        console.log('🎁 Приз сгенерирован:', prize);
        
        // 2. Сохраняем состояние в localStorage для отслеживания (БЕЗ списания денег)
        localStorage.setItem('pendingPrize', JSON.stringify({
            prize: prize,
            caseType: caseType,
            price: price,
            timestamp: Date.now(),
            originalStars: originalStars
        }));
        
        console.log('💾 Состояние сохранено в localStorage (деньги НЕ списаны)');
        
        // 3. Показываем анимацию открытия кейса
        await showCaseOpeningAnimation(caseType);
        
        // 4. ТОЛЬКО ПОСЛЕ успешного завершения анимации списываем деньги
        console.log('💰 Списываем звезды ПОСЛЕ завершения анимации...');
        userStars -= price;
        starsSpent = true;
        updateStarsDisplay();
        
        console.log(`💰 Баланс ПОСЛЕ списания: ${userStars} звезд`);
        
        // 5. Добавляем приз в инвентарь
        userInventory.push(prize);
        prizeAutoAdded = true;
        updateInventoryDisplay();
        
        console.log('🎁 Приз добавлен в инвентарь:', prize);
        
        // 6. Сохраняем состояние о потраченных звездах
        localStorage.setItem('starsSpent', JSON.stringify({
            spent: true,
            amount: price,
            timestamp: Date.now(),
            originalStars: originalStars,
            prize: prize
        }));
        
        // 7. Сохраняем ВСЕ данные на сервер
        console.log('💾 Сохраняем данные на сервер...');
        const userId = getUserId();
        console.log('🆔 UserId для сохранения:', userId);
        
        try {
            await saveCaseOpening(userId, caseType, price, prize);
            console.log(`✅ Данные сохранены на сервер через безопасный эндпоинт: ${userStars} звезд, приз добавлен`);
        } catch (error) {
            console.warn('⚠️ Безопасный эндпоинт не работает, используем fallback:', error);
            // Fallback: используем старый метод сохранения
            await saveUserData();
            console.log(`✅ Данные сохранены на сервер через fallback: ${userStars} звезд, приз добавлен`);
        }
        
        // 8. Показываем приз
        showPrize(prize);
        
        // 9. Очищаем флаги после успешного завершения
        localStorage.removeItem('starsSpent');
        localStorage.removeItem('pendingPrize');
        localStorage.removeItem('prizeProcessed');
        
        isOpening = false;
        
        // 9. Показываем модальное окно с призом
        setTimeout(() => {
            // Восстанавливаем интерфейс
            document.body.classList.remove('case-opening');
            const openingArea = document.getElementById('opening-area');
            openingArea.classList.remove('fullscreen');
            openingArea.style.display = 'none';
            
            // Скрываем кнопку выхода
            const exitBtn = document.getElementById('exit-fullscreen-btn');
            exitBtn.style.display = 'none';
            
            // Сбрасываем полоску призов
            const prizeStrip = document.getElementById('prize-strip');
            prizeStrip.innerHTML = '';
            prizeStrip.className = 'prize-strip';
            
            // Скрываем показ приза
            const prizeReveal = document.getElementById('prize-reveal');
            prizeReveal.classList.remove('show');
            
            // Очищаем эффекты редкости
            const rarityEffects = prizeReveal.querySelectorAll('.rarity-effect');
            rarityEffects.forEach(effect => effect.remove());
            
            // Сбрасываем лучи света
            const lightRays = document.querySelector('.light-rays');
            if (lightRays) {
                lightRays.classList.remove('active');
                lightRays.style.animationDuration = '';
            }
            
            // Очищаем частицы
            const particlesContainer = document.getElementById('particles-container');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
            }
            
            // Показываем модальное окно
            const rarity = determinePrizeRarity(prize);
            showPrizeModal(prize, rarity);
        }, 0);
        
    } catch (error) {
        console.error('❌ ОШИБКА ОТКРЫТИЯ КЕЙСА:', error);
        
        // ОТКАТ ТРАНЗАКЦИИ - восстанавливаем исходное состояние
        console.log('🔄 ОТКАТ: Восстанавливаем исходное состояние...');
        
        userStars = originalStars;
        userInventory = originalInventory;
        currentPrize = null;
        isOpening = false;
        prizeAutoAdded = false;
        starsSpent = false;
        
        // Обновляем отображение
        updateStarsDisplay();
        updateInventoryDisplay();
        
        // Очищаем localStorage
        localStorage.removeItem('starsSpent');
        localStorage.removeItem('pendingPrize');
        localStorage.removeItem('prizeProcessed');
        
        // Показываем ошибку пользователю
        showNotification('Ошибка открытия кейса! Деньги возвращены.', 'error');
        
        // Восстанавливаем интерфейс
        document.body.classList.remove('case-opening');
        const openingArea = document.getElementById('opening-area');
        if (openingArea) {
            openingArea.classList.remove('fullscreen');
            openingArea.style.display = 'none';
        }
        
        throw error; // Пробрасываем ошибку дальше
    }
}

// Анимация открытия кейса в стиле CS2
async function showCaseOpeningAnimation(caseType) {
    const openingArea = document.getElementById('opening-area');
    const lightRays = document.querySelector('.light-rays');
    const particlesContainer = document.getElementById('particles-container');
    const explosionEffect = document.getElementById('explosion-effect');
    const lightFlash = document.getElementById('light-flash');
    const smokeEffect = document.getElementById('smoke-effect');
    
    // Проверяем, мобильное ли устройство
    const isMobile = window.innerWidth <= 768 || document.body.classList.contains('mobile-device');
    
    // Активируем полноэкранный режим
    document.body.classList.add('case-opening');
    openingArea.classList.add('fullscreen');
    
    // Упрощаем анимацию для мобильных устройств
    if (isMobile) {
        // Отключаем сложные эффекты на мобильных
        if (lightRays) lightRays.style.display = 'none';
        if (particlesContainer) particlesContainer.style.display = 'none';
        if (smokeEffect) smokeEffect.style.display = 'none';
    }
    openingArea.style.display = 'block';
    
    // Показываем кнопку выхода
    const exitBtn = document.getElementById('exit-fullscreen-btn');
    exitBtn.style.display = 'block';
    
    // Фаза 1: Подготовка (1 секунда)
    lightRays.classList.add('active');
    createParticles(particlesContainer, 30);
    showSoundEffect('🔊 Подготовка к открытию...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Фаза 2: Запуск CS2 анимации
    const winningPrize = await startCS2PrizeAnimation(caseType);
    
    // Фаза 3: Эффекты при открытии
    explosionEffect.classList.add('active');
    lightFlash.classList.add('active');
    smokeEffect.classList.add('active');
    showSoundEffect('💥💥💥 ВЗРЫВ! Кейс открывается!');
    
    // Создаем финальные частицы
    createParticles(particlesContainer, 100);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Скрываем эффекты
    explosionEffect.classList.remove('active');
    lightFlash.classList.remove('active');
    smokeEffect.classList.remove('active');
    lightRays.classList.remove('active');
    
    // Возвращаем выигрышный приз
    return winningPrize;
}

// Новая функция для CS2 анимации прокрутки призов
async function startCS2PrizeAnimation(caseType) {
    const prizeStrip = document.getElementById('prize-strip');
    const config = caseConfig[caseType];
    const prizes = config.prizes;
    
    // Проверяем, мобильное ли устройство
    const isMobile = window.innerWidth <= 768 || document.body.classList.contains('mobile-device');
    
    // Очищаем полоску
    prizeStrip.innerHTML = '';
    
    // Создаем массив призов для анимации (много повторений для плавной прокрутки)
    const animationPrizes = [];
    // Уменьшаем количество призов на мобильных для лучшей производительности
    const totalPrizes = isMobile ? 30 : 50;
    
    for (let i = 0; i < totalPrizes; i++) {
        // Случайно выбираем приз из доступных
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
        animationPrizes.push({ ...randomPrize, id: `anim_${i}` });
    }
    
    // Определяем выигрышный приз (последний в списке)
    const winningPrize = getRandomPrize(caseType);
    animationPrizes[animationPrizes.length - 1] = winningPrize;
    
    // Создаем элементы призов
    animationPrizes.forEach((prize, index) => {
        const prizeElement = createPrizeElement(prize, index);
        prizeStrip.appendChild(prizeElement);
    });
    
    // Запускаем анимацию прокрутки
    prizeStrip.classList.add('scrolling');
    showSoundEffect('🎰 Призы крутятся...');
    
    // Уменьшаем время анимации на мобильных устройствах
    const scrollTime = isMobile ? 1500 : 2000;
    const slowTime = isMobile ? 1500 : 2000;
    
    // Прокручиваем
    await new Promise(resolve => setTimeout(resolve, scrollTime));
    
    // Замедляем анимацию
    prizeStrip.classList.remove('scrolling');
    prizeStrip.classList.add('slowing');
    showSoundEffect('⏳ Замедление...');
    
    // Ждем завершения замедления
    await new Promise(resolve => setTimeout(resolve, slowTime));
    
    // Останавливаем на выигрышном призе
    const winningElement = prizeStrip.children[prizeStrip.children.length - 1];
    winningElement.classList.add('selected');
    showSoundEffect('🎯 Остановка на призе!');
    
    // Эффект взрыва для выигрышного приза
    await new Promise(resolve => setTimeout(resolve, 500));
    winningElement.classList.add('winner');
    showSoundEffect('💥 ПОБЕДА!');
    
    // Возвращаем выигрышный приз для дальнейшего использования
    return winningPrize;
}

// Создание элемента приза для анимации
function createPrizeElement(prize, index) {
    const prizeElement = document.createElement('div');
    prizeElement.className = `prize-item ${prize.rarity || 'common'}`;
    prizeElement.dataset.prizeId = prize.id;
    prizeElement.dataset.prizeIndex = index;
    
    const iconElement = document.createElement('div');
    iconElement.className = 'prize-item-icon';
    iconElement.textContent = prize.icon;
    
    const nameElement = document.createElement('div');
    nameElement.className = 'prize-item-name';
    nameElement.textContent = prize.name;
    
    prizeElement.appendChild(iconElement);
    prizeElement.appendChild(nameElement);
    
    return prizeElement;
}


// Создание частиц
function createParticles(container, count) {
    // Очищаем предыдущие частицы
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Случайная позиция
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        // Случайный размер
        const size = Math.random() * 6 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        // Случайный цвет
        const colors = ['#ffd700', '#ffb347', '#ff8c00', '#ff6b35', '#f7931e'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        // Случайная анимация
        const animationDuration = Math.random() * 2 + 1;
        const animationDelay = Math.random() * 0.5;
        
        particle.style.animation = `particleFloat ${animationDuration}s ease-out ${animationDelay}s forwards`;
        
        container.appendChild(particle);
    }
}

// Добавляем CSS анимацию для частиц
const particleStyle = document.createElement('style');
particleStyle.textContent = `
    @keyframes particleFloat {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
        }
        50% {
            opacity: 0.8;
            transform: translateY(-50px) scale(1.2) rotate(180deg);
        }
        100% {
            opacity: 0;
            transform: translateY(-100px) scale(0) rotate(360deg);
        }
    }
`;
document.head.appendChild(particleStyle);

// Функция для показа звуковых эффектов (визуальных)
function showSoundEffect(text) {
    // Создаем элемент для звукового эффекта
    const soundEffect = document.createElement('div');
    soundEffect.className = 'sound-effect';
    soundEffect.textContent = text;
    
    // Добавляем стили
    soundEffect.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: #ffd700;
        padding: 1rem 2rem;
        border-radius: 25px;
        font-size: 1.2rem;
        font-weight: bold;
        z-index: 2000;
        text-align: center;
        border: 2px solid #ffd700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        animation: soundEffectAppear 0.5s ease-out forwards;
        pointer-events: none;
    `;
    
    // Добавляем CSS анимацию
    const soundStyle = document.createElement('style');
    soundStyle.textContent = `
        @keyframes soundEffectAppear {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
            }
            50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1);
            }
        }
    `;
    document.head.appendChild(soundStyle);
    
    document.body.appendChild(soundEffect);
    
    // Удаляем через 1.5 секунды
    setTimeout(() => {
        if (soundEffect.parentNode) {
            soundEffect.parentNode.removeChild(soundEffect);
        }
    }, 1500);
}

// Генерация приза для открытия кейса (обертка над getRandomPrize)
function generatePrize(caseType) {
    console.log(`🎁 ГЕНЕРАЦИЯ ПРИЗА: ${caseType}`);
    const prize = getRandomPrize(caseType);
    console.log(`🎁 Сгенерирован приз:`, prize);
    return prize;
}

// Получение случайного приза с учетом редкости
function getRandomPrize(caseType) {
    const config = caseConfig[caseType];
    const prizes = config.prizes;
    
    // Система вероятностей на основе редкости
    const random = Math.random();
    let prize;
    
    // Фильтруем призы по редкости
    const commonPrizes = prizes.filter(p => p.rarity === 'common');
    const rarePrizes = prizes.filter(p => p.rarity === 'rare');
    const epicPrizes = prizes.filter(p => p.rarity === 'epic');
    const legendaryPrizes = prizes.filter(p => p.rarity === 'legendary');
    
    if (random < 0.02 && legendaryPrizes.length > 0) {
        // 2% шанс на легендарный приз
        prize = legendaryPrizes[Math.floor(Math.random() * legendaryPrizes.length)];
    } else if (random < 0.08 && epicPrizes.length > 0) {
        // 6% шанс на эпический приз
        prize = epicPrizes[Math.floor(Math.random() * epicPrizes.length)];
    } else if (random < 0.25 && rarePrizes.length > 0) {
        // 17% шанс на редкий приз
        prize = rarePrizes[Math.floor(Math.random() * rarePrizes.length)];
    } else {
        // 75% шанс на обычный приз
        prize = commonPrizes[Math.floor(Math.random() * commonPrizes.length)];
    }
    
    // Если не нашли приз нужной редкости, берем случайный
    if (!prize) {
        prize = prizes[Math.floor(Math.random() * prizes.length)];
    }
    
    // Создаем копию приза
    prize = { ...prize };
    
    // Добавляем уникальный ID
    prize.id = Date.now() + Math.random();
    prize.claimed = false;
    
    return prize;
}

// Показ приза с красивой анимацией
function showPrize(prize) {
    const prizeReveal = document.getElementById('prize-reveal');
    const prizeIcon = document.getElementById('prize-icon');
    const prizeName = document.getElementById('prize-name');
    const prizeDescription = document.getElementById('prize-description');
    const prizeRarity = document.getElementById('prize-rarity');
    
    // Определяем редкость приза
    const rarity = determinePrizeRarity(prize);
    
    // Заполняем данные приза
    prizeIcon.textContent = prize.icon;
    prizeName.textContent = prize.name;
    prizeDescription.textContent = prize.description;
    prizeRarity.textContent = rarity.name;
    prizeRarity.className = `prize-rarity ${rarity.class}`;
    
    // Добавляем эффекты в зависимости от редкости
    addRarityEffects(prizeReveal, rarity);
    
    // Показываем анимацию появления
    setTimeout(() => {
        prizeReveal.classList.add('show');
        
        // Показываем звуковой эффект в зависимости от редкости
        if (rarity.class === 'legendary') {
            showSoundEffect('🌟✨ ЛЕГЕНДАРНЫЙ ПРИЗ! ✨🌟');
        } else if (rarity.class === 'epic') {
            showSoundEffect('💜 ЭПИЧЕСКИЙ ПРИЗ! 💜');
        } else if (rarity.class === 'rare') {
            showSoundEffect('💙 РЕДКИЙ ПРИЗ! 💙');
        } else {
            showSoundEffect('🎁 Обычный приз! 🎁');
        }
    }, 500);
    
    // Модальное окно теперь показывается отдельно в функции openCase
}

// Определение редкости приза
function determinePrizeRarity(prize) {
    // Используем поле rarity из конфигурации приза
    const rarityMap = {
        'common': { name: 'Обычный', class: 'common' },
        'rare': { name: 'Редкий', class: 'rare' },
        'epic': { name: 'Эпический', class: 'epic' },
        'legendary': { name: 'Легендарный', class: 'legendary' }
    };
    
    return rarityMap[prize.rarity] || { name: 'Обычный', class: 'common' };
}

// Добавление эффектов в зависимости от редкости
function addRarityEffects(container, rarity) {
    // Убираем предыдущие эффекты
    container.querySelectorAll('.rarity-effect').forEach(effect => effect.remove());
    
    if (rarity.class === 'legendary') {
        // Эффект для легендарных предметов
        const legendaryEffect = document.createElement('div');
        legendaryEffect.className = 'rarity-effect legendary-particles';
        legendaryEffect.innerHTML = `
            <div class="legendary-ring"></div>
            <div class="legendary-sparkles"></div>
        `;
        container.appendChild(legendaryEffect);
        
        // Добавляем CSS для легендарных эффектов
        addLegendaryStyles();
    } else if (rarity.class === 'epic') {
        // Эффект для эпических предметов
        const epicEffect = document.createElement('div');
        epicEffect.className = 'rarity-effect epic-glow';
        container.appendChild(epicEffect);
    }
}

// Добавление стилей для легендарных эффектов
function addLegendaryStyles() {
    if (document.getElementById('legendary-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'legendary-styles';
    style.textContent = `
        .legendary-particles {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: -1;
        }
        
        .legendary-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 200px;
            height: 200px;
            border: 3px solid #f39c12;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: legendaryRing 2s ease-in-out infinite;
        }
        
        .legendary-sparkles {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100px;
            height: 100px;
            transform: translate(-50%, -50%);
        }
        
        .legendary-sparkles::before,
        .legendary-sparkles::after {
            content: '';
            position: absolute;
            width: 4px;
            height: 4px;
            background: #f39c12;
            border-radius: 50%;
            animation: legendarySparkle 1s ease-in-out infinite;
        }
        
        .legendary-sparkles::before {
            top: 20px;
            left: 20px;
            animation-delay: 0s;
        }
        
        .legendary-sparkles::after {
            bottom: 20px;
            right: 20px;
            animation-delay: 0.5s;
        }
        
        @keyframes legendaryRing {
            0%, 100% { 
                transform: translate(-50%, -50%) scale(1) rotate(0deg);
                opacity: 0.7;
            }
            50% { 
                transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                opacity: 1;
            }
        }
        
        @keyframes legendarySparkle {
            0%, 100% { 
                opacity: 0;
                transform: scale(0);
            }
            50% { 
                opacity: 1;
                transform: scale(1);
            }
        }
        
        .epic-glow {
            position: absolute;
            top: -20px;
            left: -20px;
            right: -20px;
            bottom: -20px;
            background: radial-gradient(circle, rgba(155, 89, 182, 0.3) 0%, transparent 70%);
            border-radius: 50%;
            animation: epicPulse 1.5s ease-in-out infinite;
            z-index: -1;
        }
        
        @keyframes epicPulse {
            0%, 100% { 
                transform: scale(1);
                opacity: 0.3;
            }
            50% { 
                transform: scale(1.1);
                opacity: 0.6;
            }
        }
    `;
    document.head.appendChild(style);
}

// Показ модального окна с призом
function showPrizeModal(prize, rarity) {
    const modal = document.getElementById('prize-modal');
    const modalPrizeIcon = document.getElementById('modal-prize-icon');
    const modalPrizeName = document.getElementById('modal-prize-name');
    const modalPrizeDescription = document.getElementById('modal-prize-description');
    
    // Заполняем данные
    modalPrizeIcon.textContent = prize.icon;
    modalPrizeName.textContent = prize.name;
    modalPrizeDescription.textContent = prize.description;
    
    // Добавляем информацию о редкости
    if (rarity) {
        const rarityElement = document.createElement('div');
        rarityElement.className = `prize-rarity ${rarity.class}`;
        rarityElement.textContent = rarity.name;
        rarityElement.style.marginTop = '1rem';
        modalPrizeDescription.parentNode.insertBefore(rarityElement, modalPrizeDescription.nextSibling);
    }
    
    // Сохраняем приз для кнопки "Забрать"
    modal.dataset.prize = JSON.stringify(prize);
    
    // Добавляем эффекты в зависимости от редкости
    if (rarity && rarity.class === 'legendary') {
        modal.classList.add('legendary-modal');
    } else if (rarity && rarity.class === 'epic') {
        modal.classList.add('epic-modal');
    }
    
    // Предотвращаем закрытие модального окна при клике на фон
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    // Устанавливаем флаг выбора приза
    isChoosingPrize = true;
    
    // Сохраняем состояние в localStorage
    savePrizeState();
    
    // Показываем модальное окно с анимацией
    modal.classList.add('show');
    
    // Добавляем эффект появления
    setTimeout(() => {
        modal.classList.add('modal-appear');
    }, 0);
}

// Закрытие модального окна
function closePrizeModal() {
    const modal = document.getElementById('prize-modal');
    
    // Убираем эффекты редкости
    modal.classList.remove('legendary-modal', 'epic-modal', 'modal-appear');
    
    // Убираем элементы редкости из модального окна
    const rarityElements = modal.querySelectorAll('.prize-rarity');
    rarityElements.forEach(element => element.remove());
    
    modal.classList.remove('show');
    
    // Восстанавливаем интерфейс
    document.body.classList.remove('case-opening');
    
    // Скрываем область анимации
    const openingArea = document.getElementById('opening-area');
    openingArea.classList.remove('fullscreen');
    openingArea.style.display = 'none';
    
    // Скрываем кнопку выхода
    const exitBtn = document.getElementById('exit-fullscreen-btn');
    exitBtn.style.display = 'none';
    
    // Сбрасываем анимацию кейса
    const caseBox = document.getElementById('case-box');
    caseBox.className = 'case-box';
    caseBox.style.animation = '';
    
    // Сбрасываем стили кейса
    const caseLid = caseBox.querySelector('.case-lid');
    const caseBody = caseBox.querySelector('.case-body');
    if (caseLid) caseLid.style.transform = '';
    if (caseLid) caseLid.style.background = '';
    if (caseBody) caseBody.style.background = '';
    
    // Скрываем показ приза
    const prizeReveal = document.getElementById('prize-reveal');
    prizeReveal.classList.remove('show');
    
    // Очищаем эффекты редкости
    const rarityEffects = prizeReveal.querySelectorAll('.rarity-effect');
    rarityEffects.forEach(effect => effect.remove());
    
    // Сбрасываем лучи света
    const lightRays = document.querySelector('.light-rays');
    if (lightRays) {
        lightRays.classList.remove('active');
        lightRays.style.animationDuration = '';
    }
    
    // Очищаем частицы
    const particlesContainer = document.getElementById('particles-container');
    if (particlesContainer) {
        particlesContainer.innerHTML = '';
    }
    
    // Сбрасываем текущий приз
    currentPrize = null;
}

// Настройка обработчиков закрытия приложения
function setupAppCloseHandlers() {
    // Обработчик закрытия вкладки/окна
    window.addEventListener('beforeunload', function(e) {
        console.log('🚪 BEFOREUNLOAD событие');
        autoAddPrizeToInventory();
    });
    
    // Обработчик скрытия страницы (для мобильных устройств)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('👁️ VISIBILITY CHANGE (скрыто)');
            autoAddPrizeToInventory();
        }
    });
    
    // Обработчик потери фокуса
    window.addEventListener('blur', function() {
        console.log('🔍 BLUR событие');
        autoAddPrizeToInventory();
    });
    
    // Обработчик для Telegram WebApp
    if (tg && tg.onEvent) {
        tg.onEvent('viewportChanged', function() {
            console.log('📱 TELEGRAM VIEWPORT CHANGED');
            autoAddPrizeToInventory();
        });
    }
}

// Автоматическое добавление приза в инвентарь при закрытии приложения
async function autoAddPrizeToInventory() {
    // Дополнительная защита: не срабатываем при загрузке приложения
    if (isChoosingPrize && currentPrize && !prizeAutoAdded) {
        console.log('🔴 АВТОМАТИЧЕСКОЕ ДОБАВЛЕНИЕ ПРИЗА:');
        console.log('- Приз:', currentPrize);
        console.log('- Текущие звезды ДО:', userStars);
        console.log('- Цена кейса:', currentCasePrice);
        
        // Проверяем, не добавлен ли уже приз в инвентарь (только по ID)
        const prizeAlreadyAdded = userInventory.some(item => 
            item.id === currentPrize.id
        );
        
        if (!prizeAlreadyAdded) {
            // Проверяем, что приз получен законно
            if (!validatePrizeClaim(currentPrize, currentCasePrice)) {
                console.log('❌ AUTO_ADD: Приз отклонен из-за отсутствия подтверждения трат');
                return;
            }
            
            // Устанавливаем флаг, что приз уже добавлен
            prizeAutoAdded = true;
            
            console.log(`🎁 AUTO_ADD: Автоматически добавляем приз ${currentPrize.name} в инвентарь`);
            console.log(`💰 AUTO_ADD: Звезды уже списаны ранее, не списываем повторно`);
            
            // Добавляем приз в инвентарь
            userInventory.push(currentPrize);
            
            // СРАЗУ сохраняем данные на сервер
            await saveUserData();
            
            console.log('✅ Приз автоматически добавлен в инвентарь');
        } else {
            console.log('⚠️ Приз уже добавлен в инвентарь, пропускаем');
        }
        
        // Сбрасываем флаги
        isChoosingPrize = false;
        currentPrize = null;
        currentCasePrice = 0; // Сбрасываем цену кейса
        
        // Очищаем localStorage
        localStorage.removeItem('pendingPrize');
        
        console.log('- Звезды ПОСЛЕ:', userStars);
        
        // Дополнительная защита: принудительно обновляем отображение звезд
        updateStarsDisplay();
    }
}

// Сохранение состояния выбора приза в localStorage
function savePrizeState() {
    if (isChoosingPrize && currentPrize) {
        localStorage.setItem('pendingPrize', JSON.stringify({
            prize: currentPrize,
            timestamp: Date.now()
        }));
    } else {
        localStorage.removeItem('pendingPrize');
    }
}


// Восстановление состояния выбора приза из localStorage
async function restorePrizeState() {
    try {
        const savedState = localStorage.getItem('pendingPrize');
        if (savedState) {
            const state = JSON.parse(savedState);
            
            // Проверяем, не был ли уже обработан этот приз
            const processedPrize = localStorage.getItem('prizeProcessed');
            if (processedPrize) {
                try {
                    const processed = JSON.parse(processedPrize);
                    if (processed.prizeId === state.prize.id) {
                        console.log('Приз уже был обработан ранее, пропускаем восстановление');
                        localStorage.removeItem('pendingPrize');
                        return false;
                    }
                } catch (e) {
                    // Игнорируем ошибки парсинга
                }
            }
            
            // Проверяем, что прошло не более 5 минут
            if (Date.now() - state.timestamp < 300000) {
                console.log('🔄 ВОССТАНОВЛЕНИЕ ПРИЗА:', state.prize);
                console.log(`🎁 Тип приза: ${state.prize.type}, название: ${state.prize.name}`);
                
                // Специальное логирование для алмазного кейса
                if (state.prize.type === 'premium' || state.prize.name.includes('Алмазный') || state.prize.name.includes('Premium')) {
                    console.log('💎 АЛМАЗНЫЙ ПРИЗ - ОСОБОЕ ЛОГИРОВАНИЕ');
                    console.log('💎 Текущий баланс перед восстановлением:', userStars);
                    console.log('💎 Состояние starsSpent:', starsSpent);
                    console.log('💎 Текущий инвентарь:', userInventory.length, 'предметов');
                }
                
                // ВАЖНО: Проверяем, были ли уже потрачены звезды
                // Если приз есть в localStorage, значит звезды уже потрачены
                // и приз должен быть добавлен в инвентарь автоматически
                console.log('💎 Приз найден в localStorage - звезды уже потрачены, добавляем в инвентарь');
                
                // НЕ загружаем данные с сервера - используем локальные данные
                // чтобы не перезаписать потраченные звезды
                console.log('Используем локальные данные, НЕ загружаем с сервера');
                
                // Проверяем, не добавлен ли уже приз в инвентарь (только по ID)
                const prizeAlreadyAdded = userInventory.some(item => 
                    item.id === state.prize.id
                );
                
                if (!prizeAlreadyAdded) {
                    // Для восстановленных призов проверяем, что есть запись о потраченных звездах
                    const starsSpent = localStorage.getItem('starsSpent');
                    if (!starsSpent) {
                        console.log('❌ RESTORE_PRIZE: Нет записи о потраченных звездах - приз не восстанавливаем');
                        return;
                    }
                    
                    console.log(`🎁 RESTORE_PRIZE: Восстанавливаем приз ${state.prize.name} из localStorage`);
                    console.log(`💰 RESTORE_PRIZE: Звезды уже были потрачены ранее, не списываем повторно`);
                    
                    userInventory.push(state.prize);
                    // СРАЗУ сохраняем на сервер, чтобы данные синхронизировались
                    await saveUserData();
                    console.log('✅ Приз добавлен в инвентарь и сохранен на сервер');
                    
                    // Помечаем приз как обработанный в localStorage
                    localStorage.setItem('prizeProcessed', JSON.stringify({
                        prizeId: state.prize.id,
                        timestamp: Date.now()
                    }));
                } else {
                    console.log('Приз уже добавлен в инвентарь, пропускаем');
                }
                
                localStorage.removeItem('pendingPrize');
                return true;
            } else {
                // Время истекло, добавляем приз автоматически
                console.log('Время выбора приза истекло, добавляем автоматически');
                
                // НЕ загружаем данные с сервера - используем локальные данные
                console.log('Используем локальные данные, НЕ загружаем с сервера (время истекло)');
                
                // Проверяем, не добавлен ли уже приз в инвентарь (только по ID)
                const prizeAlreadyAdded = userInventory.some(item => 
                    item.id === state.prize.id
                );
                
                if (!prizeAlreadyAdded) {
                    // Для восстановленных призов проверяем, что есть запись о потраченных звездах
                    const starsSpent = localStorage.getItem('starsSpent');
                    if (!starsSpent) {
                        console.log('❌ RESTORE_PRIZE_TIMEOUT: Нет записи о потраченных звездах - приз не восстанавливаем');
                        return;
                    }
                    
                    console.log(`🎁 RESTORE_PRIZE_TIMEOUT: Восстанавливаем приз ${state.prize.name} из localStorage (время истекло)`);
                    console.log(`💰 RESTORE_PRIZE_TIMEOUT: Звезды уже были потрачены ранее, не списываем повторно`);
                    
                    userInventory.push(state.prize);
                    // СРАЗУ сохраняем на сервер, чтобы данные синхронизировались
                    await saveUserData();
                    console.log('✅ Приз добавлен в инвентарь и сохранен на сервер (время истекло)');
                    
                    // Помечаем приз как обработанный в localStorage
                    localStorage.setItem('prizeProcessed', JSON.stringify({
                        prizeId: state.prize.id,
                        timestamp: Date.now()
                    }));
                } else {
                    console.log('Приз уже добавлен в инвентарь, пропускаем');
                }
                
                // НЕ возвращаем звезды - они уже потрачены
                localStorage.removeItem('pendingPrize');
            }
        }
    } catch (error) {
        console.error('Ошибка при восстановлении состояния приза:', error);
        localStorage.removeItem('pendingPrize');
    }
    return false;
}

// Добавить в инвентарь
function addToInventory() {
    if (!currentPrize) {
        showNotification('Нет приза для добавления', 'error');
        return;
    }
    
    // Проверяем, что приз получен законно
    if (!validatePrizeClaim(currentPrize, currentCasePrice)) {
        showNotification('Приз не может быть добавлен - нет подтверждения трат!', 'error');
        console.log('❌ ADD_TO_INVENTORY: Приз отклонен из-за отсутствия подтверждения трат');
        return;
    }
    
    // Проверяем, не добавлен ли уже приз в инвентарь (только по ID)
    const prizeAlreadyAdded = userInventory.some(item => 
        item.id === currentPrize.id
    );
    
    if (prizeAlreadyAdded) {
        showNotification('Приз уже добавлен в инвентарь!', 'info');
        console.log('ℹ️ ADD_TO_INVENTORY: Приз уже в инвентаре, не добавляем повторно');
        
        // Закрываем модальное окно приза
        closePrizeModal();
        
        // Сбрасываем флаги
        isChoosingPrize = false;
        prizeAutoAdded = false;
        currentCasePrice = 0;
        currentPrize = null;
        
        return;
    }
    
    console.log(`🎁 ADD_TO_INVENTORY: Добавляем приз ${currentPrize.name} в инвентарь`);
    console.log(`💰 ADD_TO_INVENTORY: Звезды уже списаны ранее, не списываем повторно`);
    
    // Добавляем приз в инвентарь
    userInventory.push(currentPrize);
    
    // Сохраняем данные
    saveUserData();
    
    // Обновляем отображение инвентаря
    updateInventoryDisplay();
    
    // Показываем уведомление
    showNotification('Приз добавлен в инвентарь!', 'success');
    
    // Сбрасываем флаги
    isChoosingPrize = false;
    prizeAutoAdded = false;
    currentCasePrice = 0; // Сбрасываем цену кейса
    
    // Очищаем состояние "звезды потрачены" из localStorage
    localStorage.removeItem('starsSpent');
    
    // Очищаем флаг "обработанный приз"
    localStorage.removeItem('prizeProcessed');
    
    // Принудительно сохраняем данные еще раз после очистки флагов
    // чтобы убедиться, что серверная база данных синхронизирована
    setTimeout(async () => {
        console.log('💾 ПРИНУДИТЕЛЬНОЕ СОХРАНЕНИЕ после очистки флагов');
        console.log('💾 Текущий баланс:', userStars);
        console.log('💾 Количество предметов в инвентаре:', userInventory.length);
        await saveUserData();
        console.log('💾 Данные принудительно сохранены на сервер');
    }, 1000);
    
    // Закрываем модальное окно
    closePrizeModal();
    
    // Переключаемся на вкладку инвентаря
    switchTab('inventory');
}

// Забрать приз
async function claimPrize() {
    if (!currentPrize) {
        showNotification('Нет приза для получения', 'error');
        return;
    }
    
    try {
        // Отправляем запрос на сервер для обработки приза
        const response = await fetch('/api/prize/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUserId,
                prize: currentPrize
            })
        });
        
        if (response.ok) {
            // Проверяем, что приз получен законно
            if (!validatePrizeClaim(currentPrize, currentCasePrice)) {
                showNotification('Приз не может быть получен - нет подтверждения трат!', 'error');
                console.log('❌ CLAIM_PRIZE: Приз отклонен из-за отсутствия подтверждения трат');
                return;
            }
            
            // Проверяем, не добавлен ли уже приз в инвентарь (только по ID)
            const prizeAlreadyAdded = userInventory.some(item => 
                item.id === currentPrize.id
            );
            
            if (prizeAlreadyAdded) {
                showNotification('Приз уже получен!', 'info');
                console.log('ℹ️ CLAIM_PRIZE: Приз уже в инвентаре, не добавляем повторно');
                
                // Закрываем модальное окно приза
                closePrizeModal();
                
                // Сбрасываем флаги
                isChoosingPrize = false;
                prizeAutoAdded = false;
                currentCasePrice = 0;
                currentPrize = null;
                
                return;
            }
            
            // Отмечаем приз как полученный
            currentPrize.claimed = true;
            
            console.log(`🎁 CLAIM_PRIZE: Добавляем приз ${currentPrize.name} в инвентарь`);
            console.log(`💰 CLAIM_PRIZE: Звезды уже списаны ранее, не списываем повторно`);
            
            // Добавляем в инвентарь
            userInventory.push(currentPrize);
            
            // Сохраняем данные
            saveUserData();
            
            // Обновляем инвентарь
            updateInventoryDisplay();
            
            // Показываем уведомление
            showNotification('Приз получен!', 'success');
            
            // Сбрасываем флаги
            isChoosingPrize = false;
            prizeAutoAdded = false;
            currentCasePrice = 0; // Сбрасываем цену кейса
            
            // Очищаем состояние "звезды потрачены" из localStorage
            localStorage.removeItem('starsSpent');
            
            // Очищаем флаг "обработанный приз"
            localStorage.removeItem('prizeProcessed');
            
            // Принудительно сохраняем данные еще раз после очистки флагов
            // чтобы убедиться, что серверная база данных синхронизирована
            setTimeout(async () => {
                console.log('💾 ПРИНУДИТЕЛЬНОЕ СОХРАНЕНИЕ после очистки флагов (claimPrize)');
                console.log('💾 Текущий баланс:', userStars);
                console.log('💾 Количество предметов в инвентаре:', userInventory.length);
                await saveUserData();
                console.log('💾 Данные принудительно сохранены на сервер');
            }, 1000);
            
            // Закрываем модальное окно
            closePrizeModal();
            
            // Переключаемся на вкладку инвентаря
            switchTab('inventory');
        } else {
            throw new Error('Ошибка при получении приза');
        }
    } catch (error) {
        console.error('Ошибка при получении приза:', error);
        showNotification('Ошибка при получении приза', 'error');
    }
}

// Покупка звезд
function buyStars(amount = 100) {
    if (tg && tg.showPopup) {
        // В реальном приложении здесь будет интеграция с Telegram Stars
        tg.showPopup({
            title: 'Покупка звезд',
            message: `Функция покупки ${amount} звезд будет доступна в полной версии приложения`,
            buttons: [
                { id: 'ok', text: 'OK', type: 'ok' }
            ]
        });
    } else {
        // Для тестирования добавляем звезды
        userStars += amount;
        updateStarsDisplay();
        saveUserData();
        showNotification(`Добавлено ${amount} звезд (тестовый режим)`, 'success');
    }
}

// Обновление отображения звезд
function updateStarsDisplay() {
    const starsCount = document.getElementById('stars-count');
    if (starsCount) {
        starsCount.textContent = userStars;
    }
    
    // Сохраняем баланс в localStorage для защиты от сброса
    localStorage.setItem('user_balance', userStars.toString());
    console.log('💾 Баланс сохранен в localStorage:', userStars);
}

// Обновление отображения инвентаря
function updateInventoryDisplay() {
    const inventoryGrid = document.getElementById('inventory-grid');
    if (!inventoryGrid) return;
    
    inventoryGrid.innerHTML = '';
    
    if (userInventory.length === 0) {
        inventoryGrid.innerHTML = '<p style="text-align: center; color: white; grid-column: 1 / -1;">Инвентарь пуст</p>';
        return;
    }
    
    userInventory.forEach(prize => {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        item.innerHTML = `
            <div class="prize-icon">${prize.icon}</div>
            <div class="prize-name">${prize.name}</div>
            <div class="prize-description">${prize.description}</div>
        `;
        inventoryGrid.appendChild(item);
    });
}

// Показ уведомления
function showNotification(message, type = 'info') {
    // Удаляем предыдущие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Показ анимации загрузки
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

// Скрытие анимации загрузки
function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// Загрузка только инвентаря (без изменения звезд)
async function loadInventoryOnly() {
    try {
        const requestData = {
            user_id: currentUserId,
            telegram_name: getUserName(),
            init_data: tg?.initData || 'test_data'
        };
        
        console.log('🔄 Загружаем только инвентарь пользователя:', requestData);
        
        const response = await fetch('/api/user/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            const data = await response.json();
            const oldInventoryLength = userInventory.length;
            
            // Обновляем ТОЛЬКО инвентарь, НЕ трогаем звезды
            userInventory = data.inventory || [];
            
            console.log(`Инвентарь загружен: ${userInventory.length} предметов в инвентаре`);
            
            // Обновляем отображение только если инвентарь изменился
            if (oldInventoryLength !== userInventory.length) {
                updateInventoryDisplay();
                console.log('Отображение инвентаря обновлено');
            }
            
            return true;
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка при загрузке инвентаря:', error);
        return false;
    }
}

// Загрузка данных пользователя
async function loadUserData() {
    try {
        console.log('🔄 LOAD_USER_DATA: Начало загрузки данных');
        console.log('🔄 LOAD_USER_DATA: Текущий баланс до загрузки:', userStars);
        console.log('🔄 LOAD_USER_DATA: Текущий инвентарь до загрузки:', userInventory.length, 'предметов');
        console.log('🔄 LOAD_USER_DATA: ID пользователя:', currentUserId);
        
        // Блокируем загрузку данных для тестовых пользователей
        if (currentUserId === 'test_user' || currentUserId === 'test_user_123') {
            console.log('🚫 Блокируем загрузку данных для тестового пользователя:', currentUserId);
            return false;
        }
        
        // Проверяем, есть ли нерешенный алмазный кейс
        const starsSpentState = localStorage.getItem('starsSpent');
        const pendingPrize = localStorage.getItem('pendingPrize');
        
        // Если есть нерешенный алмазный кейс (100 звезд), НЕ загружаем данные с сервера
        if (starsSpentState) {
            try {
                const state = JSON.parse(starsSpentState);
                if (state.spent && state.amount === 100 && Date.now() - state.timestamp < 600000) {
                    console.log('💎 АЛМАЗНЫЙ КЕЙС - ПРОПУСКАЕМ ЗАГРУЗКУ ДАННЫХ С СЕРВЕРА');
                    console.log('💎 Текущий баланс:', userStars);
                    console.log('💎 Потрачено на алмазный кейс:', state.amount);
                    return false; // Не загружаем данные, чтобы не сбросить баланс
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }
        }
        
        // Если есть нерешенный приз, НЕ загружаем данные с сервера
        if (pendingPrize) {
            try {
                const state = JSON.parse(pendingPrize);
                if (state.prize && (state.prize.type === 'premium' || state.prize.name.includes('Алмазный'))) {
                    console.log('💎 АЛМАЗНЫЙ ПРИЗ - ПРОПУСКАЕМ ЗАГРУЗКУ ДАННЫХ С СЕРВЕРА');
                    console.log('💎 Текущий баланс:', userStars);
                    return false; // Не загружаем данные, чтобы не сбросить баланс
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }
        }
        
        const requestData = {
            user_id: currentUserId,
            telegram_name: getUserName(),
            init_data: tg?.initData || 'test_data'
        };
        
        console.log('📥 Загружаем данные пользователя:', requestData);
        
        console.log('🔄 Загружаем данные пользователя:', requestData);
        console.log('📱 Telegram WebApp данные:', {
            tg: !!tg,
            initDataUnsafe: tg?.initDataUnsafe,
            user: tg?.initDataUnsafe?.user,
            initData: tg?.initData
        });
        
        const response = await fetch('/api/user/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            const data = await response.json();
            const oldStars = userStars;
            const oldInventoryLength = userInventory.length;
            
            console.log('📥 LOAD_USER_DATA: Получены данные с сервера:', {
                stars_balance: data.stars_balance,
                inventory_count: data.inventory?.length || 0,
                inventory: data.inventory
            });
            
        // ИСПРАВЛЕНИЕ: Не сбрасываем баланс на 100, если сервер вернул null/undefined
        // Сохраняем текущий баланс, если серверные данные некорректны
        if (data.stars_balance !== null && data.stars_balance !== undefined && data.stars_balance >= 0) {
            console.log('🔄 LOAD_USER_DATA: Обновляем баланс с', oldStars, 'на', data.stars_balance);
            
            // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Если мы админ и у нас уже есть баланс больше 100,
            // не сбрасываем его на серверное значение, если серверное значение меньше
            if (isAdmin && userStars > 100 && data.stars_balance < userStars) {
                console.log('🔧 АДМИН: Защита от сброса баланса - сохраняем текущий:', userStars);
                console.log('🔧 АДМИН: Серверное значение:', data.stars_balance, 'Текущее:', userStars);
                // Не меняем userStars, оставляем текущий
            } else {
                safeUpdateBalance(data.stars_balance, 'load from server');
            }
        } else {
            console.log('⚠️ LOAD_USER_DATA: Сервер вернул некорректный баланс, сохраняем текущий:', userStars);
            // Если текущий баланс 0 и это первая загрузка, устанавливаем 100
            if (userStars === 0 && userInventory.length === 0) {
                safeUpdateBalance(100, 'first load');
                console.log('🆕 LOAD_USER_DATA: Первая загрузка - устанавливаем начальный баланс 100');
            }
        }
            
            const oldInventory = [...userInventory];
            userInventory = data.inventory || [];
            
            console.log('📦 LOAD_USER_DATA: Инвентарь обновлен:');
            console.log('📦 LOAD_USER_DATA: Старый инвентарь:', oldInventory.length, 'предметов:', oldInventory.map(item => item.name || item.type));
            console.log('📦 LOAD_USER_DATA: Новый инвентарь:', userInventory.length, 'предметов:', userInventory.map(item => item.name || item.type));
            
            // Проверяем, не потерялись ли предметы
            if (oldInventory.length > 0 && userInventory.length < oldInventory.length) {
                console.log('⚠️ LOAD_USER_DATA: ВНИМАНИЕ! Количество предметов в инвентаре уменьшилось!');
                console.log('⚠️ LOAD_USER_DATA: Было:', oldInventory.length, 'Стало:', userInventory.length);
                
                // Ищем потерянные предметы
                const lostItems = oldInventory.filter(oldItem => 
                    !userInventory.some(newItem => 
                        (oldItem.id && newItem.id && oldItem.id === newItem.id) ||
                        (oldItem.name && newItem.name && oldItem.name === newItem.name)
                    )
                );
                
                if (lostItems.length > 0) {
                    console.log('❌ LOAD_USER_DATA: Потерянные предметы:', lostItems);
                    // Восстанавливаем потерянные предметы
                    userInventory = [...userInventory, ...lostItems];
                    console.log('🔄 LOAD_USER_DATA: Восстановлены потерянные предметы');
                }
            }
            
            console.log(`✅ LOAD_USER_DATA: Итоговые данные: ${userStars} звезд, ${userInventory.length} предметов в инвентаре`);
            
            // Дополнительная проверка: если баланс 100, но в инвентаре есть алмазные призы,
            // значит был открыт алмазный кейс и нужно исправить баланс
            if (userStars === 100 && userInventory.length > 0) {
                const hasDiamondPrize = userInventory.some(item => 
                    item.type === 'premium' || 
                    item.name.includes('Алмазный') || 
                    item.name.includes('Premium') ||
                    item.rarity === 'legendary'
                );
                
                if (hasDiamondPrize) {
                    console.log('💎 ОБНАРУЖЕН АЛМАЗНЫЙ ПРИЗ В ИНВЕНТАРЕ ПРИ БАЛАНСЕ 100 (loadUserData)');
                    console.log('💎 Исправляем баланс на 0 звезд');
                    safeUpdateBalance(0, 'diamond prize correction');
                    starsSpent = true;
                    
                    // Сразу сохраняем исправленный баланс на сервер
                    await saveUserData();
                    
                    // Дополнительное принудительное сохранение через 2 секунды
                    setTimeout(async () => {
                        console.log('💎 ДОПОЛНИТЕЛЬНОЕ ПРИНУДИТЕЛЬНОЕ СОХРАНЕНИЕ для алмазного кейса');
                        await saveUserData();
                        console.log('💎 Данные дополнительно сохранены');
                    }, 2000);
                }
            }
            
            // Обновляем отображение только если данные изменились
            if (oldStars !== userStars || oldInventoryLength !== userInventory.length) {
                updateStarsDisplay();
                updateInventoryDisplay();
                console.log('Отображение обновлено');
            }
            
            return true;
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        // ИСПРАВЛЕНИЕ: Не сбрасываем баланс на 100 при ошибке, если у нас уже есть данные
        if (userStars === 0 && userInventory.length === 0) {
            // Только если это первая загрузка и нет данных
            safeUpdateBalance(100, 'error first load');
            userInventory = [];
            console.log('🆕 Первая загрузка при ошибке - устанавливаем начальный баланс 100');
        }
        return false;
    }
}

// Сохранение данных пользователя
async function saveUserData() {
    try {
        console.log('💾 SAVE_USER_DATA: Начало сохранения данных');
        console.log('💾 SAVE_USER_DATA: Баланс для сохранения:', userStars);
        console.log('💾 SAVE_USER_DATA: Инвентарь для сохранения:', userInventory.length, 'предметов');
        console.log('💾 SAVE_USER_DATA: ID пользователя:', currentUserId);
        
        // Блокируем сохранение данных для тестовых пользователей
        if (currentUserId === 'test_user' || currentUserId === 'test_user_123') {
            console.log('🚫 Блокируем сохранение данных для тестового пользователя:', currentUserId);
            return;
        }
        
        const requestData = {
            user_id: currentUserId,
            telegram_name: getUserName(),
            stars_balance: userStars,
            inventory: userInventory,
            init_data: tg?.initData || 'test_data'
        };
        
        console.log('💾 SAVE_USER_DATA: Данные для отправки на сервер:', {
            user_id: requestData.user_id,
            telegram_name: requestData.telegram_name,
            stars_balance: requestData.stars_balance,
            inventory_count: requestData.inventory.length,
            inventory_items: requestData.inventory.map(item => item.name || item.type)
        });
        
        const response = await fetch('/api/user/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            console.error('❌ SAVE_USER_DATA: Ошибка ответа сервера:', response.status, response.statusText);
            throw new Error('Ошибка при сохранении данных');
        }
        
        console.log('✅ SAVE_USER_DATA: Данные успешно сохранены на сервер');
        
    } catch (error) {
        console.error('❌ SAVE_USER_DATA: Ошибка при сохранении данных:', error);
    }
}

// Проверка, что приз получен законно (после трат)
function validatePrizeClaim(prize, casePrice) {
    console.log(`🔍 VALIDATE_PRIZE: Проверяем законность получения приза ${prize.name}`);
    
    // Проверяем, что приз уже есть в инвентаре (значит, он был добавлен законно)
    const prizeInInventory = userInventory.some(item => 
        item.id === prize.id
    );
    
    if (prizeInInventory) {
        console.log('✅ VALIDATE_PRIZE: Приз уже в инвентаре - получен законно');
        return true;
    }
    
    // Проверяем, что приз был добавлен автоматически в текущей сессии
    if (prizeAutoAdded && currentPrize && currentPrize.id === prize.id) {
        console.log('✅ VALIDATE_PRIZE: Приз добавлен автоматически в текущей сессии - получен законно');
        return true;
    }
    
    // Проверяем, что есть запись о потраченных звездах
    const starsSpent = localStorage.getItem('starsSpent');
    if (!starsSpent) {
        console.log('❌ VALIDATE_PRIZE: Нет записи о потраченных звездах - приз недействителен');
        return false;
    }
    
    try {
        const state = JSON.parse(starsSpent);
        if (!state.spent || state.amount !== casePrice) {
            console.log('❌ VALIDATE_PRIZE: Несоответствие суммы потраченных звезд');
            return false;
        }
        
        // Проверяем, что прошло не слишком много времени (защита от старых записей)
        const timeDiff = Date.now() - state.timestamp;
        if (timeDiff > 300000) { // 5 минут
            console.log('❌ VALIDATE_PRIZE: Запись о потраченных звездах слишком старая');
            return false;
        }
        
        console.log('✅ VALIDATE_PRIZE: Приз получен законно');
        return true;
    } catch (e) {
        console.log('❌ VALIDATE_PRIZE: Ошибка парсинга записи о потраченных звездах');
        return false;
    }
}

// Безопасное обновление баланса с защитой от потери данных
function safeUpdateBalance(newBalance, reason = 'unknown') {
    const oldBalance = userStars;
    console.log(`🔄 SAFE_UPDATE_BALANCE: ${reason} - Изменение баланса с ${oldBalance} на ${newBalance}`);
    
    // Защита от сброса баланса на 100, если у нас есть инвентарь
    if (newBalance === 100 && userInventory.length > 0 && oldBalance !== 100) {
        console.log('⚠️ SAFE_UPDATE_BALANCE: Защита от сброса баланса на 100 при наличии инвентаря');
        console.log('⚠️ SAFE_UPDATE_BALANCE: Инвентарь содержит:', userInventory.length, 'предметов');
        
        // Проверяем, есть ли алмазные призы
        const hasDiamondPrize = userInventory.some(item => 
            item.type === 'premium' || 
            item.name?.includes('Алмазный') || 
            item.name?.includes('Premium') ||
            item.rarity === 'legendary'
        );
        
        if (hasDiamondPrize) {
            console.log('💎 SAFE_UPDATE_BALANCE: Обнаружен алмазный приз, устанавливаем баланс 0');
            userStars = 0;
        } else {
            console.log('🔄 SAFE_UPDATE_BALANCE: Сохраняем предыдущий баланс:', oldBalance);
            userStars = oldBalance;
        }
    } else {
        userStars = newBalance;
    }
    
    console.log(`✅ SAFE_UPDATE_BALANCE: Баланс обновлен: ${oldBalance} → ${userStars}`);
    updateStarsDisplay();
}

// Функция восстановления баланса из localStorage
window.restoreBalance = function() {
    const savedBalance = localStorage.getItem('user_balance');
    if (savedBalance && parseInt(savedBalance) > 0) {
        const oldBalance = userStars;
        safeUpdateBalance(parseInt(savedBalance), 'restore from localStorage');
        saveUserData();
        showNotification(`Баланс восстановлен: ${oldBalance} → ${userStars}`, 'success');
        console.log('🔄 БАЛАНС ВОССТАНОВЛЕН:', oldBalance, '→', userStars);
    } else {
        showNotification('Сохраненный баланс не найден', 'error');
    }
};

// Функция принудительного сохранения баланса
window.forceSaveBalance = function() {
    localStorage.setItem('user_balance', userStars.toString());
    saveUserData();
    showNotification(`Баланс ${userStars} принудительно сохранен`, 'success');
    console.log('💾 БАЛАНС ПРИНУДИТЕЛЬНО СОХРАНЕН:', userStars);
};

// Функция принудительного обновления баланса с сервера
window.forceLoadBalance = async function() {
    console.log('🔄 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ БАЛАНСА с сервера');
    const success = await loadUserData();
    if (success) {
        showNotification(`Баланс обновлен с сервера: ${userStars}`, 'success');
        console.log('✅ БАЛАНС ОБНОВЛЕН С СЕРВЕРА:', userStars);
    } else {
        showNotification('Ошибка обновления баланса с сервера', 'error');
        console.log('❌ ОШИБКА ОБНОВЛЕНИЯ БАЛАНСА');
    }
};

// Функция восстановления потерянных предметов
function recoverLostItems() {
    console.log('🔍 RECOVERY: Поиск потерянных предметов...');
    
    // Проверяем, что есть запись о потраченных звездах ИЛИ незавершенное открытие кейса
    const starsSpent = localStorage.getItem('starsSpent');
    const pendingPrize = localStorage.getItem('pendingPrize');
    
    if (!starsSpent && !pendingPrize) {
        console.log('🔍 RECOVERY: Нет записи о потраченных звездах или незавершенном открытии - пропускаем восстановление');
        return false;
    }
    
    // Если есть pendingPrize, но нет starsSpent - это означает, что анимация не завершилась
    if (pendingPrize && !starsSpent) {
        console.log('🔍 RECOVERY: Есть незавершенное открытие кейса, но деньги не списаны - пропускаем восстановление');
        return false;
    }
    
    // Список предметов, которые могли быть потеряны
    const possibleLostItems = [
        {
            id: 'heart_item_' + Date.now(),
            name: 'Сердечко',
            type: 'special',
            rarity: 'rare',
            description: 'Особый предмет - сердечко',
            emoji: '❤️'
        }
    ];
    
    // Проверяем, есть ли эти предметы в инвентаре
    const missingItems = possibleLostItems.filter(item => 
        !userInventory.some(invItem => 
            invItem.name === item.name || 
            (invItem.id && item.id && invItem.id === item.id)
        )
    );
    
    if (missingItems.length > 0) {
        console.log('🔄 RECOVERY: Найдены потерянные предметы:', missingItems);
        
        // Добавляем потерянные предметы в инвентарь
        userInventory.push(...missingItems);
        
        // Обновляем отображение
        updateInventoryDisplay();
        
        // Сохраняем на сервер
        saveUserData();
        
        showNotification(`Восстановлено ${missingItems.length} потерянных предметов!`, 'success');
        console.log('✅ RECOVERY: Восстановлены потерянные предметы');
        
        return true;
    } else {
        console.log('✅ RECOVERY: Потерянных предметов не найдено');
        return false;
    }
}

// Функция для принудительного восстановления предмета "сердечко"

// Настройка защиты от потери данных при выходе
function setupExitProtection() {
    console.log('🛡️ EXIT_PROTECTION: Настраиваем защиту от потери данных...');
    
    // Обработчик перед закрытием страницы
    window.addEventListener('beforeunload', function(event) {
        const pendingPrize = localStorage.getItem('pendingPrize');
        const starsSpent = localStorage.getItem('starsSpent');
        
        if (pendingPrize || starsSpent) {
            console.log('⚠️ EXIT_PROTECTION: Обнаружена незавершенная транзакция при выходе');
            
            // Пытаемся сохранить данные перед выходом
            try {
                saveUserData();
                console.log('💾 EXIT_PROTECTION: Данные сохранены перед выходом');
            } catch (error) {
                console.error('❌ EXIT_PROTECTION: Ошибка сохранения перед выходом:', error);
            }
            
            // Показываем предупреждение пользователю
            const message = 'У вас есть незавершенное открытие кейса! Если вы выйдете сейчас, деньги могут быть потеряны.';
            event.returnValue = message;
            return message;
        }
    });
    
    // Обработчик потери фокуса (минимизация приложения)
    window.addEventListener('blur', function() {
        const pendingPrize = localStorage.getItem('pendingPrize');
        const starsSpent = localStorage.getItem('starsSpent');
        
        if (pendingPrize || starsSpent) {
            console.log('⚠️ EXIT_PROTECTION: Приложение потеряло фокус с незавершенной транзакцией');
            
            // Сохраняем данные при потере фокуса
            try {
                saveUserData();
                console.log('💾 EXIT_PROTECTION: Данные сохранены при потере фокуса');
            } catch (error) {
                console.error('❌ EXIT_PROTECTION: Ошибка сохранения при потере фокуса:', error);
            }
        }
    });
    
    // Обработчик восстановления фокуса
    window.addEventListener('focus', async function() {
        console.log('🔄 EXIT_PROTECTION: Приложение восстановило фокус');
        
        // Проверяем незавершенные транзакции
        await checkPendingCaseOpening();
    });
    
    console.log('✅ EXIT_PROTECTION: Защита от потери данных настроена');
}

// Безопасное сохранение открытия кейса на сервер
async function saveCaseOpening(userId, caseType, price, prize) {
    try {
        console.log(`💾 SAVE_CASE_OPENING: Сохраняем открытие кейса ${caseType} для пользователя ${userId}`);
        console.log(`💾 SAVE_CASE_OPENING: Данные запроса:`, {
            user_id: userId,
            case_type: caseType,
            price: price,
            prize: prize
        });
        
        const response = await fetch('/api/case/open', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                case_type: caseType,
                price: price,
                prize: prize,
                init_data: tg?.initData || ''
            })
        });
        
        console.log(`💾 SAVE_CASE_OPENING: Ответ сервера:`, response.status, response.statusText);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ SAVE_CASE_OPENING: Ошибка сервера:', errorData);
            throw new Error(errorData.message || 'Ошибка сохранения открытия кейса');
        }
        
        const result = await response.json();
        console.log('✅ SAVE_CASE_OPENING: Кейс успешно сохранен на сервер:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ SAVE_CASE_OPENING: Ошибка сохранения открытия кейса:', error);
        throw error;
    }
}

// Функция для полного восстановления данных

// Проверка на наличие незавершенного открытия кейса
async function checkPendingCaseOpening() {
    console.log('🔍 CHECK_PENDING: Проверяем незавершенное открытие кейса...');
    
    const pendingPrize = localStorage.getItem('pendingPrize');
    const starsSpent = localStorage.getItem('starsSpent');
    
    if (pendingPrize || starsSpent) {
        console.log('⚠️ CHECK_PENDING: Найдено незавершенное открытие кейса');
        console.log('⚠️ CHECK_PENDING: pendingPrize:', pendingPrize);
        console.log('⚠️ CHECK_PENDING: starsSpent:', starsSpent);
        
        try {
            // Проверяем, есть ли приз в инвентаре
            let prizeInInventory = false;
            if (pendingPrize) {
                const prizeData = JSON.parse(pendingPrize);
                const prize = prizeData.prize;
                
                // Проверяем, есть ли этот приз уже в инвентаре (только по ID)
                prizeInInventory = userInventory.some(item => 
                    item.id === prize.id
                );
                
                if (prizeInInventory) {
                    console.log('✅ CHECK_PENDING: Приз уже в инвентаре, очищаем localStorage');
                    localStorage.removeItem('pendingPrize');
                    localStorage.removeItem('starsSpent');
                    localStorage.removeItem('prizeProcessed');
                    return;
                }
                
                // Если есть pendingPrize, но нет starsSpent - это означает, что анимация не завершилась
                if (!starsSpent) {
                    console.log('⚠️ CHECK_PENDING: Есть незавершенная анимация открытия кейса');
                    console.log('⚠️ CHECK_PENDING: Деньги НЕ списаны, приз НЕ добавлен - все в порядке');
                    
                    // Показываем уведомление пользователю
                    showNotification('Обнаружено незавершенное открытие кейса! Нажмите на кейс еще раз.', 'info');
                    
                    // Очищаем localStorage, так как деньги не были списаны
                    localStorage.removeItem('pendingPrize');
                    localStorage.removeItem('prizeProcessed');
                    
                    return;
                }
            }
            
            // Если приз не в инвентаре, но есть запись о потраченных звездах
            if (starsSpent && !prizeInInventory) {
                const state = JSON.parse(starsSpent);
                const originalStars = state.originalStars || 0;
                const amount = state.amount || 0;
                
                console.log('🔄 CHECK_PENDING: Восстанавливаем баланс - приз не был добавлен');
                console.log(`💰 Восстанавливаем ${amount} звезд (было ${userStars}, станет ${originalStars})`);
                
                // Проверяем серверные данные для подтверждения
                try {
                    const serverData = await loadUserData();
                    if (serverData) {
                        console.log('🔄 CHECK_PENDING: Проверяем серверные данные...');
                        
                        // Если на сервере баланс меньше, чем должен быть, восстанавливаем
                        if (serverData.stars_balance < originalStars) {
                            console.log('🔄 CHECK_PENDING: Серверные данные подтверждают потерю денег');
                            
                            // Восстанавливаем баланс
                            userStars = originalStars;
                            updateStarsDisplay();
                            
                            // Очищаем localStorage
                            localStorage.removeItem('pendingPrize');
                            localStorage.removeItem('starsSpent');
                            localStorage.removeItem('prizeProcessed');
                            
                            // Сохраняем исправленные данные
                            saveUserData();
                            
                            showNotification('Восстановлен баланс! Приз не был добавлен в инвентарь.', 'success');
                            console.log('✅ CHECK_PENDING: Баланс восстановлен');
                            return;
                        } else {
                            console.log('✅ CHECK_PENDING: Серверные данные корректны, очищаем localStorage');
                            localStorage.removeItem('pendingPrize');
                            localStorage.removeItem('starsSpent');
                            localStorage.removeItem('prizeProcessed');
                            return;
                        }
                    }
                } catch (error) {
                    console.error('❌ CHECK_PENDING: Ошибка проверки серверных данных:', error);
                }
                
                // Если не удалось проверить сервер, восстанавливаем локально
                userStars = originalStars;
                updateStarsDisplay();
                
                // Очищаем localStorage
                localStorage.removeItem('pendingPrize');
                localStorage.removeItem('starsSpent');
                localStorage.removeItem('prizeProcessed');
                
                // Сохраняем исправленные данные
                saveUserData();
                
                showNotification('Восстановлен баланс! Приз не был добавлен в инвентарь.', 'success');
                console.log('✅ CHECK_PENDING: Баланс восстановлен');
                return;
            }
            
            // Если есть приз, но нет записи о потраченных звездах - это ошибка
            if (pendingPrize && !starsSpent) {
                console.log('❌ CHECK_PENDING: Есть приз без записи о тратах - очищаем');
                localStorage.removeItem('pendingPrize');
                localStorage.removeItem('prizeProcessed');
                return;
            }
            
        } catch (e) {
            console.log('❌ CHECK_PENDING: Ошибка обработки незавершенного открытия:', e);
            // Очищаем поврежденные данные
            localStorage.removeItem('pendingPrize');
            localStorage.removeItem('starsSpent');
            localStorage.removeItem('prizeProcessed');
        }
        
    } else {
        console.log('✅ CHECK_PENDING: Незавершенных открытий кейса не найдено');
    }
}

// Функция для отмены открытия кейса (если анимация не завершена)

// Экспорт функций для тестирования
window.userStars = userStars;
window.userInventory = userInventory;
window.openCase = openCase;

// Функция для тестирования открытия кейсов
window.testCaseOpening = function(caseType = 'bronze', price = 10) {
    console.log('🧪 ТЕСТ: Тестируем открытие кейса', caseType, 'за', price, 'звезд');
    console.log('🧪 ТЕСТ: Текущий баланс:', userStars);
    console.log('🧪 ТЕСТ: UserId:', getUserId());
    console.log('🧪 ТЕСТ: Telegram данные:', {
        initData: tg?.initData,
        initDataUnsafe: tg?.initDataUnsafe,
        user: tg?.initDataUnsafe?.user
    });
    
    if (userStars < price) {
        console.log('❌ ТЕСТ: Недостаточно звезд для тестирования');
        return false;
    }
    
    // Вызываем функцию открытия кейса
    openCase(caseType, price);
    return true;
};

// Функция для принудительного добавления приза в инвентарь (для тестирования)
window.forceAddPrize = function(prizeName = 'Тестовый приз', prizeType = 'special') {
    console.log('🎁 FORCE_ADD: Принудительное добавление приза:', prizeName);
    
    // Создаем тестовый приз
    const testPrize = {
        id: 'test_prize_' + Date.now(),
        name: prizeName,
        type: prizeType,
        rarity: 'common',
        description: 'Тестовый приз для проверки',
        emoji: '🎁'
    };
    
    // Добавляем в инвентарь
    userInventory.push(testPrize);
    updateInventoryDisplay();
    
    // Сохраняем на сервер
    saveUserData();
    
    showNotification(`Приз "${prizeName}" добавлен в инвентарь!`, 'success');
    console.log('✅ FORCE_ADD: Приз добавлен:', testPrize);
    
    return testPrize;
};
window.addStars = function(amount) {
    userStars += amount;
    updateStarsDisplay();
    showNotification(`Добавлено ${amount} звезд!`, 'success');
};
window.clearInventory = function() {
    userInventory = [];
    updateInventoryDisplay();
    showNotification('Инвентарь очищен!', 'info');
};
window.showNotification = showNotification;

// Функция выхода из полноэкранного режима
window.exitFullscreenMode = function() {
    // Восстанавливаем интерфейс
    document.body.classList.remove('case-opening');
    
    // Скрываем область анимации
    const openingArea = document.getElementById('opening-area');
    openingArea.classList.remove('fullscreen');
    openingArea.style.display = 'none';
    
    // Скрываем кнопку выхода
    const exitBtn = document.getElementById('exit-fullscreen-btn');
    exitBtn.style.display = 'none';
    
    // Сбрасываем полоску призов
    const prizeStrip = document.getElementById('prize-strip');
    prizeStrip.innerHTML = '';
    prizeStrip.className = 'prize-strip';
    
    // Скрываем показ приза
    const prizeReveal = document.getElementById('prize-reveal');
    prizeReveal.classList.remove('show');
    
    // Очищаем эффекты редкости
    const rarityEffects = prizeReveal.querySelectorAll('.rarity-effect');
    rarityEffects.forEach(effect => effect.remove());
    
    // Сбрасываем лучи света
    const lightRays = document.querySelector('.light-rays');
    if (lightRays) {
        lightRays.classList.remove('active');
        lightRays.style.animationDuration = '';
    }
    
    // Очищаем частицы
    const particlesContainer = document.getElementById('particles-container');
    if (particlesContainer) {
        particlesContainer.innerHTML = '';
    }
    
    // Возвращаем звезды только если приз не был автоматически добавлен И звезды не были потрачены
    console.log('🔵 EXIT FULLSCREEN MODE:');
    console.log('- Цена кейса:', currentCasePrice);
    console.log('- Приз автоматически добавлен:', prizeAutoAdded);
    console.log('- Звезды потрачены:', starsSpent);
    console.log('- Звезды ДО:', userStars);
    console.log('- isOpening:', isOpening);
    
    // Дополнительная проверка: не возвращаем звезды, если приложение только загружается
    // ИЛИ если приз уже был добавлен в инвентарь
    if (currentCasePrice > 0 && !prizeAutoAdded && !starsSpent && isOpening) {
        // Проверяем, не добавлен ли уже приз в инвентарь
        const prizeInInventory = currentPrize && userInventory.some(item => 
            item.id === currentPrize.id || 
            (item.name === currentPrize.name && item.type === currentPrize.type)
        );
        
        if (!prizeInInventory) {
            console.log('🟡 ВОЗВРАЩАЕМ ЗВЕЗДЫ (ручной выход, приз не добавлен)');
            userStars += currentCasePrice;
            currentCasePrice = 0;
            updateStarsDisplay();
        } else {
            console.log('🔴 НЕ ВОЗВРАЩАЕМ ЗВЕЗДЫ (приз уже в инвентаре)');
            currentCasePrice = 0;
        }
    } else if (currentCasePrice > 0) {
        console.log('🔴 НЕ ВОЗВРАЩАЕМ ЗВЕЗДЫ (приз добавлен, звезды потрачены или приложение загружается)');
        // Если приз был автоматически добавлен или звезды потрачены, просто сбрасываем цену
        currentCasePrice = 0;
    }
    
    console.log('- Звезды ПОСЛЕ:', userStars);
    
    // Сбрасываем флаг открытия
    isOpening = false;
    
    showNotification('Открытие кейса отменено', 'info');
};

// ==================== АДМИНСКИЕ ФУНКЦИИ ====================

// Установка баланса для текущего пользователя (админа)
async function setMyBalance() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const amount = parseInt(document.getElementById('balance-amount').value);
    
    if (isNaN(amount) || amount < 0) {
        showNotification('❌ Введите корректное количество звезд', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/' + currentUserId + '/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                balance: amount,
                user_id: currentUserId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Обновляем локальный баланс
            safeUpdateBalance(amount, 'admin set balance');
            
            showNotification(`✅ Ваш баланс установлен: ${amount} звезд`, 'success');
            logAdminAction(`Установлен собственный баланс ${amount}`);
            console.log(`🔧 АДМИН: Собственный баланс установлен на ${amount}`);
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка установки собственного баланса:', error);
        showNotification('❌ Ошибка установки баланса', 'error');
        logAdminAction(`ОШИБКА: Не удалось установить собственный баланс`);
    }
}

// Добавление к балансу текущего пользователя (админа)
async function addMyBalance() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const amount = parseInt(document.getElementById('balance-amount').value);
    
    if (isNaN(amount)) {
        showNotification('❌ Введите корректное количество звезд', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/' + currentUserId + '/add-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                amount: amount,
                user_id: currentUserId
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Обновляем локальный баланс
            safeUpdateBalance(result.newBalance, 'admin add balance');
            
            showNotification(`✅ Добавлено ${amount} звезд. Новый баланс: ${result.newBalance}`, 'success');
            logAdminAction(`Добавлено ${amount} звезд к собственному балансу. Новый баланс: ${result.newBalance}`);
            console.log(`🔧 АДМИН: К собственному балансу добавлено ${amount}, новый баланс: ${result.newBalance}`);
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка добавления к собственному балансу:', error);
        showNotification('❌ Ошибка добавления к балансу', 'error');
        logAdminAction(`ОШИБКА: Не удалось добавить к собственному балансу`);
    }
}

// Удаление пользователя
async function deleteUser() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const userId = document.getElementById('target-user-id').value;
    
    if (!userId) {
        showNotification('❌ Введите ID пользователя для удаления', 'error');
        return;
    }
    
    // Дополнительная проверка для тестовых пользователей
    if (userId === 'test_user' || userId === 'test_user_123') {
        if (!confirm(`⚠️ ВНИМАНИЕ! Вы собираетесь удалить тестового пользователя "${userId}" навсегда!\n\nЭто действие необратимо. Продолжить?`)) {
            return;
        }
    } else {
        if (!confirm(`⚠️ ВНИМАНИЕ! Вы собираетесь удалить пользователя "${userId}" навсегда!\n\nЭто действие необратимо. Продолжить?`)) {
            return;
        }
    }
    
    try {
        const response = await fetch('/api/admin/users/' + userId, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: currentUserId // Добавляем ID админа для проверки прав
            })
        });
        
        if (response.ok) {
            showNotification(`✅ Пользователь ${userId} удален навсегда`, 'success');
            logAdminAction(`Удален пользователь ${userId}`);
            console.log(`🔧 АДМИН: Пользователь ${userId} удален`);
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        showNotification('❌ Ошибка удаления пользователя', 'error');
        logAdminAction(`ОШИБКА: Не удалось удалить пользователя ${userId}`);
    }
}

// Установка баланса пользователя
async function setUserBalance() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const userId = document.getElementById('target-user-id').value;
    const amount = parseInt(document.getElementById('balance-amount').value);
    
    if (!userId || isNaN(amount)) {
        showNotification('❌ Введите корректные данные', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/' + userId + '/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                balance: amount,
                user_id: currentUserId // Добавляем ID админа для проверки прав
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`✅ Баланс пользователя ${userId} установлен: ${amount} звезд`, 'success');
            logAdminAction(`Установлен баланс ${amount} для пользователя ${userId}`);
            
            // Если устанавливаем баланс для текущего пользователя, обновляем локальный баланс
            if (userId === currentUserId) {
                safeUpdateBalance(amount, 'admin set other user balance');
                console.log(`🔧 АДМИН: Локальный баланс обновлен на ${amount}`);
            }
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка установки баланса:', error);
        showNotification('❌ Ошибка установки баланса', 'error');
        logAdminAction(`ОШИБКА: Не удалось установить баланс для ${userId}`);
    }
}

// Добавление к балансу пользователя
async function addUserBalance() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const userId = document.getElementById('target-user-id').value;
    const amount = parseInt(document.getElementById('balance-amount').value);
    
    if (!userId || isNaN(amount)) {
        showNotification('❌ Введите корректные данные', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/' + userId + '/add-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                amount: amount,
                user_id: currentUserId // Добавляем ID админа для проверки прав
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(`✅ Добавлено ${amount} звезд пользователю ${userId}. Новый баланс: ${result.newBalance}`, 'success');
            logAdminAction(`Добавлено ${amount} звезд пользователю ${userId}. Новый баланс: ${result.newBalance}`);
            
            // Если добавляем баланс для текущего пользователя, обновляем локальный баланс
            if (userId === currentUserId) {
                safeUpdateBalance(result.newBalance, 'admin add other user balance');
                console.log(`🔧 АДМИН: Локальный баланс обновлен на ${result.newBalance}`);
            }
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка добавления к балансу:', error);
        showNotification('❌ Ошибка добавления к балансу', 'error');
        logAdminAction(`ОШИБКА: Не удалось добавить ${amount} звезд пользователю ${userId}`);
    }
}

// Получение информации о пользователе
async function getUserInfo() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const userId = document.getElementById('target-user-id').value;
    
    if (!userId) {
        showNotification('❌ Введите ID пользователя', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users/' + userId);
        
        if (response.ok) {
            const result = await response.json();
            const user = result.user;
            
            const info = `
Пользователь: ${user.telegram_name}
ID: ${user.user_id}
Баланс: ${user.balance} звезд
Инвентарь: ${user.inventory?.length || 0} предметов
Создан: ${new Date(user.created_at).toLocaleString()}
Обновлен: ${new Date(user.updated_at).toLocaleString()}
            `;
            
            alert(info);
            logAdminAction(`Получена информация о пользователе ${userId}`);
        } else if (response.status === 404) {
            showNotification('❌ Пользователь не найден', 'error');
            logAdminAction(`Пользователь ${userId} не найден`);
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка получения информации о пользователе:', error);
        showNotification('❌ Ошибка получения информации', 'error');
        logAdminAction(`ОШИБКА: Не удалось получить информацию о пользователе ${userId}`);
    }
}

// Получение всех пользователей
async function getAllUsers() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: currentUserId // Добавляем ID админа для проверки прав
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            const users = result.users;
            
            let info = `Всего пользователей: ${users.length}\n\n`;
            users.forEach((user, index) => {
                info += `${index + 1}. ${user.telegram_name} (${user.user_id})\n`;
                info += `   Баланс: ${user.balance} звезд\n`;
                info += `   Инвентарь: ${user.inventory?.length || 0} предметов\n\n`;
            });
            
            alert(info);
            logAdminAction(`Получен список всех пользователей (${users.length})`);
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка получения списка пользователей:', error);
        showNotification('❌ Ошибка получения списка пользователей', 'error');
        logAdminAction('ОШИБКА: Не удалось получить список пользователей');
    }
}

// Получение статистики сервера
async function getServerStats() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: currentUserId // Добавляем ID админа для проверки прав
            })
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            const info = `
Статистика сервера:
Всего пользователей: ${stats.total_users}
Пользователей с балансом: ${stats.users_with_balance}
Общее количество звезд: ${stats.total_stars}
Средний баланс: ${stats.avg_balance?.toFixed(2) || 0}
Всего предметов в инвентарях: ${stats.total_inventory_items}
            `;
            
            alert(info);
            logAdminAction('Получена статистика сервера');
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        showNotification('❌ Ошибка получения статистики', 'error');
        logAdminAction('ОШИБКА: Не удалось получить статистику сервера');
    }
}

// Создание резервной копии
async function createBackup() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/backup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: currentUserId // Добавляем ID админа для проверки прав
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('✅ Резервная копия создана успешно', 'success');
            logAdminAction('Создана резервная копия');
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (error) {
        console.error('Ошибка создания резервной копии:', error);
        showNotification('❌ Ошибка создания резервной копии', 'error');
        logAdminAction('ОШИБКА: Не удалось создать резервную копию');
    }
}


// Удаление тестовых пользователей
async function deleteTestUsers() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    const testUsers = ['test_user', 'test_user_123'];
    
    if (!confirm(`⚠️ ВНИМАНИЕ! Вы собираетесь удалить всех тестовых пользователей навсегда!\n\nУдаляемые пользователи:\n- test_user\n- test_user_123\n\nЭто действие необратимо. Продолжить?`)) {
        return;
    }
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const userId of testUsers) {
        try {
            const response = await fetch('/api/admin/users/' + userId, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    user_id: currentUserId
                })
            });
            
            if (response.ok) {
                deletedCount++;
                console.log(`✅ Удален тестовый пользователь: ${userId}`);
                logAdminAction(`Удален тестовый пользователь: ${userId}`);
            } else {
                errorCount++;
                console.log(`❌ Ошибка удаления пользователя: ${userId}`);
            }
        } catch (error) {
            errorCount++;
            console.error(`Ошибка удаления пользователя ${userId}:`, error);
        }
    }
    
    if (deletedCount > 0) {
        showNotification(`✅ Удалено тестовых пользователей: ${deletedCount}`, 'success');
    }
    if (errorCount > 0) {
        showNotification(`❌ Ошибок при удалении: ${errorCount}`, 'error');
    }
    
    logAdminAction(`Массовое удаление тестовых пользователей: удалено ${deletedCount}, ошибок ${errorCount}`);
}

// Очистка всех данных (только для админа)
async function clearAllData() {
    if (!isAdmin) {
        showNotification('❌ Доступ запрещен', 'error');
        return;
    }
    
    if (!confirm('⚠️ ВНИМАНИЕ! Это действие удалит ВСЕ данные приложения. Продолжить?')) {
        return;
    }
    
    if (!confirm('⚠️ ВЫ УВЕРЕНЫ? Это действие НЕОБРАТИМО!')) {
        return;
    }
    
    try {
        // Очищаем локальные данные
        safeUpdateBalance(100, 'data reset');
        userInventory = [];
        localStorage.clear();
        
        // Обновляем отображение
        updateStarsDisplay();
        updateInventoryDisplay();
        
        showNotification('✅ Все данные очищены', 'success');
        logAdminAction('ОЧИЩЕНЫ ВСЕ ДАННЫЕ ПРИЛОЖЕНИЯ');
    } catch (error) {
        console.error('Ошибка очистки данных:', error);
        showNotification('❌ Ошибка очистки данных', 'error');
        logAdminAction('ОШИБКА: Не удалось очистить данные');
    }
}
