import axios from 'axios';
import { getTelegramIdByState, saveDiscordData } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';
const DISCORD_CLIENT_SECRET = 'mTnsjqlCHggqNe6Z3ovr7aDnX3KHZqjn';

// SendPulse API credentials
const SENDPULSE_API_ID = '9b986040f37e4debcf0158442c479099';
const SENDPULSE_API_SECRET = '341b6af94133dc65e68fd762a74e5985';
const SENDPULSE_BOT_ID = '68f0ea664be776c8aa0197e9';

// Получить SendPulse access token
async function getSendPulseToken() {
  try {
    const response = await axios.post('https://api.sendpulse.com/oauth/access_token', {
      grant_type: 'client_credentials',
      client_id: SENDPULSE_API_ID,
      client_secret: SENDPULSE_API_SECRET
    });
    return response.data.access_token;
  } catch (error) {
    console.error('SendPulse token error:', error.response?.data || error.message);
    return null;
  }
}

// Обновить переменные пользователя в SendPulse
async function updateSendPulseVariables(telegramId, discordUsername, discordId) {
  try {
    const token = await getSendPulseToken();
    if (!token) {
      console.error('Failed to get SendPulse token');
      return false;
    }

    const response = await axios.post(
      `https://api.sendpulse.com/telegram/contacts/setVariables`,
      {
        contact_id: parseInt(telegramId),
        bot_id: SENDPULSE_BOT_ID,
        variables: {
          discord_username: discordUsername,
          discord_id: discordId,
          discord_linked: 'true'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SendPulse variables updated:', response.data);
    return true;
  } catch (error) {
    console.error('❌ SendPulse update error:', error.response?.data || error.message);
    return false;
  }
}

export default async function handler(req, res) {
  const { code, state } = req.query;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  console.log('📥 Callback received:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing' });
  
  if (!code || !state) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Отсутствует код или state токен'));
  }
  
  const telegramId = await getTelegramIdByState(state);
  
  if (!telegramId) {
    console.error('State lookup failed');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Неверный state токен. Попробуйте начать заново.'));
  }
  
  console.log('✅ State valid for telegram_id:', telegramId);
  
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
        redirect_uri: redirectUri
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
    await saveDiscordData(telegramId, discordUsername, discordId);
    console.log('✅ Data saved to database');
    
    // Отправка данных в SendPulse
    console.log('🔄 Updating SendPulse variables...');
    const sendpulseSuccess = await updateSendPulseVariables(telegramId, discordUsername, discordId);
    
    if (sendpulseSuccess) {
      console.log('✅ SendPulse updated successfully');
    } else {
      console.log('⚠️ SendPulse update failed (but Discord data saved)');
    }
    
    // Страница успеха
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(successPage(discordUsername, telegramId));
    
  } catch (error) {
    console.error('❌ OAuth error:', error.response?.data || error.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(errorPage(`Ошибка OAuth: ${error.message}`));
  }
}

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
        p { line-height: 1.6; }
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
          word-break: break-word;
        }
        p {
          font-size: 18px;
          margin-top: 20px;
          opacity: 0.9;
        }
        .info {
          font-size: 14px;
          margin-top: 30px;
          padding: 15px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="check">✅</div>
        <h1>Discord успешно привязан!</h1>
        <div class="username">${username}</div>
        <p>Данные автоматически сохранены в SendPulse!</p>
        <div class="info">
          Вернитесь в Telegram и откройте личный кабинет снова 🚀
        </div>
      </div>
    </body>
    </html>
  `;
}
