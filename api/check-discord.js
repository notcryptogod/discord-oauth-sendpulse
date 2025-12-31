import { getDiscordUsername } from './db.js';

export default function handler(req, res) {
  const telegramId = req.query.telegram_id;
  
  if (!telegramId) {
    return res.status(400).json({ 
      error: 'telegram_id required',
      example: '/check-discord?telegram_id=123456789'
    });
  }
  
  const discordUsername = getDiscordUsername(telegramId);
  
  if (discordUsername) {
    res.status(200).json({ 
      linked: true, 
      discord_username: discordUsername 
    });
  } else {
    res.status(200).json({ 
      linked: false 
    });
  }
}
