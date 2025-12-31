import { randomBytes } from 'crypto';
import { createState, cleanupOldStates } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';

export default async function handler(req, res) {
  const contactId = req.query.contact_id || req.query.telegram_id;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  if (!contactId) {
    return res.status(400).send('contact_id required');
  }
  
  console.log('📥 OAuth request for contact_id:', contactId);
  
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
