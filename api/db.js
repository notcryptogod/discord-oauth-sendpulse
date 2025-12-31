import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Создаём папку для БД в /tmp (Vercel требует это)
const dbDir = '/tmp/data';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = join(dbDir, 'users.db');
const db = new Database(dbPath);

// Инициализация таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id TEXT PRIMARY KEY,
    discord_username TEXT,
    discord_id TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS states (
    state TEXT PRIMARY KEY,
    telegram_id TEXT,
    created_at TEXT
  );
`);

// Очистка старых state токенов (старше 10 минут)
export function cleanupOldStates() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM states WHERE created_at < ?').run(tenMinutesAgo);
}

// Получить Discord username по telegram_id
export function getDiscordUsername(telegramId) {
  const row = db.prepare('SELECT discord_username FROM users WHERE telegram_id = ?').get(telegramId);
  return row ? row.discord_username : null;
}

// Сохранить Discord данные
export function saveDiscordData(telegramId, discordUsername, discordId) {
  db.prepare('INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?)').run(
    telegramId,
    discordUsername,
    discordId,
    new Date().toISOString()
  );
}

// Создать state токен
export function createState(telegramId, state) {
  db.prepare('INSERT INTO states VALUES (?, ?, ?)').run(
    state,
    telegramId,
    new Date().toISOString()
  );
}

// Получить telegram_id по state и удалить state
export function getTelegramIdByState(state) {
  const row = db.prepare('SELECT telegram_id FROM states WHERE state = ?').get(state);
  if (row) {
    db.prepare('DELETE FROM states WHERE state = ?').run(state);
    return row.telegram_id;
  }
  return null;
}

export default db;
