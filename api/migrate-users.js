import axios from 'axios';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const SENDPULSE_API_ID = '9b986040f37e4debcf0158442c479099';
const SENDPULSE_API_SECRET = '341b6af94133dc65e68fd762a74e5985';
const SENDPULSE_BOT_ID = '68f0ea664be776c8aa0197e9';

async function getSendPulseToken() {
  try {
    const response = await axios.post('https://api.sendpulse.com/oauth/access_token', {
      grant_type: 'client_credentials',
      client_id: SENDPULSE_API_ID,
      client_secret: SENDPULSE_API_SECRET
    });
    return response.data.access_token;
  } catch (error) {
    console.error('SendPulse token error:', error.message);
    return null;
  }
}

async function getAllContacts() {
  try {
    const token = await getSendPulseToken();
    if (!token) return [];

    const response = await axios.get(
      `https://api.sendpulse.com/telegram/contacts`,
      {
        params: {
          bot_id: SENDPULSE_BOT_ID,
          limit: 100
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data?.data || [];
  } catch (error) {
    console.error('Error getting contacts:', error.message);
    return [];
  }
}

async function migrateUsers() {
  console.log('🔄 Starting migration...');
  
  const contacts = await getAllContacts();
  console.log(`📊 Found ${contacts.length} contacts`);
  
  let migrated = 0;
  let skipped = 0;
  
  for (const contact of contacts) {
    // Проверяем, есть ли discord_id в переменных
    const discordId = contact.variables?.discord_id;
    const telegramId = contact.telegram_id;
    const contactId = contact.id;
    
    if (!discordId || !telegramId) {
      skipped++;
      continue;
    }
    
    // Проверяем, есть ли уже маппинг
    const existing = await redis.get(`telegram:${telegramId}`);
    
    if (existing) {
      console.log(`⏭️  Skipping telegram:${telegramId} - already exists`);
      skipped++;
      continue;
    }
    
    // Создаём маппинг telegram_id → contact_id
    await redis.set(`telegram:${telegramId}`, contactId);
    console.log(`✅ Created mapping telegram:${telegramId} → ${contactId}`);
    migrated++;
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  
  return { migrated, skipped };
}

export default async function handler(req, res) {
  // Простая защита - требуем secret ключ
  const secret = req.query.secret;
  
  if (secret !== 'your-secret-key-here') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    const result = await migrateUsers();
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
