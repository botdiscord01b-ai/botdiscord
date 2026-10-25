const axios = require('axios');

module.exports = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // 1. นำ Code ไปแลก Access Token จาก Discord
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 2. ใช้ Access Token ดึงข้อมูลโปรไฟล์ผู้ใช้
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userResponse.data;

    // 3. ส่งข้อมูลผู้ใช้กลับไปที่หน้า index.html
    const userJson = encodeURIComponent(JSON.stringify(userData));
    res.redirect(`/?user=${userJson}`);

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
};
