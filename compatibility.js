// Утилиты для обеспечения совместимости между устройствами
// Этот файл обеспечивает одинаковую работу приложения на всех платформах

class CompatibilityManager {
    constructor() {
        this.deviceInfo = this.detectDevice();
        this.init();
    }

    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(userAgent);
        const isAndroid = /android/i.test(userAgent);
        const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
        const isChrome = /chrome/i.test(userAgent);
        const isFirefox = /firefox/i.test(userAgent);
        const isEdge = /edge/i.test(userAgent);
        const isOpera = /opera/i.test(userAgent);
        
        return {
            isMobile,
            isIOS,
            isAndroid,
            isSafari,
            isChrome,
            isFirefox,
            isEdge,
            isOpera,
            isDesktop: !isMobile,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            userAgent: userAgent
        };
    }

    init() {
        this.setupViewport();
        this.setupTouchEvents();
        this.setupAnimations();
        this.setupScrollBehavior();
        this.setupFontRendering();
        this.applyDeviceClasses();
    }

    setupViewport() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, shrink-to-fit=no');
        }
    }

    setupTouchEvents() {
        // Универсальная настройка touch событий
        let lastTouchEnd = 0;
        
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // Предотвращение нежелательного скролла
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.cases-grid, .inventory-grid, .shop-content')) {
                return;
            }
            e.preventDefault();
        }, { passive: false });

        // Отключение жестов масштабирования
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                e.preventDefault();
            });
        });
    }

    setupAnimations() {
        // Принудительное ускорение для всех браузеров
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

        // Специальные настройки для iOS
        if (this.deviceInfo.isIOS) {
            document.body.style.webkitOverflowScrolling = 'touch';
            document.body.style.webkitTransform = 'translate3d(0, 0, 0)';
            document.body.style.transform = 'translate3d(0, 0, 0)';
        }

        // Специальные настройки для Android
        if (this.deviceInfo.isAndroid) {
            document.body.style.webkitTransform = 'translateZ(0)';
            document.body.style.transform = 'translateZ(0)';
        }
    }

    setupScrollBehavior() {
        // Универсальная настройка скролла
        document.documentElement.style.scrollBehavior = 'smooth';
        
        // Специальные настройки для iOS
        if (this.deviceInfo.isIOS) {
            document.body.style.webkitOverflowScrolling = 'touch';
        }
    }

    setupFontRendering() {
        // Универсальная настройка рендеринга шрифтов
        document.body.style.webkitFontSmoothing = 'antialiased';
        document.body.style.mozOsxFontSmoothing = 'grayscale';
        document.body.style.textRendering = 'optimizeLegibility';
    }

    applyDeviceClasses() {
        // Применяем классы для устройства
        if (this.deviceInfo.isMobile) {
            document.body.classList.add('mobile-device');
        }
        if (this.deviceInfo.isIOS) {
            document.body.classList.add('ios-device');
        }
        if (this.deviceInfo.isAndroid) {
            document.body.classList.add('android-device');
        }
        if (this.deviceInfo.isDesktop) {
            document.body.classList.add('desktop-device');
        }
        if (this.deviceInfo.isSafari) {
            document.body.classList.add('safari-browser');
        }
        if (this.deviceInfo.isChrome) {
            document.body.classList.add('chrome-browser');
        }
        if (this.deviceInfo.isFirefox) {
            document.body.classList.add('firefox-browser');
        }

        // Применяем классы для поддержки функций
        if (!this.supportsFeature('backdrop-filter')) {
            document.body.classList.add('no-backdrop-filter');
        }
        if (!this.supportsFeature('css-grid')) {
            document.body.classList.add('no-css-grid');
        }
        if (!this.supportsFeature('flexbox')) {
            document.body.classList.add('no-flexbox');
        }
    }

    // Метод для получения информации об устройстве
    getDeviceInfo() {
        return this.deviceInfo;
    }

    // Метод для проверки поддержки определенных функций
    supportsFeature(feature) {
        switch (feature) {
            case 'backdrop-filter':
                return CSS.supports('backdrop-filter', 'blur(10px)');
            case 'css-grid':
                return CSS.supports('display', 'grid');
            case 'flexbox':
                return CSS.supports('display', 'flex');
            case 'touch':
                return 'ontouchstart' in window;
            case 'webgl':
                return !!document.createElement('canvas').getContext('webgl');
            default:
                return false;
        }
    }

    // Метод для оптимизации анимаций на слабых устройствах
    shouldReduceMotion() {
        return this.deviceInfo.isMobile && 
               (this.deviceInfo.screenWidth <= 480 || 
                this.deviceInfo.devicePixelRatio < 2 ||
                window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    // Метод для настройки производительности
    optimizePerformance() {
        if (this.shouldReduceMotion()) {
            document.body.classList.add('reduced-motion');
        }

        // Отключаем сложные эффекты на слабых устройствах
        if (this.deviceInfo.isMobile && this.deviceInfo.screenWidth <= 480) {
            document.body.classList.add('low-performance');
        }
    }
}

// Инициализация менеджера совместимости
const compatibilityManager = new CompatibilityManager();

// Экспорт для использования в других файлах
window.CompatibilityManager = CompatibilityManager;
window.compatibilityManager = compatibilityManager;
