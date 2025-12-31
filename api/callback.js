import axios from 'axios';
import { getContactIdByState, saveDiscordData } from './db.js';

const DISCORD_CLIENT_ID = '1455322635859791892';
const DISCORD_CLIENT_SECRET = 'mTnsjqlCHggqNe6Z3ovr7aDnX3KHZqjn';

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

async function updateSendPulseVariables(contactId, discordUsername, discordId) {
  try {
    const token = await getSendPulseToken();
    if (!token) {
      console.error('Failed to get SendPulse token');
      return false;
    }

    console.log('🔄 Updating SendPulse for contact_id:', contactId);

    await axios.post(
      `https://api.sendpulse.com/telegram/contacts/setVariable`,
      {
        contact_id: contactId,
        bot_id: SENDPULSE_BOT_ID,
        variable_name: 'discord_username',
        variable_value: discordUsername
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await axios.post(
      `https://api.sendpulse.com/telegram/contacts/setVariable`,
      {
        contact_id: contactId,
        bot_id: SENDPULSE_BOT_ID,
        variable_name: 'discord_id',
        variable_value: discordId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SendPulse variables updated successfully');
    return true;

  } catch (error) {
    console.error('❌ SendPulse update error:', error.response?.data || error.message);
    return false;
  }
}

async function triggerA360Event(contactId) {
  try {
    const token = await getSendPulseToken();
    if (!token) {
      console.error('Failed to get SendPulse token');
      return false;
    }

    console.log('🔄 Triggering A360 event for contact_id:', contactId);

    const response = await axios.post(
      `https://events.sendpulse.com/events/name/discord_linked`,
      {
        contact_id: contactId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ A360 event triggered:', response.data);
    return true;

  } catch (error) {
    console.error('❌ A360 event error:', error.response?.data || error.message);
    return false;
  }
}

export default async function handler(req, res) {
  const { code, state } = req.query;
  const baseUrl = `https://${req.headers.host}`;
  const redirectUri = `${baseUrl}/discord/callback`;
  
  console.log('📥 Callback received');
  
  if (!code || !state) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Отсутствует код или state токен'));
  }
  
  const contactId = await getContactIdByState(state);
  
  if (!contactId) {
    console.error('State lookup failed');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(errorPage('Неверный state токен. Попробуйте начать заново.'));
  }
  
  console.log('✅ State valid for contact_id:', contactId);
  
  try {
    console.log('🔄 Exchanging code for token...');
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    console.log('✅ Token received');
    
    console.log('🔄 Fetching user data...');
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const discordUsername = userResponse.data.username;
    const discordId = userResponse.data.id;
    console.log('✅ User data received:', discordUsername);
    
    await saveDiscordData(contactId, discordUsername, discordId);
    console.log('✅ Data saved to database');
    
    console.log('🔄 Updating SendPulse variables...');
    await updateSendPulseVariables(contactId, discordUsername, discordId);
    
    console.log('🔄 Triggering A360 event...');
    await triggerA360Event(contactId);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(successLandingPage(discordUsername));
    
  } catch (error) {
    console.error('❌ OAuth error:', error.response?.data || error.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(errorPage(`Ошибка OAuth: ${error.message}`));
  }
}

function successLandingPage(discordUsername) {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Discord успешно привязан</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#000;color:#fff;width:100%;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;padding:0 20px;max-width:520px;transform:translateY(-20px);">
    <svg width="70" height="55" viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:18px;" class="checkmark">
      <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="M20 75 L70 120 L160 20" stroke="#CCFB55" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#glow)" class="check-path"/>
    </svg>
    <div style="font-size:20px;font-weight:700;margin-bottom:10px;">Discord успешно привязан</div>
    <div style="font-size:15px;opacity:0.9;margin-bottom:22px;">Сейчас вы будете автоматически<br>перенаправлены в Telegram</div>
    <a href="https://t.me/notcryptogodxbot" style="display:inline-block;background:#CCFB55;color:#000;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:14px;">Открыть Telegram</a>
  </div>
  <style>.check-path{stroke-dasharray:260;stroke-dashoffset:260;animation:drawCheck .9s ease-out forwards,bounceCheck .4s ease-out .9s forwards}@keyframes drawCheck{to{stroke-dashoffset:0}}@keyframes bounceCheck{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}</style>
  <script>setTimeout(()=>{window.location.replace('https://t.me/notcryptogodxbot')},2500);</script>
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ошибка</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f44336;color:white;padding:20px}.container{text-align:center;background:rgba(0,0,0,0.2);padding:40px;border-radius:15px;max-width:500px}h1{margin-bottom:20px}p{line-height:1.6}</style></head><body><div class="container"><h1>❌ Ошибка</h1><p>${message}</p></div></body></html>`;
}
