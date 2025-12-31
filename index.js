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

// ===== ДАННЫЕ ИЗ DISCORD =====
const DISCORD_CLIENT_ID = '1455322635859791892';
const DISCORD_CLIENT_SECRET = 'mTnsjqlCHggqNe6Z3ovr7aDnX3KHZqjn';

// ===== RAILWAY DOMAIN (будет добавлен позже) =====
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

// Автоочистка старых state токенов (старше 10 минут)
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
          box-shadow: 0 10px 30px rgba(0,0,0,0
