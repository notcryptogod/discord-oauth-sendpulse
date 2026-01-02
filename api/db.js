import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const STATE_TTL = 1800; // 30 минут

export async function createState(contactId, state) {
  const key = `state:${state}`;
  const data = {
    contact_id: contactId,
    created_at: new Date().toISOString()
  };
  
  await redis.set(key, JSON.stringify(data), { ex: STATE_TTL });
  return state;
}

export async function getContactIdByState(state) {
  const key = `state:${state}`;
  const data = await redis.get(key);
  
  if (!data) return null;
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  return parsed.contact_id;
}

export async function saveDiscordData(contactId, discordUsername, discordId, telegramId = null) {
  const userKey = `user:${contactId}`;
  const userData = {
    contact_id: contactId,
    discord_username: discordUsername,
    discord_id: discordId,
    created_at: new Date().toISOString()
  };
  
  // Сохраняем основные данные
  await redis.set(userKey, JSON.stringify(userData));
  
  // НОВОЕ: Сохраняем маппинг telegram_id → contact_id
  if (telegramId) {
    const telegramKey = `telegram:${telegramId}`;
    await redis.set(telegramKey, contactId);
  }
  
  return true;
}

export async function getDiscordDataByContactId(contactId) {
  const key = `user:${contactId}`;
  const data = await redis.get(key);
  
  if (!data) return null;
  
  return typeof data === 'string' ? JSON.parse(data) : data;
}

// НОВАЯ ФУНКЦИЯ: Получить по telegram_id
export async function getDiscordDataByTelegramId(telegramId) {
  const telegramKey = `telegram:${telegramId}`;
  const contactId = await redis.get(telegramKey);
  
  if (!contactId) return null;
  
  return await getDiscordDataByContactId(contactId);
}

export async function cleanupOldStates() {
  // Redis автоматически удаляет по TTL
  return true;
}
