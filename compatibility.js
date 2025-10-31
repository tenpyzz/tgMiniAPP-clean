// Утилиты для обеспечения совместимости между устройствами
// УНИВЕРСАЛЬНЫЙ КОД - ОДИНАКОВЫЙ ДЛЯ ВСЕХ УСТРОЙСТВ И ПЛАТФОРМ

class CompatibilityManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupViewport();
        this.setupUniversalEvents();
        this.setupUniversalAnimations();
        this.setupUniversalScroll();
        this.setupUniversalFonts();
    }

    setupViewport() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no');
        }
    }

    setupUniversalEvents() {
        // УНИВЕРСАЛЬНАЯ настройка событий для всех устройств
        let lastTouchEnd = 0;
        
        // Универсальная обработка touch событий
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Универсальное предотвращение нежелательного скролла
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.cases-grid, .inventory-grid, .shop-content')) {
                return;
            }
            e.preventDefault();
        }, { passive: false });

        // Универсальное отключение жестов масштабирования
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                e.preventDefault();
            });
        });
    }

    setupUniversalAnimations() {
        // УНИВЕРСАЛЬНОЕ ускорение для ВСЕХ браузеров и устройств
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-transform: translateZ(0) !important;
                transform: translateZ(0) !important;
                -webkit-backface-visibility: hidden !important;
                backface-visibility: hidden !important;
            }
        `;
        document.head.appendChild(style);

        // УНИВЕРСАЛЬНЫЕ настройки для ВСЕХ устройств
        document.body.style.webkitOverflowScrolling = 'touch';
        document.body.style.webkitTransform = 'translate3d(0, 0, 0)';
        document.body.style.transform = 'translate3d(0, 0, 0)';
    }

    setupUniversalScroll() {
        // УНИВЕРСАЛЬНАЯ настройка скролла для ВСЕХ устройств
        document.documentElement.style.scrollBehavior = 'smooth';
        document.body.style.webkitOverflowScrolling = 'touch';
    }

    setupUniversalFonts() {
        // УНИВЕРСАЛЬНАЯ настройка рендеринга шрифтов для ВСЕХ устройств
        document.body.style.webkitFontSmoothing = 'antialiased';
        document.body.style.mozOsxFontSmoothing = 'grayscale';
        document.body.style.textRendering = 'optimizeLegibility';
        
        // УНИВЕРСАЛЬНЫЕ настройки для ВСЕХ устройств - принудительное отображение текста в табах
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.style.webkitUserSelect = 'auto';
            btn.style.userSelect = 'auto';
            btn.style.webkitTextSizeAdjust = '100%';
            btn.style.textSizeAdjust = '100%';
            btn.style.fontSize = '0.9rem';
            btn.style.fontWeight = 'bold';
            btn.style.color = 'white';
            btn.style.textAlign = 'center';
            btn.style.lineHeight = '1.2';
            btn.style.whiteSpace = 'nowrap';
            btn.style.overflow = 'visible';
            btn.style.textOverflow = 'unset';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.flexDirection = 'row';
            btn.style.gap = '0.3rem';
        });
    }

    // Неиспользуемые методы supportsFeature и optimizePerformance удалены
}

// Инициализация менеджера совместимости (автоматически выполняется при загрузке)
const compatibilityManager = new CompatibilityManager();
