const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Создаём папку для БД если её нет
const dbPath = path.join(__dirname, 'data');
const fs = require('fs');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const db = new sqlite3.Database(path.join(dbPath, 'users.db'));

// ===== ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ =====
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN;

// Формируем URLs
const BASE_URL = RAILWAY_PUBLIC_DOMAIN 
  ? `https://${RAILWAY_PUBLIC_DOMAIN}` 
  : `http://localhost:${PORT}`;
const REDIRECT_URI = `${BASE_URL}/discord/callback`;

console.log('🚀 Starting server...');
console.log('📡 Base URL:', BASE_URL);
console.log('🔗 Redirect URI:', REDIRECT_URI);

// Инициализация БД
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    discord_username TEXT,
    discord_id TEXT,
    created_at TEXT
  )`, (err) => {
    if (err) console.error('Error creating users table:', err);
    else console.log('✅ Users table ready');
  });
  
  db.run(`CREATE TABLE IF NOT EXISTS states (
    state TEXT PRIMARY KEY,
    telegram_id TEXT,
    created_at TEXT
  )`, (err) => {
    if (err) console.error('Error creating states table:', err);
    else console.log('✅ States table ready');
  });
});

// Автоочистка старых state токенов
setInterval(() => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  db.run('DELETE FROM states WHERE created_at < ?', [tenMinutesAgo], (err) => {
    if (err) console.error('Cleanup error:', err);
  });
}, 60000);

// ===== ГЛАВНАЯ СТРАНИЦА =====
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Discord OAuth Server</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 50px auto;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h1 { 
          color: #5865F2; 
          margin-bottom: 20px;
        }
        .status {
          background: #d4edda;
          color: #155724;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        .endpoint {
          background: #f8f9fa;
          padding: 15px;
          border-left: 4px solid #007bff;
          margin: 15px 0;
          border-radius: 5px;
        }
        code {
          background: #e9ecef;
          padding: 3px 8px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
        }
        .test-link {
          display: inline-block;
          margin-top: 10px;
          padding: 10px 20px;
          background: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
        }
        .test-link:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Discord OAuth Server работает!</h1>
        
        <div class="status">
          <strong>🟢 Статус:</strong> Сервер активен и готов к работе
        </div>
        
        <h2>📡 Доступные endpoints:</h2>
        
        <div class="endpoint">
          <strong>1. Веб-кабинет (для SendPulse)</strong><br>
          <code>GET /cabinet?telegram_id=ВАША_АЙДИ</code><br>
          <a href="/cabinet?telegram_id=123456789" class="test-link">🧪 Тест</a>
        </div>
        
        <div class="endpoint">
          <strong>2. Генерация OAuth ссылки</strong><br>
          <code>GET /start-oauth?telegram_id=ВАША_АЙДИ</code><br>
          <a href="/start-oauth?telegram_id=123456789" class="test-link">🧪 Тест</a>
        </div>
        
        <div class="endpoint">
          <strong>3. Проверка привязки</strong><br>
          <code>GET /check-discord?telegram_id=ВАША_АЙДИ</code><br>
          <a href="/check-discord?telegram_id=123456789" class="test-link">🧪 Тест</a>
        </div>
        
        <div class="endpoint">
          <strong>4. Discord callback (автоматический)</strong><br>
          <code>GET /discord/callback</code>
        </div>
        
        <h2>🔗 Для SendPulse используйте:</h2>
        <div class="endpoint">
          <code>${BASE_URL}/cabinet?telegram_id={{user_id}}</code>
        </div>
      </div>
    </body>
    </html>
  `);
});

// ===== ВЕБ-КАБИНЕТ =====
app.get('/cabinet', (req, res) => {
  const telegramId = req.query.telegram_id;
  
  if (!telegramId) {
    return res.send(`
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Ошибка</title>
      </head>
      <body style="font-family: Arial; text-align: center; padding: 50px; background: #f44336; color: white;">
        <h1>❌ Ошибка</h1>
        <p>Telegram ID не указан</p>
      </body>
      </html>
    `);
  }
  
  db.get('SELECT discord_username FROM users WHERE telegram_id = ?', 
    [telegramId], 
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.send('<h1>Ошибка базы данных</h1>');
      }
      
      if (row) {
        // Discord привязан
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Личный кабинет</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 50px auto;
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                animation: slideIn 0.5s ease-out;
              }
              @keyframes slideIn {
                from { transform: translateY(-30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
              h1 {
                color: #333;
                margin-bottom: 30px;
                text-align: center;
              }
              .info-block {
                background: #f5f5f5;
                padding: 25px;
                border-radius: 15px;
                margin: 20px 0;
              }
              .label {
                color: #666;
                font-size: 14px;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .value {
                color: #5865F2;
                font-size: 24px;
                font-weight: bold;
              }
              .success {
                color: #4caf50;
                text-align: center;
                margin-top: 25px;
                font-size: 18px;
              }
              .refresh-btn {
                display: block;
                width: 100%;
                padding: 15px;
                background: #f5f5f5;
                color: #333;
                text-align: center;
                text-decoration: none;
                border-radius: 10px;
                margin-top: 20px;
                font-weight: 500;
                transition: background 0.3s;
              }
              .refresh-btn:hover {
                background: #e0e0e0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>👤 Личный кабинет</h1>
              
              <div class="info-block">
                <div class="label">🎮 Discord аккаунт</div>
                <div class="value">${row.discord_username}</div>
              </div>
              
              <div class="success">
                ✅ Discord успешно привязан!
              </div>
              
              <a href="/cabinet?telegram_id=${telegramId}" class="refresh-btn">
                🔄 Обновить
              </a>
            </div>
          </body>
          </html>
        `);
      } else {
        // Discord не привязан
        const state = crypto.randomBytes(32).toString('hex');
        
        db.run('INSERT INTO states VALUES (?, ?, ?)', 
          [state, telegramId, new Date().toISOString()],
          (err) => {
            if (err) {
              console.error('State insert error:', err);
              return res.send('<h1>Ошибка сохранения состояния</h1>');
            }
            
            const oauthUrl = `https://discord.com/oauth2/authorize?` +
              `client_id=${DISCORD_CLIENT_ID}&` +
              `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
              `response_type=code&` +
              `scope=identify&` +
              `state=${state}`;
            
            res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Личный кабинет</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                  }
                  .container {
                    max-width: 500px;
                    margin: 50px auto;
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    animation: slideIn 0.5s ease-out;
                  }
                  @keyframes slideIn {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                  }
                  h1 {
                    color: #333;
                    margin-bottom: 30px;
                    text-align: center;
                  }
                  .info-block {
                    background: #fff3cd;
                    padding: 25px;
                    border-radius: 15px;
                    margin: 20px 0;
                    border-left: 4px solid #ffc107;
                  }
                  .label {
                    color: #856404;
                    font-size: 14px;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                  }
                  .value {
                    color: #333;
                    font-size: 20px;
                    font-weight: bold;
                  }
                  .btn {
                    display: block;
                    width: 100%;
                    padding: 18px;
                    background: #5865F2;
                    color: white;
                    text-align: center;
                    text-decoration: none;
                    border-radius: 10px;
                    font-size: 18px;
                    font-weight: bold;
                    margin-top: 25px;
                    transition: all 0.3s;
                    box-shadow: 0 4px 15px rgba(88,101,242,0.3);
                  }
                  .btn:hover {
                    background: #4752C4;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(88,101,242,0.4);
                  }
                  .info {
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                    margin-top: 20px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>👤 Личный кабинет</h1>
                  
                  <div class="info-block">
                    <div class="label">🎮 Discord аккаунт</div>
                    <div class="value">Не привязан</div>
                  </div>
                  
                  <a href="${oauthUrl}" class="btn">
                    🔗 Привязать Discord
                  </a>
                  
                  <div class="info">
                    После привязки вернитесь на эту страницу
                  </div>
                </div>
              </body>
              </html>
            `);
          }
        );
      }
    }
  );
});

// ===== ГЕНЕРАЦИЯ OAUTH ССЫЛКИ =====
app.get('/start-oauth', (req, res) => {
  const telegramId = req.query.telegram_id;
  
  if (!telegramId) {
    return res.status(400).json({ 
      error: 'telegram_id required',
      example: '/start-oauth?telegram_id=123456789'
    });
  }
  
  const state = crypto.randomBytes(32).toString('hex');
  
  db.run('INSERT INTO states VALUES (?, ?, ?)', 
    [state, telegramId, new Date().toISOString()],
    (err) => {
      if (err) {
        console.error('State error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      const oauthUrl = `https://discord.com/oauth2/authorize?` +
        `client_id=${DISCORD_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=identify&` +
        `state=${state}`;
      
      res.json({ 
        success: true,
        oauth_url: oauthUrl 
      });
    }
  );
});

// ===== DISCORD CALLBACK =====
app.get('/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  
  console.log('📥 Callback received:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing' });
  
  if (!code || !state) {
    return res.status(400).send(errorPage('Отсутствует код или state токен'));
  }
  
  db.get('SELECT telegram_id FROM states WHERE state = ?', [state], async (err, row) => {
    if (err || !row) {
      console.error('State lookup error:', err);
      return res.status(400).send(errorPage('Неверный state токен. Попробуйте начать заново.'));
    }
    
    const telegramId = row.telegram_id;
    console.log('✅ State valid for telegram_id:', telegramId);
    
    // Удаляем использованный state
    db.run('DELETE FROM states WHERE state = ?', [state]);
    
    try {
      // Обмен code на token
      console.log('🔄 Exchanging code for token...');
      const tokenResponse = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      const accessToken = tokenResponse.data.access_token;
      console.log('✅ Token received');
      
      // Получение данных пользователя
      console.log('🔄 Fetching user data...');
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const discordUsername = userResponse.data.username;
      const discordId = userResponse.data.id;
      console.log('✅ User data received:', discordUsername);
      
      // Сохранение в БД
      db.run(
        'INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?)',
        [telegramId, discordUsername, discordId, new Date().toISOString()],
        (err) => {
          if (err) {
            console.error('Database save error:', err);
          } else {
            console.log('✅ Data saved to database');
          }
        }
      );
      
      // Страница успеха
      res.send(successPage(discordUsername, telegramId));
      
    } catch (error) {
      console.error('❌ OAuth error:', error.response?.data || error.message);
      res.status(500).send(errorPage(`Ошибка OAuth: ${error.message}`));
    }
  });
});

// ===== ПРОВЕРКА ПРИВЯЗКИ =====
app.get('/check-discord', (req, res) => {
  const telegramId = req.query.telegram_id;
  
  if (!telegramId) {
    return res.status(400).json({ 
      error: 'telegram_id required',
      example: '/check-discord?telegram_id=123456789'
    });
  }
  
  db.get('SELECT discord_username FROM users WHERE telegram_id = ?', 
    [telegramId], 
    (err, row) => {
      if (err) {
        console.error('Check error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        res.json({ 
          linked: true, 
          discord_username: row.discord_username 
        });
      } else {
        res.json({ 
          linked: false 
        });
      }
    }
  );
});

// Вспомогательные функции для HTML страниц
function errorPage(message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Ошибка</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f44336;
          color: white;
          padding: 20px;
        }
        .container {
          text-align: center;
          background: rgba(0,0,0,0.2);
          padding: 40px;
          border-radius: 15px;
          max-width: 500px;
        }
        h1 { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>❌ Ошибка</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}

function successPage(username, telegramId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Успешно!</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
        }
        .container {
          text-align: center;
          background: rgba(255,255,255,0.1);
          padding: 50px 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          max-width: 500px;
          width: 100%;
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .check {
          font-size: 80px;
          margin-bottom: 20px;
          animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        h1 { 
          font-size: 32px;
          margin-bottom: 20px;
        }
        .username {
          font-size: 28px;
          font-weight: bold;
          margin: 30px 0;
          color: #5865F2;
          background: white;
          padding: 20px;
          border-radius: 15px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        p {
          font-size: 18px;
          margin-top: 20px;
          opacity: 0.9;
        }
        .back-btn {
          display: inline-block;
          margin-top: 30px;
          padding: 15px 30px;
          background: white;
          color: #667eea;
          text-decoration: none;
          border-radius: 10px;
          font-weight: bold;
          transition: transform 0.3s;
        }
        .back-btn:hover {
          transform: scale(1.05);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="check">✅</div>
        <h1>Discord успешно привязан!</h1>
        <div class="username">${username}</div>
        <p>Теперь вернитесь в Telegram 🚀</p>
        <a href="/cabinet?telegram_id=${telegramId}" class="back-btn">
          ← Вернуться в кабинет
        </a>
      </div>
    </body>
    </html>
  `;
}

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server started on port', PORT);
  console.log('🌐 Base URL:', BASE_URL);
  console.log('🔗 Redirect URI:', REDIRECT_URI);
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.warn('⚠️  WARNING: Discord credentials not set!');
  }
});
