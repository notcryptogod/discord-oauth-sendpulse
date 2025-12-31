import { randomBytes } from 'crypto';
import { createState, cleanupOldStates } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';

export default function handler(req, res) {
  const telegramId = req.query.telegram_id;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  if (!telegramId) {
    return res.status(400).json({ 
      error: 'telegram_id required',
      example: '/start-oauth?telegram_id=123456789'
    });
  }
  
  cleanupOldStates();
  
  const state = randomBytes(32).toString('hex');
  createState(telegramId, state);
  
  const oauthUrl = `https://discord.com/oauth2/authorize?` +
    `client_id=${DISCORD_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=identify&` +
    `state=${state}`;
  
  res.status(200).json({ 
    success: true,
    oauth_url: oauthUrl 
  });
}
