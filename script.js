// Telegram WebApp API
const tg = window.Telegram.WebApp;

// Глобальные переменные
let userStars = 100; // Начальный баланс звезд
let userInventory = []; // Инвентарь пользователя
let isOpening = false; // Флаг открытия кейса

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
        await loadUserData();
    }, 30000);
    
    // Обновляем данные при возвращении на вкладку
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Возвращение на вкладку - обновляем данные');
            loadUserData();
        }
    });
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async function() {
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
    console.log('Загружаем данные пользователя...');
    const dataLoaded = await loadUserData();
    
    if (dataLoaded) {
        console.log('Данные успешно загружены с сервера');
        showNotification('Данные загружены!', 'success');
    } else {
        console.log('Используем локальные данные по умолчанию');
        showNotification('Добро пожаловать в Кейс Мастер!', 'success');
    }
    
    // Обновляем отображение
    updateStarsDisplay();
    updateInventoryDisplay();
    
    // Добавляем обработчики событий
    setupEventListeners();
    
    // Запускаем синхронизацию данных
    startDataSync();
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

// Глобальная переменная для хранения цены текущего кейса
let currentCasePrice = 0;

// Открытие кейса
async function openCase(caseType, price) {
    if (isOpening) return;
    
    // Проверяем баланс
    if (userStars < price) {
        showNotification('Недостаточно звезд!', 'error');
        return;
    }
    
    isOpening = true;
    currentCasePrice = price;
    
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
    
    isOpening = false;
}

// Анимация открытия кейса в стиле CS:GO
async function showCaseOpeningAnimation(caseType) {
    const openingArea = document.getElementById('opening-area');
    const caseBox = document.getElementById('case-box');
    const lightRays = document.querySelector('.light-rays');
    const particlesContainer = document.getElementById('particles-container');
    const explosionEffect = document.getElementById('explosion-effect');
    const lightFlash = document.getElementById('light-flash');
    const smokeEffect = document.getElementById('smoke-effect');
    
    // Активируем полноэкранный режим
    document.body.classList.add('case-opening');
    openingArea.classList.add('fullscreen');
    openingArea.style.display = 'block';
    
    // Показываем кнопку выхода
    const exitBtn = document.getElementById('exit-fullscreen-btn');
    exitBtn.style.display = 'block';
    
    // Настраиваем кейс в зависимости от типа
    setupCaseForType(caseType, caseBox);
    
    // Фаза 1: Подготовка (1 секунда)
    caseBox.classList.add('active');
    lightRays.classList.add('active');
    createParticles(particlesContainer, 30);
    showSoundEffect('🔊 Подготовка к открытию...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Фаза 2: Тряска (1.5 секунды)
    caseBox.classList.remove('active');
    caseBox.classList.add('shaking');
    createParticles(particlesContainer, 50);
    showSoundEffect('💥 Кейс трясется!');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Фаза 3: Вращение (1 секунда)
    caseBox.classList.remove('shaking');
    caseBox.classList.add('spinning');
    lightRays.style.animationDuration = '0.5s';
    showSoundEffect('🌪️ Вращение кейса!');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Фаза 4: Открытие кейса
    caseBox.classList.remove('spinning');
    caseBox.classList.add('opening');
    
    // Запускаем эффекты взрыва
    explosionEffect.classList.add('active');
    lightFlash.classList.add('active');
    smokeEffect.classList.add('active');
    showSoundEffect('💥💥💥 ВЗРЫВ! Кейс открывается!');
    
    // Создаем финальные частицы
    createParticles(particlesContainer, 100);
    
    // Открываем крышку кейса
    const caseLid = caseBox.querySelector('.case-lid');
    caseLid.style.transform = 'rotateX(-90deg)';
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Скрываем эффекты
    explosionEffect.classList.remove('active');
    lightFlash.classList.remove('active');
    smokeEffect.classList.remove('active');
    lightRays.classList.remove('active');
}

// Настройка кейса в зависимости от типа
function setupCaseForType(caseType, caseBox) {
    const caseLid = caseBox.querySelector('.case-lid');
    const caseBody = caseBox.querySelector('.case-body');
    
    // Убираем предыдущие классы
    caseBox.className = 'case-box';
    caseLid.className = 'case-lid';
    caseBody.className = 'case-body';
    
    // Применяем стили в зависимости от типа кейса
    switch(caseType) {
        case 'bronze':
            caseLid.style.background = 'linear-gradient(135deg, #cd7f32, #b8860b, #8b4513)';
            caseBody.style.background = 'linear-gradient(135deg, #cd7f32, #b8860b, #8b4513)';
            break;
        case 'silver':
            caseLid.style.background = 'linear-gradient(135deg, #c0c0c0, #a8a8a8, #808080)';
            caseBody.style.background = 'linear-gradient(135deg, #c0c0c0, #a8a8a8, #808080)';
            break;
        case 'gold':
            caseLid.style.background = 'linear-gradient(135deg, #ffd700, #ffb347, #ff8c00)';
            caseBody.style.background = 'linear-gradient(135deg, #ffd700, #ffb347, #ff8c00)';
            break;
        case 'diamond':
            caseLid.style.background = 'linear-gradient(135deg, #b9f2ff, #87ceeb, #4682b4)';
            caseBody.style.background = 'linear-gradient(135deg, #b9f2ff, #87ceeb, #4682b4)';
            break;
    }
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
    
    // Через 3 секунды показываем модальное окно
    setTimeout(() => {
        showPrizeModal(prize, rarity);
    }, 3000);
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
    
    // Показываем модальное окно с анимацией
    modal.classList.add('show');
    
    // Добавляем эффект появления
    setTimeout(() => {
        modal.classList.add('modal-appear');
    }, 100);
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
        const requestData = {
            user_id: tg?.initDataUnsafe?.user?.id || 'test_user',
            telegram_name: tg?.initDataUnsafe?.user?.first_name || 'Unknown User',
            init_data: tg?.initData || 'test_data'
        };
        
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
            
            userStars = data.stars_balance || 100;
            userInventory = data.inventory || [];
            
            console.log(`Данные загружены: ${userStars} звезд, ${userInventory.length} предметов в инвентаре`);
            
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
        // Используем значения по умолчанию только если это первая загрузка
        if (userStars === 100 && userInventory.length === 0) {
            userStars = 100;
            userInventory = [];
        }
        return false;
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
                telegram_name: tg?.initDataUnsafe?.user?.first_name || 'Unknown User',
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
window.refreshData = async function() {
    console.log('Ручное обновление данных...');
    const success = await loadUserData();
    if (success) {
        showNotification('Данные обновлены!', 'success');
    } else {
        showNotification('Ошибка обновления данных', 'error');
    }
};

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
    
    // Возвращаем звезды (так как кейс не был открыт)
    if (currentCasePrice > 0) {
        userStars += currentCasePrice;
        currentCasePrice = 0;
        updateStarsDisplay();
    }
    
    // Сбрасываем флаг открытия
    isOpening = false;
    
    showNotification('Открытие кейса отменено', 'info');
};
