// Telegram WebApp API
const tg = window.Telegram.WebApp;

// Глобальные переменные
let userStars = 100; // Начальный баланс звезд
let userInventory = []; // Инвентарь пользователя
let isOpening = false; // Флаг открытия кейса

// Конфигурация кейсов
const caseConfig = {
    bronze: {
        price: 10,
        prizes: [
            { type: 'gift', name: 'Сердечко', icon: '❤️', description: 'Подарок сердечко', telegram_gift_id: 'heart_1' },
            { type: 'gift', name: 'Звездочка', icon: '⭐', description: 'Подарок звездочка', telegram_gift_id: 'star_1' },
            { type: 'gift', name: 'Цветок', icon: '🌸', description: 'Подарок цветок', telegram_gift_id: 'flower_1' },
            { type: 'gift', name: 'Торт', icon: '🎂', description: 'Редкий торт', telegram_gift_id: 'cake_1' }
        ]
    },
    silver: {
        price: 25,
        prizes: [
            { type: 'gift', name: 'Сердечко', icon: '❤️', description: 'Подарок сердечко', telegram_gift_id: 'heart_1' },
            { type: 'gift', name: 'Звездочка', icon: '⭐', description: 'Подарок звездочка', telegram_gift_id: 'star_1' },
            { type: 'gift', name: 'Цветок', icon: '🌸', description: 'Подарок цветок', telegram_gift_id: 'flower_1' },
            { type: 'gift', name: 'Торт', icon: '🎂', description: 'Редкий торт', telegram_gift_id: 'cake_1' },
            { type: 'sticker', name: 'Кот', icon: '🐱', description: 'Стикер кота', telegram_sticker_id: 'cat_1' },
            { type: 'sticker', name: 'Собака', icon: '🐶', description: 'Стикер собаки', telegram_sticker_id: 'dog_1' }
        ]
    },
    gold: {
        price: 50,
        prizes: [
            { type: 'premium', name: 'Telegram Premium', icon: '👑', description: 'Премиум подписка на 1 месяц', premium_duration: 30 },
            { type: 'gift', name: 'Королевский подарок', icon: '🎁', description: 'Эксклюзивный подарок', telegram_gift_id: 'royal_1' },
            { type: 'sticker', name: 'Премиум стикер', icon: '✨', description: 'Стикер премиум качества', telegram_sticker_id: 'premium_1' }
        ]
    },
    diamond: {
        price: 100,
        prizes: [
            { type: 'premium', name: 'Telegram Premium', icon: '👑', description: 'Премиум подписка на 3 месяца', premium_duration: 90 },
            { type: 'gift', name: 'Алмазный подарок', icon: '💎', description: 'Уникальный алмазный подарок', telegram_gift_id: 'diamond_1' },
            { type: 'sticker', name: 'Эксклюзивный стикер', icon: '🌟', description: 'Эксклюзивный стикер', telegram_sticker_id: 'exclusive_1' }
        ]
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    console.log('Приложение загружено');
    
    // Инициализация Telegram WebApp
    if (tg) {
        tg.ready();
        tg.expand();
        
        // Получаем данные пользователя из Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
            console.log('Пользователь:', user);
            // Можно использовать user.id для идентификации
        }
    }
    
    // Загружаем сохраненные данные
    loadUserData();
    
    // Обновляем отображение
    updateStarsDisplay();
    updateInventoryDisplay();
    
    // Добавляем обработчики событий
    setupEventListeners();
    
    // Показываем уведомление о загрузке
    showNotification('Добро пожаловать в Кейс Мастер!', 'success');
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
    
    // Обработчик для кнопки покупки звезд
    document.getElementById('buy-stars-btn').addEventListener('click', function() {
        buyStars();
    });
    
    // Обработчик для закрытия модального окна
    document.getElementById('close-modal').addEventListener('click', function() {
        closePrizeModal();
    });
    
    // Обработчик для кнопки "Забрать приз"
    document.getElementById('claim-prize-btn').addEventListener('click', function() {
        claimPrize();
    });
}

// Открытие кейса
async function openCase(caseType, price) {
    if (isOpening) return;
    
    // Проверяем баланс
    if (userStars < price) {
        showNotification('Недостаточно звезд!', 'error');
        return;
    }
    
    isOpening = true;
    
    // Показываем анимацию загрузки
    showLoadingOverlay();
    
    // Списываем звезды
    userStars -= price;
    updateStarsDisplay();
    
    // Показываем анимацию открытия кейса
    await showCaseOpeningAnimation(caseType);
    
    // Получаем приз
    const prize = getRandomPrize(caseType);
    
    // Добавляем приз в инвентарь
    userInventory.push(prize);
    
    // Сохраняем данные
    saveUserData();
    
    // Показываем приз
    showPrize(prize);
    
    // Скрываем анимацию загрузки
    hideLoadingOverlay();
    
    isOpening = false;
}

// Анимация открытия кейса
async function showCaseOpeningAnimation(caseType) {
    const openingArea = document.getElementById('opening-area');
    const caseBox = document.getElementById('case-box');
    const sparkles = document.getElementById('sparkles');
    
    // Показываем область анимации
    openingArea.style.display = 'block';
    
    // Анимация тряски кейса
    caseBox.style.animation = 'caseShake 0.5s ease-in-out infinite';
    
    // Создаем искры
    createSparkles(sparkles);
    
    // Ждем 2 секунды
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Открываем кейс
    caseBox.classList.add('opening');
    
    // Ждем еще 1 секунду
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Создание искр
function createSparkles(container) {
    container.innerHTML = '';
    
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(sparkle);
    }
}

// Получение случайного приза
function getRandomPrize(caseType) {
    const config = caseConfig[caseType];
    const prizes = config.prizes;
    
    // Простая система вероятностей
    const random = Math.random();
    let prize;
    
    if (random < 0.1) {
        // 10% шанс на редкий приз (последний в списке)
        prize = prizes[prizes.length - 1];
    } else if (random < 0.3) {
        // 20% шанс на хороший приз (предпоследний)
        prize = prizes[prizes.length - 2] || prizes[0];
    } else {
        // 70% шанс на обычный приз (первый)
        prize = prizes[0];
    }
    
    // Добавляем уникальный ID
    prize.id = Date.now() + Math.random();
    prize.claimed = false;
    
    return prize;
}

// Показ приза
function showPrize(prize) {
    const prizeReveal = document.getElementById('prize-reveal');
    const prizeIcon = document.getElementById('prize-icon');
    const prizeName = document.getElementById('prize-name');
    const prizeDescription = document.getElementById('prize-description');
    
    // Заполняем данные приза
    prizeIcon.textContent = prize.icon;
    prizeName.textContent = prize.name;
    prizeDescription.textContent = prize.description;
    
    // Показываем анимацию
    prizeReveal.classList.add('show');
    
    // Через 2 секунды показываем модальное окно
    setTimeout(() => {
        showPrizeModal(prize);
    }, 2000);
}

// Показ модального окна с призом
function showPrizeModal(prize) {
    const modal = document.getElementById('prize-modal');
    const modalPrizeIcon = document.getElementById('modal-prize-icon');
    const modalPrizeName = document.getElementById('modal-prize-name');
    const modalPrizeDescription = document.getElementById('modal-prize-description');
    
    // Заполняем данные
    modalPrizeIcon.textContent = prize.icon;
    modalPrizeName.textContent = prize.name;
    modalPrizeDescription.textContent = prize.description;
    
    // Сохраняем приз для кнопки "Забрать"
    modal.dataset.prize = JSON.stringify(prize);
    
    // Показываем модальное окно
    modal.classList.add('show');
}

// Закрытие модального окна
function closePrizeModal() {
    const modal = document.getElementById('prize-modal');
    modal.classList.remove('show');
    
    // Скрываем область анимации
    const openingArea = document.getElementById('opening-area');
    openingArea.style.display = 'none';
    
    // Сбрасываем анимацию кейса
    const caseBox = document.getElementById('case-box');
    caseBox.classList.remove('opening');
    caseBox.style.animation = '';
    
    // Скрываем показ приза
    const prizeReveal = document.getElementById('prize-reveal');
    prizeReveal.classList.remove('show');
}

// Забрать приз
async function claimPrize() {
    const modal = document.getElementById('prize-modal');
    const prize = JSON.parse(modal.dataset.prize);
    
    try {
        // Отправляем запрос на сервер для обработки приза
        const response = await fetch('/api/prize/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: tg?.initDataUnsafe?.user?.id || 'test_user',
                prize: prize
            })
        });
        
        if (response.ok) {
            // Отмечаем приз как полученный
            prize.claimed = true;
            
            // Обновляем инвентарь
            updateInventoryDisplay();
            
            // Показываем уведомление
            showNotification('Приз получен!', 'success');
            
            // Закрываем модальное окно
            closePrizeModal();
        } else {
            throw new Error('Ошибка при получении приза');
        }
    } catch (error) {
        console.error('Ошибка при получении приза:', error);
        showNotification('Ошибка при получении приза', 'error');
    }
}

// Покупка звезд
function buyStars() {
    if (tg && tg.showPopup) {
        // В реальном приложении здесь будет интеграция с Telegram Stars
        tg.showPopup({
            title: 'Покупка звезд',
            message: 'Функция покупки звезд будет доступна в полной версии приложения',
            buttons: [
                { id: 'ok', text: 'OK', type: 'ok' }
            ]
        });
    } else {
        // Для тестирования добавляем звезды
        userStars += 100;
        updateStarsDisplay();
        showNotification('Добавлено 100 звезд (тестовый режим)', 'success');
    }
}

// Обновление отображения звезд
function updateStarsDisplay() {
    const starsCount = document.getElementById('stars-count');
    if (starsCount) {
        starsCount.textContent = userStars;
    }
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

// Загрузка данных пользователя
async function loadUserData() {
    try {
        const response = await fetch('/api/user/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: tg?.initDataUnsafe?.user?.id || 'test_user',
                init_data: tg?.initData || 'test_data'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            userStars = data.stars_balance || 100;
            userInventory = data.inventory || [];
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        // Используем значения по умолчанию
        userStars = 100;
        userInventory = [];
    }
}

// Сохранение данных пользователя
async function saveUserData() {
    try {
        const response = await fetch('/api/user/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: tg?.initDataUnsafe?.user?.id || 'test_user',
                stars_balance: userStars,
                inventory: userInventory,
                init_data: tg?.initData || 'test_data'
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при сохранении данных');
        }
    } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
    }
}

// Экспорт функций для тестирования
window.userStars = userStars;
window.userInventory = userInventory;
window.openCase = openCase;
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
