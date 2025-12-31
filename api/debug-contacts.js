import axios from 'axios';

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

export default async function handler(req, res) {
  try {
    const token = await getSendPulseToken();
    if (!token) {
      return res.status(500).json({ error: 'Failed to get token' });
    }

    const response = await axios.get(
      `https://api.sendpulse.com/telegram/contacts`,
      {
        params: {
          bot_id: SENDPULSE_BOT_ID,
          limit: 10
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    res.status(200).json({
      success: true,
      contacts: response.data
    });

  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
}
