import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function cleanupOldStates() {
  try {
    const stateKeys = await redis.keys('state:*');
    const now = Date.now();
    
    for (const key of stateKeys) {
      const data = await redis.get(key);
      if (data && data.created_at) {
        const createdAt = new Date(data.created_at).getTime();
        if (now - createdAt > 30 * 60 * 1000) {
          await redis.del(key);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export async function getDiscordUsername(contactId) {
  try {
    const user = await redis.get(`user:${contactId}`);
    return user ? user.discord_username : null;
  } catch (error) {
    console.error('Get username error:', error);
    return null;
  }
}

export async function saveDiscordData(contactId, discordUsername, discordId) {
  try {
    await redis.set(`user:${contactId}`, {
      contact_id: contactId,
      discord_username: discordUsername,
      discord_id: discordId,
      created_at: new Date().toISOString()
    });
    console.log('✅ Saved to Redis:', { contactId, discordUsername });
  } catch (error) {
    console.error('Save data error:', error);
  }
}

export async function createState(contactId, state) {
  try {
    await redis.set(`state:${state}`, {
      contact_id: contactId,
      created_at: new Date().toISOString()
    }, { ex: 1800 });
    console.log('✅ State created:', { state, contactId });
  } catch (error) {
    console.error('Create state error:', error);
  }
}

export async function getContactIdByState(state) {
  try {
    console.log('🔍 Looking up state:', state);
    const data = await redis.get(`state:${state}`);
    console.log('📦 Found data:', data);
    
    if (data) {
      await redis.del(`state:${state}`);
      console.log('✅ State deleted after use');
      return data.contact_id;
    }
    
    console.log('❌ State not found in Redis');
    return null;
  } catch (error) {
    console.error('Get by state error:', error);
    return null;
  }
}
