import { randomBytes } from 'crypto';
import { createState, cleanupOldStates } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';

export default async function handler(req, res) {
  const telegramId = req.query.telegram_id;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  if (!telegramId) {
    return res.status(400).send('telegram_id required');
  }
  
  await cleanupOldStates();
  
  const state = randomBytes(32).toString('hex');
  await createState(telegramId, state);
  
  const oauthUrl = `https://discord.com/oauth2/authorize?` +
    `client_id=${DISCORD_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=identify&` +
    `state=${state}`;
  
  // Прямой редирект на Discord OAuth
  res.redirect(302, oauthUrl);
}
