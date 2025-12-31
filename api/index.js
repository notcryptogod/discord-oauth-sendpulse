export default function handler(req, res) {
  const baseUrl = `https://${req.headers.host}`;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
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
          word-break: break-all;
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
        .important {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ Discord OAuth Server работает!</h1>
        
        <div class="status">
          <strong>🟢 Статус:</strong> Сервер активен и готов к работе (Vercel)
        </div>
        
        <div class="important">
          <strong>📌 Для SendPulse используйте:</strong><br>
          <code>${baseUrl}/cabinet?telegram_id={{user_id}}</code>
        </div>
        
        <h2>📡 Доступные endpoints:</h2>
        
        <div class="endpoint">
          <strong>1. Веб-кабинет (главный endpoint для SendPulse)</strong><br>
          <code>GET /cabinet?telegram_id=ВАША_АЙДИ</code><br>
          <a href="/cabinet?telegram_id=123456789" class="test-link">🧪 Тест</a>
        </div>
        
        <div class="endpoint">
          <strong>2. Генерация OAuth ссылки (JSON API)</strong><br>
          <code>GET /start-oauth?telegram_id=ВАША_АЙДИ</code><br>
          <a href="/start-oauth?telegram_id=123456789" class="test-link">🧪 Тест</a>
        </div>
        
        <div class="endpoint">
          <strong>3. Проверка привязки (JSON API)</strong><br>
          <code>GET /check-discord?telegram_id=ВАША_АЙДИ</code><br>
          <a href="/check-discord?telegram_id=123456789" class="test-link">🧪 Тест</a>
        </div>
        
        <div class="endpoint">
          <strong>4. Discord callback (автоматический)</strong><br>
          <code>GET /discord/callback</code>
        </div>
        
        <h2>ℹ️ Информация:</h2>
        <p><strong>Base URL:</strong> <code>${baseUrl}</code></p>
        <p><strong>Redirect URI:</strong> <code>${baseUrl}/discord/callback</code></p>
      </div>
    </body>
    </html>
  `);
}
