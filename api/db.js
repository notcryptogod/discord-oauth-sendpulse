import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Очистка старых state токенов (старше 10 минут)
export async function cleanupOldStates() {
  try {
    const stateKeys = await redis.keys('state:*');
    const now = Date.now();
    
    for (const key of stateKeys) {
      const data = await redis.get(key);
      if (data && data.created_at) {
        const createdAt = new Date(data.created_at).getTime();
        if (now - createdAt > 10 * 60 * 1000) {
          await redis.del(key);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Получить Discord username по telegram_id
export async function getDiscordUsername(telegramId) {
  try {
    const user = await redis.get(`user:${telegramId}`);
    return user ? user.discord_username : null;
  } catch (error) {
    console.error('Get username error:', error);
    return null;
  }
}

// Сохранить Discord данные
export async function saveDiscordData(telegramId, discordUsername, discordId) {
  try {
    await redis.set(`user:${telegramId}`, {
      telegram_id: telegramId,
      discord_username: discordUsername,
      discord_id: discordId,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Save data error:', error);
  }
}

// Создать state токен
export async function createState(telegramId, state) {
  try {
    await redis.set(`state:${state}`, {
      telegram_id: telegramId,
      created_at: new Date().toISOString()
    }, { ex: 600 }); // автоматически удалится через 10 минут
  } catch (error) {
    console.error('Create state error:', error);
  }
}

// Получить telegram_id по state и удалить state
export async function getTelegramIdByState(state) {
  try {
    const data = await redis.get(`state:${state}`);
    if (data) {
      await redis.del(`state:${state}`);
      return data.telegram_id;
    }
    return null;
  } catch (error) {
    console.error('Get by state error:', error);
    return null;
  }
}
