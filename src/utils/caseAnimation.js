// Анимация открытия кейса
import { generateCasePrize } from './prizeGenerator.js';

class CaseAnimation {
    constructor() {
        this.isAnimating = false;
        this.animationDuration = 3000; // 3 секунды
        this.scrollSpeed = 160; // пикселей за шаг
        this.currentPosition = 0;
        this.targetPosition = 0;
        this.prizeStrip = null;
        this.prizes = [];
        this.selectedPrize = null;
    }

    /**
     * Запуск анимации открытия кейса
     * @param {string} caseType - Тип кейса
     * @param {Function} onComplete - Callback при завершении
     */
    async startAnimation(caseType, onComplete) {
        if (this.isAnimating) {
            console.warn('Анимация уже запущена');
            return;
        }

        this.isAnimating = true;
        this.prizeStrip = document.getElementById('prize-strip');
        
        if (!this.prizeStrip) {
            console.error('Элемент prize-strip не найден');
            this.isAnimating = false;
            return;
        }

        try {
            // Генерируем призы для полоски
            await this.generatePrizes(caseType);
            
            // Запускаем анимацию прокрутки
            await this.startScrolling();
            
            // Показываем результат
            this.showResult();
            
            // Вызываем callback
            if (onComplete) {
                onComplete(this.selectedPrize);
            }

        } catch (error) {
            console.error('Ошибка анимации:', error);
        } finally {
            this.isAnimating = false;
        }
    }

    /**
     * Генерация призов для полоски
     * @param {string} caseType - Тип кейса
     */
    async generatePrizes(caseType) {
        this.prizes = [];
        
        // Генерируем много призов для полоски (минимум 50)
        const totalPrizes = 50;
        
        for (let i = 0; i < totalPrizes; i++) {
            const prize = generateCasePrize(caseType);
            this.prizes.push(prize);
        }

        // Выбираем случайный приз из середины (чтобы анимация выглядела естественно)
        const middleIndex = Math.floor(totalPrizes / 2);
        const randomOffset = Math.floor(Math.random() * 10) - 5; // ±5 призов от центра
        this.selectedPrize = this.prizes[middleIndex + randomOffset];

        // Заменяем выбранный приз на финальный
        this.prizes[middleIndex + randomOffset] = this.selectedPrize;

        // Очищаем полоску и добавляем призы
        this.prizeStrip.innerHTML = '';
        this.prizes.forEach((prize, index) => {
            const prizeElement = this.createPrizeElement(prize, index);
            this.prizeStrip.appendChild(prizeElement);
        });

        // Вычисляем целевую позицию (выбранный приз должен быть в центре)
        this.targetPosition = -(middleIndex + randomOffset) * this.scrollSpeed;
    }

    /**
     * Создание элемента приза
     * @param {Object} prize - Данные приза
     * @param {number} index - Индекс приза
     * @returns {HTMLElement} - DOM элемент приза
     */
    createPrizeElement(prize, index) {
        const prizeElement = document.createElement('div');
        prizeElement.className = `prize-item ${prize.rarity}`;
        prizeElement.innerHTML = `
            <div class="prize-item-icon">${this.getPrizeIcon(prize)}</div>
            <div class="prize-item-name">${prize.name}</div>
        `;
        return prizeElement;
    }

    /**
     * Получение иконки приза
     * @param {Object} prize - Данные приза
     * @returns {string} - Иконка
     */
    getPrizeIcon(prize) {
        const icons = {
            sticker: '📄',
            gift: '🎁',
            premium: '⭐',
            stars: '💫'
        };
        return icons[prize.type] || '❓';
    }

    /**
     * Запуск анимации прокрутки
     */
    async startScrolling() {
        return new Promise((resolve) => {
            // Начинаем с быстрой прокрутки
            this.startFastScrolling();
            
            // Через 2 секунды начинаем замедление
            setTimeout(() => {
                this.startSlowing();
            }, 2000);
            
            // Через 3 секунды останавливаемся
            setTimeout(() => {
                this.stopAtTarget();
                resolve();
            }, this.animationDuration);
        });
    }

    /**
     * Быстрая прокрутка
     */
    startFastScrolling() {
        this.prizeStrip.classList.add('scrolling');
        this.prizeStrip.style.animationDuration = '0.08s';
    }

    /**
     * Замедление прокрутки
     */
    startSlowing() {
        this.prizeStrip.classList.remove('scrolling');
        this.prizeStrip.classList.add('slowing');
        
        // Плавно перемещаем к целевой позиции
        this.prizeStrip.style.transition = 'transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.prizeStrip.style.transform = `translateX(${this.targetPosition}px)`;
    }

    /**
     * Остановка на целевом призе
     */
    stopAtTarget() {
        this.prizeStrip.classList.remove('scrolling', 'slowing');
        this.prizeStrip.style.transition = 'none';
        this.prizeStrip.style.transform = `translateX(${this.targetPosition}px)`;
        
        // Подсвечиваем выбранный приз
        this.highlightSelectedPrize();
    }

    /**
     * Подсветка выбранного приза
     */
    highlightSelectedPrize() {
        const prizeElements = this.prizeStrip.querySelectorAll('.prize-item');
        const middleIndex = Math.floor(prizeElements.length / 2);
        
        // Убираем подсветку со всех призов
        prizeElements.forEach(el => el.classList.remove('selected'));
        
        // Подсвечиваем центральный приз
        if (prizeElements[middleIndex]) {
            prizeElements[middleIndex].classList.add('selected');
        }
    }

    /**
     * Показ результата
     */
    showResult() {
        // Активируем эффекты
        this.activateEffects();
        
        // Показываем анимацию появления приза
        this.showPrizeReveal();
    }

    /**
     * Активация эффектов
     */
    activateEffects() {
        // Активируем лучи света
        const lightRays = document.querySelector('.light-rays');
        if (lightRays) {
            lightRays.classList.add('active');
        }

        // Активируем взрыв
        const explosion = document.getElementById('explosion-effect');
        if (explosion) {
            explosion.classList.add('active');
        }

        // Активируем вспышку
        const flash = document.getElementById('light-flash');
        if (flash) {
            flash.classList.add('active');
        }

        // Активируем дым
        const smoke = document.getElementById('smoke-effect');
        if (smoke) {
            smoke.classList.add('active');
        }
    }

    /**
     * Показ анимации появления приза
     */
    showPrizeReveal() {
        const prizeReveal = document.getElementById('prize-reveal');
        if (!prizeReveal || !this.selectedPrize) return;

        // Заполняем данные приза
        const iconElement = document.getElementById('prize-icon');
        const nameElement = document.getElementById('prize-name');
        const descriptionElement = document.getElementById('prize-description');
        const rarityElement = document.getElementById('prize-rarity');

        if (iconElement) iconElement.textContent = this.getPrizeIcon(this.selectedPrize);
        if (nameElement) nameElement.textContent = this.selectedPrize.name;
        if (descriptionElement) descriptionElement.textContent = this.selectedPrize.description || '';
        if (rarityElement) {
            rarityElement.textContent = this.getRarityName(this.selectedPrize.rarity);
            rarityElement.className = `prize-rarity ${this.selectedPrize.rarity}`;
        }

        // Показываем анимацию
        prizeReveal.classList.add('show');
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
     * Сброс анимации
     */
    reset() {
        this.isAnimating = false;
        this.currentPosition = 0;
        this.targetPosition = 0;
        this.prizes = [];
        this.selectedPrize = null;

        if (this.prizeStrip) {
            this.prizeStrip.classList.remove('scrolling', 'slowing');
            this.prizeStrip.style.transition = '';
            this.prizeStrip.style.transform = '';
            this.prizeStrip.innerHTML = '';
        }

        // Скрываем эффекты
        const lightRays = document.querySelector('.light-rays');
        if (lightRays) lightRays.classList.remove('active');

        const explosion = document.getElementById('explosion-effect');
        if (explosion) explosion.classList.remove('active');

        const flash = document.getElementById('light-flash');
        if (flash) flash.classList.remove('active');

        const smoke = document.getElementById('smoke-effect');
        if (smoke) smoke.classList.remove('active');

        // Скрываем результат
        const prizeReveal = document.getElementById('prize-reveal');
        if (prizeReveal) prizeReveal.classList.remove('show');
    }

    /**
     * Проверка, запущена ли анимация
     * @returns {boolean} - Статус анимации
     */
    isRunning() {
        return this.isAnimating;
    }
}

export const caseAnimation = new CaseAnimation();
