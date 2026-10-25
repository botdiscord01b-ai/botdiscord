module.exports = (req, res) => {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const REDIRECT_URI = encodeURIComponent(process.env.REDIRECT_URI);

  // ส่งผู้ใช้ไปหน้า Discord Login (ขอสิทธิ์ identify และ email)
  const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=identify%20email`;

  res.redirect(discordUrl);
};
