import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Очистка старых state токенов (старше 30 минут)
export async function cleanupOldStates() {
  try {
    const stateKeys = await redis.keys('state:*');
    const now = Date.now();
    
    for (const key of stateKeys) {
      const data = await redis.get(key);
      if (data && data.created_at) {
        const createdAt = new Date(data.created_at).getTime();
        if (now - createdAt > 30 * 60 * 1000) { // 30 минут вместо 10
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
    console.log('✅ Saved to Redis:', { telegramId, discordUsername });
  } catch (error) {
    console.error('Save data error:', error);
  }
}

// Создать state токен (увеличено время жизни до 30 минут)
export async function createState(telegramId, state) {
  try {
    await redis.set(`state:${state}`, {
      telegram_id: telegramId,
      created_at: new Date().toISOString()
    }, { ex: 1800 }); // 1800 секунд = 30 минут
    console.log('✅ State created:', { state, telegramId });
  } catch (error) {
    console.error('Create state error:', error);
  }
}

// Получить telegram_id по state и удалить state
export async function getTelegramIdByState(state) {
  try {
    console.log('🔍 Looking up state:', state);
    const data = await redis.get(`state:${state}`);
    console.log('📦 Found data:', data);
    
    if (data) {
      await redis.del(`state:${state}`);
      console.log('✅ State deleted after use');
      return data.telegram_id;
    }
    
    console.log('❌ State not found in Redis');
    return null;
  } catch (error) {
    console.error('Get by state error:', error);
    return null;
  }
}
