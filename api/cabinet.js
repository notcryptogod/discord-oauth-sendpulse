import { randomBytes } from 'crypto';
import { getDiscordUsername, createState } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';

export default function handler(req, res) {
  const telegramId = req.query.telegram_id;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  if (!telegramId) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(`
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
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Ошибка</h1>
          <p>Telegram ID не указан</p>
          <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
            URL должен содержать: ?telegram_id=ВАШ_ID
          </p>
        </div>
      </body>
      </html>
    `);
  }
  
  const discordUsername = getDiscordUsername(telegramId);
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
  if (discordUsername) {
    // Discord привязан
    return res.status(200).send(`
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
            word-break: break-word;
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
            <div class="value">${discordUsername}</div>
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
    const state = randomBytes(32).toString('hex');
    createState(telegramId, state);
    
    const oauthUrl = `https://discord.com/oauth2/authorize?` +
      `client_id=${DISCORD_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=identify&` +
      `state=${state}`;
    
    return res.status(200).send(`
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
}
