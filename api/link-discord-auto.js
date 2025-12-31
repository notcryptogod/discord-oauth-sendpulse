import axios from 'axios';
import { randomBytes } from 'crypto';
import { createState, cleanupOldStates } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';
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
    console.error('SendPulse token error:', error.response?.data || error.message);
    return null;
  }
}

async function findContactIdByTelegramId(telegramId) {
  try {
    const token = await getSendPulseToken();
    if (!token) return null;

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

    const contacts = response.data?.data || [];
    const contact = contacts.find(c => c.telegram_id === parseInt(telegramId));
    
    if (contact) {
      console.log('✅ Found contact_id:', contact.id, 'for telegram_id:', telegramId);
      return contact.id;
    }

    console.log('❌ Contact not found for telegram_id:', telegramId);
    return null;
  } catch (error) {
    console.error('Error finding contact:', error.response?.data || error.message);
    return null;
  }
}

export default async function handler(req, res) {
  const telegramId = req.query.telegram_id;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  if (!telegramId) {
    return res.status(400).send('telegram_id required');
  }
  
  console.log('📥 Auto-linking request for telegram_id:', telegramId);
  
  const contactId = await findContactIdByTelegramId(telegramId);
  
  if (!contactId) {
    return res.status(404).send('User not found in SendPulse. Please start the bot first.');
  }
  
  await cleanupOldStates();
  
  const state = randomBytes(32).toString('hex');
  await createState(contactId, state);
  
  const oauthUrl = `https://discord.com/oauth2/authorize?` +
    `client_id=${DISCORD_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=identify&` +
    `state=${state}`;
  
  res.redirect(302, oauthUrl);
}
