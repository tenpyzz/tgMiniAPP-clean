# 🤖 ИСПРАВЛЕНИЕ БОТА - Инструкция

## 🚨 Проблема: Бот не отвечает на /start

Я исправил код webhook, теперь бот будет отвечать на команды!

## 📋 Что нужно сделать:

### 1. Обнови файл `server.js` в GitHub:

Зайди на GitHub.com в свой репозиторий и обнови файл `server.js`:

1. Найди файл `server.js`
2. Нажми "Edit" (карандаш)
3. Найди раздел "// Webhook для Telegram бота" (примерно строка 103)
4. Замени весь блок webhook на новый код

### 2. Новый код webhook (строки 103-230):

```javascript
// Webhook для Telegram бота
app.post('/bot/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log('Bot webhook received:', update);
        
        // Обработка обновлений от Telegram
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text;
            
            console.log(`Message from ${chatId}: ${text}`);
            
            // Обработка команд
            if (text === '/start') {
                console.log('Start command received');
                
                // Отправляем приветственное сообщение
                const welcomeMessage = `🎮 Добро пожаловать в Кейс Мастер!

🎁 Открывайте кейсы и получайте призы:
• Подарки для друзей
• Стикеры
• Telegram Premium
• И многое другое!

🚀 Нажмите кнопку ниже, чтобы начать играть!`;

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: "🎮 Открыть игру",
                            web_app: {
                                url: "https://web-production-877f.up.railway.app/"
                            }
                        }
                    ]]
                };

                // Отправляем сообщение через Telegram API
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: welcomeMessage,
                        reply_markup: keyboard
                    })
                });
                
            } else if (text === '/help') {
                const helpMessage = `🎮 Кейс Мастер - Помощь

📋 Доступные команды:
/start - Начать игру
/help - Показать эту справку

🎁 Типы кейсов:
• Бронзовый (10 ⭐)
• Серебряный (25 ⭐)
• Золотой (50 ⭐)
• Алмазный (100 ⭐)

🚀 Нажмите кнопку ниже для начала игры!`;

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: "🎮 Играть",
                            web_app: {
                                url: "https://web-production-877f.up.railway.app/"
                            }
                        }
                    ]]
                };

                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: helpMessage,
                        reply_markup: keyboard
                    })
                });
                
            } else {
                // Ответ на неизвестные сообщения
                const unknownMessage = `🤔 Не понимаю эту команду.

Используйте /start для начала игры или /help для справки.`;

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: "🎮 Начать игру",
                            web_app: {
                                url: "https://web-production-877f.up.railway.app/"
                            }
                        }
                    ]]
                };

                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: unknownMessage,
                        reply_markup: keyboard
                    })
                });
            }
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error('Bot webhook error:', error);
        res.status(500).json({ error: 'Webhook error' });
    }
});
```

### 3. Сохрани изменения:
- Нажми "Commit changes"
- Сообщение: "Fix bot webhook - add responses to commands"
- Нажми "Commit changes"

### 4. Railway автоматически перезапустит сервер

### 5. Тестирование:
После обновления (2-3 минуты):
1. Напиши боту `/start` - должен ответить приветствием с кнопкой
2. Напиши боту `/help` - должен показать справку
3. Напиши любое другое сообщение - должен предложить игру

## 🎯 Результат:
После обновления бот будет:
- ✅ Отвечать на `/start` приветственным сообщением
- ✅ Отвечать на `/help` справкой
- ✅ Отвечать на другие сообщения
- ✅ Показывать кнопку для открытия мини-приложения

**Обновление займет 2-3 минуты! 🚀**
